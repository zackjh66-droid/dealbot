import { db } from '@/lib/db';
import { hashToken, newToken, json, readJson } from '@/lib/security';
import { audit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await readJson(req);
  const rawCode = String(body.code || '').trim().toUpperCase();
  const pollToken = String(body.pollToken || '');
  if (!/^[A-Z0-9]{6}$/.test(rawCode) || pollToken.length < 16) {
    return json({ error: 'Invalid code or poll token' }, 400);
  }

  const { data: link, error } = await db()
    .from('link_codes')
    .select('id, code, status, expires_at, poll_token_hash, device_id, claimed_account_id')
    .eq('code', rawCode)
    .maybeSingle();

  if (error || !link) return json({ status: 'invalid' }, 200);
  if (link.poll_token_hash !== hashToken(pollToken)) return json({ status: 'invalid' }, 200);

  if (link.status === 'pending' && new Date(link.expires_at).getTime() < Date.now()) {
    await db().from('link_codes').update({ status: 'expired' }).eq('id', link.id);
    return json({ status: 'expired' }, 200);
  }

  if (link.status === 'claimed' && link.claimed_account_id) {
    const { data: account } = await db()
      .from('accounts')
      .select('*')
      .eq('id', link.claimed_account_id)
      .maybeSingle();
    if (!account) return json({ status: 'invalid' }, 200);

    const consoleToken = newToken(32);
    await db().from('sessions').insert({
      account_id: account.id,
      device_id: link.device_id,
      token_hash: hashToken(consoleToken),
      kind: 'console'
    });
    await db()
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', link.device_id);
    await db().from('accounts').update({ last_seen_at: new Date().toISOString() }).eq('id', account.id);

    const { data: buildRows } = await db()
      .from('builds')
      .select('season, channel, version, cl, build_label, launch_uri, package_family_name')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(12);

    const builds = (buildRows || []).map((row) => ({
      season: row.season,
      channel: row.channel,
      version: row.version,
      cl: row.cl,
      buildLabel: row.build_label,
      launchUri: row.launch_uri,
      packageFamilyName: row.package_family_name
    }));

    await audit('link.claimed', {
      accountId: account.id,
      deviceId: link.device_id,
      meta: { code: rawCode }
    });

    return json({
      status: 'linked',
      account: {
        id: account.id,
        accountNo: account.account_no,
        username: account.username,
        createdAt: account.created_at
      },
      sessionToken: consoleToken,
      sessionKind: 'console',
      builds
    });
  }

  if (link.status === 'expired') return json({ status: 'expired' }, 200);
  return json({ status: 'pending' }, 200);
}

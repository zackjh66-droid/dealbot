import { db } from '@/lib/db';
import { hashToken, newToken, json, readJson, clientIp } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await readJson(req);
  const ticket = String(body.ticket || '').trim();
  if (ticket.length < 20) return json({ error: 'Invalid game ticket' }, 400);

  const now = new Date();
  const nowIso = now.toISOString();
  const { data: row, error } = await db()
    .from('game_tickets')
    .select('id, account_id, device_id, expires_at, consumed_at, accounts(id, account_no, username, status), devices(id, name, platform)')
    .eq('ticket_hash', hashToken(ticket))
    .maybeSingle();

  if (error || !row) return json({ error: 'Game ticket not found' }, 401);
  if (row.consumed_at) return json({ error: 'Game ticket already used' }, 409);
  if (!row.expires_at || new Date(row.expires_at) <= now) return json({ error: 'Game ticket expired' }, 401);
  if (!row.accounts || row.accounts.status !== 'active') return json({ error: 'Account unavailable' }, 403);

  const { data: consumed, error: consumeError } = await db()
    .from('game_tickets')
    .update({ consumed_at: nowIso })
    .eq('id', row.id)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .select('id')
    .maybeSingle();

  if (consumeError || !consumed) return json({ error: 'Game ticket could not be redeemed' }, 409);

  const sessionToken = newToken(32);
  const { error: sessionError } = await db().from('sessions').insert({
    account_id: row.account_id,
    device_id: row.device_id,
    token_hash: hashToken(sessionToken),
    kind: 'game'
  });

  if (sessionError) {
    await db().from('game_tickets').update({ consumed_at: null }).eq('id', row.id).eq('consumed_at', nowIso);
    return json({ error: 'Could not create game session' }, 500);
  }

  await db().from('audit_events').insert({
    event: 'game_session_started',
    account_id: row.account_id,
    device_id: row.device_id,
    ip: clientIp(req),
    meta: { ticketId: row.id }
  });

  const { data: buildRow } = await db()
    .from('builds')
    .select('season, channel, version, cl, build_label, launch_uri, package_family_name')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  return json({
    sessionToken,
    issuedAt: nowIso,
    account: {
      id: row.accounts.id,
      accountNo: row.accounts.account_no,
      username: row.accounts.username
    },
    build: buildRow
      ? {
          season: buildRow.season,
          channel: buildRow.channel,
          version: buildRow.version,
          cl: buildRow.cl,
          buildLabel: buildRow.build_label,
          launchUri: buildRow.launch_uri,
          packageFamilyName: buildRow.package_family_name
        }
      : null
  });
}

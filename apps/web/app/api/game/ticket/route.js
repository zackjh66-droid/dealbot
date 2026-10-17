import { db } from '@/lib/db';
import { accountFromRequest } from '@/lib/session';
import { hashToken, newToken, json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the launcher after the client handoff is requested. The ticket is a
// short-lived opaque credential the game host redeems against the session broker.
export async function POST(req) {
  const auth = await accountFromRequest(req, ['console']);
  if (!auth) return json({ error: 'Console session required' }, 401);

  const ticket = newToken(32);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await db().from('game_tickets').insert({
    account_id: auth.account.id,
    device_id: auth.device.id,
    ticket_hash: hashToken(ticket),
    expires_at: expiresAt
  });
  if (error) return json({ error: 'Could not issue ticket' }, 500);

  const { data: buildRow } = await db()
    .from('builds')
    .select('season, channel, version, cl, build_label, launch_uri, package_family_name')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  const build = buildRow
    ? {
        season: buildRow.season,
        channel: buildRow.channel,
        version: buildRow.version,
        cl: buildRow.cl,
        buildLabel: buildRow.build_label,
        launchUri: buildRow.launch_uri,
        packageFamilyName: buildRow.package_family_name
      }
    : null;

  return json({
    ticket,
    expiresAt,
    account: {
      id: auth.account.id,
      accountNo: auth.account.account_no,
      username: auth.account.username
    },
    build,
    sessionEndpoint: '/api/game/session'
  });
}

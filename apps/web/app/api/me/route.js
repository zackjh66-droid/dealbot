import { db } from '@/lib/db';
import { accountFromRequest, publicAccount } from '@/lib/session';
import { json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = await accountFromRequest(req, ['web', 'console']);
  if (!auth) return json({ error: 'Not signed in' }, 401);

  const { data: consoleSessions } = await db()
    .from('sessions')
    .select('created_at, last_seen_at, devices(id, name, platform, app_version, last_seen_at)')
    .eq('account_id', auth.account.id)
    .eq('kind', 'console')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  const devices = (consoleSessions || [])
    .map((row) => row.devices)
    .filter(Boolean)
    .filter((device, index, all) => all.findIndex((d) => d.id === device.id) === index);

  return json({ account: publicAccount(auth.account), devices });
}

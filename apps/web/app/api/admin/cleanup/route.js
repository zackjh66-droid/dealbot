import { db } from '@/lib/db';
import { json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Removes smoke-test accounts created by CI. Requires the server secret.
export async function POST(req) {
  const key = req.headers.get('x-pz-admin');
  if (!process.env.PZ_SECRET || key !== process.env.PZ_SECRET) {
    return json({ error: 'Not authorised' }, 401);
  }

  const { data: accounts, error } = await db()
    .from('accounts')
    .select('id')
    .like('email', 'smoke+%');

  if (error) return json({ error: 'Lookup failed' }, 500);
  if (!accounts || accounts.length === 0) return json({ removed: 0 });

  const ids = accounts.map((row) => row.id);
  const { error: deleteError } = await db().from('accounts').delete().in('id', ids);
  if (deleteError) return json({ error: 'Delete failed' }, 500);

  await db().from('link_codes').update({ status: 'expired' }).eq('status', 'pending').lt('expires_at', new Date().toISOString());

  return json({ removed: ids.length });
}

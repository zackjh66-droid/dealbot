import { db } from '@/lib/db';
import { json, readJson } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await readJson(req);
  const code = String(body.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return json({ valid: false, reason: 'format' }, 200);

  const { data: link } = await db()
    .from('link_codes')
    .select('status, expires_at')
    .eq('code', code)
    .maybeSingle();

  if (!link) return json({ valid: false, reason: 'unknown' }, 200);
  if (link.status === 'claimed') return json({ valid: false, reason: 'claimed' }, 200);
  if (link.status !== 'pending' || new Date(link.expires_at).getTime() < Date.now()) {
    return json({ valid: false, reason: 'expired' }, 200);
  }
  return json({ valid: true, expiresAt: link.expires_at }, 200);
}

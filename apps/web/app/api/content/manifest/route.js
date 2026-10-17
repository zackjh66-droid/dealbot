import { accountFromRequest } from '@/lib/session';
import { json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = await accountFromRequest(req, ['console']);
  if (!auth) return json({ error: 'Console session required' }, 401);

  const url = process.env.SEASON7_CONTENT_URL || '';
  const sha256 = (process.env.SEASON7_CONTENT_SHA256 || '').toLowerCase();
  const size = Number(process.env.SEASON7_CONTENT_SIZE || 0);
  const fileName = process.env.SEASON7_CONTENT_FILENAME || 'windows-7.00.rar';

  if (!url) {
    return json({
      available: false,
      build: '7.00',
      cl: '4629139',
      reason: 'Content endpoint is not configured.'
    });
  }

  return json({
    available: true,
    build: '7.00',
    cl: '4629139',
    fileName,
    url,
    sha256,
    size
  });
}

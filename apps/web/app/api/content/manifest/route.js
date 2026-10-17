import { issueSignedToken, list, presignUrl } from '@vercel/blob';
import { accountFromRequest } from '@/lib/session';
import { json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = 'season7/7.00/4629139/';
const SIGNED_URL_LIFETIME_MS = 6 * 60 * 60 * 1000;

async function listSeason7Files() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, limit: 1000, cursor });
    blobs.push(...(page.blobs || []));
    cursor = page.cursor || undefined;
  } while (cursor);
  return blobs.filter((blob) => blob.pathname && blob.pathname.startsWith(PREFIX));
}

async function signedFiles(blobs) {
  if (!blobs.length) return [];

  const validUntil = Date.now() + SIGNED_URL_LIFETIME_MS;
  // One short-lived delegation token is used to sign every GET URL locally. The full Blob
  // read-write token is never sent to the console.
  const signingToken = await issueSignedToken({
    operations: ['get'],
    validUntil
  });

  return Promise.all(
    blobs.map(async (blob) => {
      const { presignedUrl } = await presignUrl(signingToken, {
        operation: 'get',
        pathname: blob.pathname,
        access: 'private',
        validUntil
      });

      return {
        path: blob.pathname.slice(PREFIX.length),
        url: presignedUrl,
        size: Number(blob.size || 0),
        etag: blob.etag || '',
        sha256: ''
      };
    })
  );
}

export async function GET(req) {
  const auth = await accountFromRequest(req, ['console']);
  if (!auth) return json({ error: 'Console session required' }, 401);

  try {
    const blobs = await listSeason7Files();
    if (blobs.length) {
      const files = await signedFiles(blobs);
      const totalSize = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
      return json({
        available: true,
        mode: 'files',
        build: '7.00',
        cl: '4629139',
        fileCount: files.length,
        totalSize,
        files
      });
    }
  } catch (error) {
    console.error('content manifest v2 failed', error);
    // Keep the legacy archive path as a temporary fallback while the private store is being filled.
  }

  const url = process.env.SEASON7_CONTENT_URL || '';
  const sha256 = (process.env.SEASON7_CONTENT_SHA256 || '').toLowerCase();
  const size = Number(process.env.SEASON7_CONTENT_SIZE || 0);
  const fileName = process.env.SEASON7_CONTENT_FILENAME || 'windows-7.00.rar';

  if (!url) {
    return json({
      available: false,
      build: '7.00',
      cl: '4629139',
      reason: 'No Season 7 files have been uploaded yet.'
    });
  }

  return json({
    available: true,
    mode: 'archive',
    build: '7.00',
    cl: '4629139',
    fileName,
    url,
    sha256,
    size
  });
}

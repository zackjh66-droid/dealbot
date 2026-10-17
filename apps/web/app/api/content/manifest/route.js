import { get, issueSignedToken, presignUrl } from '@vercel/blob';
import { accountFromRequest } from '@/lib/session';
import { json } from '@/lib/security';
import { isBlobNotFound } from '@/lib/blob-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = 'season7/7.00/4629139/';
const FINAL_MANIFEST = PREFIX + '.projectzero-manifest.json';
const SIGNED_URL_LIFETIME_MS = 6 * 60 * 60 * 1000;

async function loadFinalManifest() {
  const result = await get(FINAL_MANIFEST, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  const manifest = JSON.parse(text);
  if (!manifest || manifest.locked !== true || !Array.isArray(manifest.files) || !manifest.files.length) return null;
  return manifest;
}

async function signedFiles(manifestFiles) {
  const validUntil = Date.now() + SIGNED_URL_LIFETIME_MS;
  const signingToken = await issueSignedToken({ operations: ['get'], validUntil });

  return Promise.all(manifestFiles.map(async (entry) => {
    const pathname = PREFIX + entry.path;
    const { presignedUrl } = await presignUrl(signingToken, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil
    });

    return {
      path: entry.path,
      url: presignedUrl,
      size: Number(entry.size || 0),
      etag: entry.etag || '',
      sha256: String(entry.sha256 || '').toLowerCase()
    };
  }));
}

export async function GET(req) {
  const auth = await accountFromRequest(req, ['console']);
  if (!auth) return json({ error: 'Console session required' }, 401);

  try {
    const finalized = await loadFinalManifest();
    if (finalized) {
      const files = await signedFiles(finalized.files);
      return json({
        available: true,
        mode: 'files',
        locked: true,
        build: finalized.build || '7.00',
        cl: finalized.cl || '4629139',
        fileCount: files.length,
        totalSize: Number(finalized.totalSize || 0),
        files
      });
    }
  } catch (error) {
    if (!isBlobNotFound(error)) console.error('finalized content manifest failed', error);
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
      reason: 'Season 7 extracted content has not been finalized yet.'
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

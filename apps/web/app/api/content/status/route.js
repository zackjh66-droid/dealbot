import { timingSafeEqual } from 'node:crypto';
import { head } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = 'season7/7.00/4629139/';
const FINAL_MANIFEST = PREFIX + '.projectzero-manifest.json';

function sameSecret(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

function cleanRelativePath(value) {
  const path = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..' || part.includes(':'))) {
    throw new Error('Invalid relative path');
  }
  return parts.join('/');
}

async function tryHead(pathname) {
  try {
    return await head(pathname);
  } catch (error) {
    if (error?.name === 'BlobNotFoundError' || error?.status === 404 || error?.statusCode === 404) return null;
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!sameSecret(body?.key, process.env.PZ_CONTENT_UPLOAD_KEY)) {
      return Response.json({ error: 'Invalid content upload key' }, { status: 401 });
    }

    const finalized = await tryHead(FINAL_MANIFEST);
    if (finalized) {
      return Response.json({ locked: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const relativePath = cleanRelativePath(body?.path);
    const expectedSize = Number(body?.size ?? -1);
    if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
      throw new Error('Invalid file size');
    }

    const blob = await tryHead(PREFIX + relativePath);
    if (!blob) {
      return Response.json({ locked: false, exists: false }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const actualSize = Number(blob.size ?? -1);
    return Response.json({
      locked: false,
      exists: true,
      sizeMatches: actualSize === expectedSize,
      size: actualSize,
      etag: blob.etag || ''
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('content status failed', error);
    return Response.json(
      { error: error?.message || 'Could not inspect content file' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

import {
  contentRequestAuthorized,
  contentResponseHeaders,
  hasValidContentSession,
  validContentUploadKey
} from '../../../../lib/content-upload-auth';
import { headOrNull } from '../../../../lib/blob-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = 'season7/7.00/4629139/';
const FINAL_MANIFEST = PREFIX + '.projectzero-manifest.json';

function cleanRelativePath(value) {
  const path = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..' || part.includes(':'))) {
    throw new Error('Invalid relative path');
  }
  return parts.join('/');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const suppliedKeyValid = validContentUploadKey(body?.key);
    const sessionValid = hasValidContentSession(request);
    if (!contentRequestAuthorized(request, body?.key)) {
      return Response.json(
        { error: 'Invalid content upload key. Refresh the page and use the current Project Zero content key.' },
        { status: 401, headers: contentResponseHeaders() }
      );
    }

    const headers = contentResponseHeaders({ refreshSession: suppliedKeyValid || sessionValid });
    const finalized = await headOrNull(FINAL_MANIFEST);
    if (finalized) {
      return Response.json({ locked: true }, { headers });
    }

    const relativePath = cleanRelativePath(body?.path);
    const expectedSize = Number(body?.size ?? -1);
    if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
      throw new Error('Invalid file size');
    }

    const blob = await headOrNull(PREFIX + relativePath);
    if (!blob) {
      return Response.json({ locked: false, exists: false }, { headers });
    }

    const actualSize = Number(blob.size ?? -1);
    return Response.json({
      locked: false,
      exists: true,
      sizeMatches: actualSize === expectedSize,
      size: actualSize,
      etag: blob.etag || ''
    }, { headers });
  } catch (error) {
    console.error('content status failed', error);
    return Response.json(
      { error: error?.message || 'Could not inspect content file' },
      { status: 400, headers: contentResponseHeaders() }
    );
  }
}

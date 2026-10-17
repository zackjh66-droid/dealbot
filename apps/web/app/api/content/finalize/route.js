import { head, put } from '@vercel/blob';
import { contentRequestAuthorized, contentResponseHeaders } from '../../../../lib/content-upload-auth';

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

async function manifestAlreadyExists() {
  try {
    await head(FINAL_MANIFEST);
    return true;
  } catch (error) {
    if (error?.name === 'BlobNotFoundError' || error?.status === 404 || error?.statusCode === 404) return false;
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!contentRequestAuthorized(request, body?.key)) {
      return Response.json(
        { error: 'Content upload session expired. Refresh the page and Resume upload again.' },
        { status: 401, headers: contentResponseHeaders() }
      );
    }

    if (await manifestAlreadyExists()) {
      return Response.json(
        { error: 'Season 7 content has already been finalized and is locked.' },
        { status: 409, headers: contentResponseHeaders() }
      );
    }

    const incoming = Array.isArray(body?.files) ? body.files : [];
    if (!incoming.length || incoming.length > 20000) {
      throw new Error('Invalid file list');
    }

    const seen = new Set();
    const files = [];
    let totalSize = 0;

    for (const entry of incoming) {
      const path = cleanRelativePath(entry?.path);
      if (path.startsWith('.projectzero-') || seen.has(path.toLowerCase())) {
        throw new Error('Duplicate or reserved file path: ' + path);
      }
      seen.add(path.toLowerCase());

      const size = Number(entry?.size ?? -1);
      const sha256 = String(entry?.sha256 || '').trim().toLowerCase();
      if (!Number.isSafeInteger(size) || size < 0 || !/^[a-f0-9]{64}$/.test(sha256)) {
        throw new Error('Invalid metadata for ' + path);
      }

      const blob = await head(PREFIX + path);
      if (!blob || Number(blob.size || 0) !== size) {
        throw new Error('Uploaded file is missing or has the wrong size: ' + path);
      }

      files.push({ path, size, sha256, etag: blob.etag || '' });
      totalSize += size;
    }

    files.sort((a, b) => a.path.localeCompare(b.path));
    const manifest = {
      schema: 2,
      locked: true,
      build: '7.00',
      cl: '4629139',
      createdAt: new Date().toISOString(),
      fileCount: files.length,
      totalSize,
      files
    };

    await put(FINAL_MANIFEST, JSON.stringify(manifest), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json'
    });

    return Response.json({
      ok: true,
      locked: true,
      build: manifest.build,
      cl: manifest.cl,
      fileCount: manifest.fileCount,
      totalSize: manifest.totalSize
    }, { headers: contentResponseHeaders() });
  } catch (error) {
    console.error('content finalization failed', error);
    return Response.json(
      { error: error?.message || 'Could not finalize content' },
      { status: 400, headers: contentResponseHeaders() }
    );
  }
}

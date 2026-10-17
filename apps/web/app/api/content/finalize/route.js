import { put } from '@vercel/blob';
import { contentRequestAuthorized, contentResponseHeaders } from '../../../../lib/content-upload-auth';
import { blobExists, headOrNull } from '../../../../lib/blob-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREFIX = 'season7/7.00/4629139/';
const FINAL_MANIFEST = PREFIX + '.projectzero-manifest.json';
const MAX_FILES = 20000;
const VERIFY_CONCURRENCY = 16;

function cleanRelativePath(value) {
  const path = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..' || part.includes(':'))) {
    throw new Error('Invalid relative path');
  }
  return parts.join('/');
}

async function verifyUploadedFiles(files) {
  const verified = new Array(files.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= files.length) return;

      const entry = files[index];
      const blob = await headOrNull(PREFIX + entry.path);
      if (!blob) {
        throw new Error('Uploaded file is missing: ' + entry.path);
      }
      if (Number(blob.size ?? -1) !== entry.size) {
        throw new Error('Uploaded file has the wrong size: ' + entry.path);
      }

      verified[index] = { ...entry, etag: blob.etag || '' };
    }
  }

  const workers = Array.from(
    { length: Math.min(VERIFY_CONCURRENCY, files.length) },
    () => worker()
  );
  await Promise.all(workers);
  return verified;
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

    if (await blobExists(FINAL_MANIFEST)) {
      return Response.json(
        { error: 'Season 7 content has already been finalized and is locked.' },
        { status: 409, headers: contentResponseHeaders() }
      );
    }

    const incoming = Array.isArray(body?.files) ? body.files : [];
    if (!incoming.length || incoming.length > MAX_FILES) {
      throw new Error('Invalid file list');
    }

    const seen = new Set();
    const normalized = [];
    let totalSize = 0;

    for (const entry of incoming) {
      const path = cleanRelativePath(entry?.path);
      const lowerPath = path.toLowerCase();
      if (path.startsWith('.projectzero-') || seen.has(lowerPath)) {
        throw new Error('Duplicate or reserved file path: ' + path);
      }
      seen.add(lowerPath);

      const size = Number(entry?.size ?? -1);
      const sha256 = String(entry?.sha256 || '').trim().toLowerCase();
      if (!Number.isSafeInteger(size) || size < 0 || !/^[a-f0-9]{64}$/.test(sha256)) {
        throw new Error('Invalid metadata for ' + path);
      }

      totalSize += size;
      if (!Number.isSafeInteger(totalSize)) {
        throw new Error('Content size is too large to represent safely');
      }
      normalized.push({ path, size, sha256 });
    }

    const files = await verifyUploadedFiles(normalized);
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

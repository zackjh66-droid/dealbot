import { head } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { contentRequestAuthorized } from '../../../../lib/content-upload-auth';

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

async function exists(pathname) {
  try {
    const metadata = await head(pathname);
    return metadata || true;
  } catch (error) {
    if (error?.name === 'BlobNotFoundError' || error?.status === 404 || error?.statusCode === 404) return false;
    throw error;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try {
          payload = JSON.parse(clientPayload || '{}');
        } catch {
          throw new Error('Invalid upload metadata');
        }

        // The normal flow establishes an HttpOnly content session during the status check that
        // happens before every upload. Keep the supplied key as a compatibility fallback, but do
        // not require it on every multipart token request: that caused long uploads to fail after
        // already processing many files.
        if (!contentRequestAuthorized(request, payload.key)) {
          throw new Error('Content upload session expired. Refresh the page and start Resume upload again.');
        }

        if (await exists(FINAL_MANIFEST)) {
          throw new Error('Season 7 content is finalized and locked. No more files can be added or changed.');
        }

        const relativePath = cleanRelativePath(payload.relativePath);
        const expectedPathname = PREFIX + relativePath;
        if (pathname !== expectedPathname) {
          throw new Error('Upload pathname did not match the requested game path');
        }

        const size = Number(payload.size ?? -1);
        const sha256 = String(payload.sha256 || '').trim().toLowerCase();
        if (!Number.isSafeInteger(size) || size < 0 || !/^[a-f0-9]{64}$/.test(sha256)) {
          throw new Error('Invalid file size or SHA-256');
        }

        return {
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ relativePath, size, sha256 })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const meta = JSON.parse(tokenPayload || '{}');
        console.log('Project Zero content uploaded', {
          pathname: blob.pathname,
          relativePath: meta.relativePath,
          size: meta.size,
          sha256: meta.sha256,
          etag: blob.etag
        });
      }
    });

    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('content token request failed', error);
    return Response.json(
      { error: error?.message || 'Upload failed' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

import { handleUpload } from '@vercel/blob/client';
import { contentRequestAuthorized } from '../../../../lib/content-upload-auth';
import { blobExists } from '../../../../lib/blob-utils';

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

        if (!contentRequestAuthorized(request, payload.key)) {
          throw new Error('Content upload session expired. Refresh the page and start Resume upload again.');
        }

        if (await blobExists(FINAL_MANIFEST)) {
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

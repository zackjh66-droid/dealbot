import { head } from '@vercel/blob';

export function isBlobNotFound(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || error?.cause?.code || '').toLowerCase();
  const name = String(error?.name || error?.constructor?.name || '');
  const status = Number(error?.status ?? error?.statusCode ?? error?.cause?.status ?? error?.cause?.statusCode ?? 0);

  return name === 'BlobNotFoundError'
    || status === 404
    || code === 'blob_not_found'
    || code === 'not_found'
    || message.includes('requested blob does not exist')
    || message.includes('blob does not exist')
    || message.includes('blob not found');
}

export async function headOrNull(pathname) {
  try {
    return await head(pathname);
  } catch (error) {
    if (isBlobNotFound(error)) return null;
    throw error;
  }
}

export async function blobExists(pathname) {
  return Boolean(await headOrNull(pathname));
}

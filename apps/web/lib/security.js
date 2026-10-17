import { createHash, randomBytes } from 'node:crypto';

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newLinkCode() {
  const bytes = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function newToken(size = 32) {
  return randomBytes(size).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256')
    .update(`${process.env.PZ_SECRET || 'project-zero-dev-secret'}::${token}`)
    .digest('hex');
}

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '0.0.0.0';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

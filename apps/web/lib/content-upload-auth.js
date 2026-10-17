import { createHmac, timingSafeEqual } from 'node:crypto';

export const CONTENT_SESSION_COOKIE = 'pz_content_upload_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

function uploadSecret() {
  return String(process.env.PZ_CONTENT_UPLOAD_KEY || '');
}

export function validContentUploadKey(value) {
  return safeEqualText(String(value || '').trim(), uploadSecret());
}

function signatureFor(expires) {
  const secret = uploadSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(`project-zero-content:${expires}`).digest('hex');
}

function parseCookies(request) {
  const raw = String(request?.headers?.get?.('cookie') || '');
  const result = new Map();
  for (const item of raw.split(';')) {
    const index = item.indexOf('=');
    if (index < 1) continue;
    const name = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (name) result.set(name, value);
  }
  return result;
}

export function hasValidContentSession(request) {
  const value = parseCookies(request).get(CONTENT_SESSION_COOKIE) || '';
  const [expiresText, signature] = value.split('.', 2);
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  return safeEqualText(signature, signatureFor(expires));
}

export function contentRequestAuthorized(request, suppliedKey) {
  return hasValidContentSession(request) || validContentUploadKey(suppliedKey);
}

export function contentSessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const value = `${expires}.${signatureFor(expires)}`;
  return `${CONTENT_SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function contentResponseHeaders({ refreshSession = false } = {}) {
  const headers = { 'Cache-Control': 'no-store' };
  if (refreshSession) headers['Set-Cookie'] = contentSessionCookie();
  return headers;
}

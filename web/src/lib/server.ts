import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, randomInt } from 'node:crypto';

export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function sha256(value: string, pepper: string) {
  return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
}

export function newDeviceCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = () => Array.from({length:4}, () => alphabet[randomInt(alphabet.length)]).join('');
  return `${group()}-${group()}`;
}

export function opaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

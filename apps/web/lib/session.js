import { db } from './db';
import { hashToken } from './security';

export async function accountFromRequest(req, kinds = ['web', 'console']) {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (raw.length < 20) return null;
  const { data, error } = await db()
    .from('sessions')
    .select('id, account_id, device_id, kind, revoked_at, accounts(*), devices(*)')
    .eq('token_hash', hashToken(raw))
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  if (!kinds.includes(data.kind)) return null;
  if (data.accounts && data.accounts.status !== 'active') return null;
  await db()
    .from('sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id);
  return { session: data, account: data.accounts, device: data.devices };
}

export function publicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    accountNo: account.account_no,
    username: account.username,
    email: account.email,
    createdAt: account.created_at,
    status: account.status
  };
}

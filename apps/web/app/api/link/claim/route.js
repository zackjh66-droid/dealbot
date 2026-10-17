import { db } from '@/lib/db';
import { EMAIL_RE, USERNAME_RE, hashToken, newToken, json, readJson, clientIp } from '@/lib/security';
import { underLimit, audit } from '@/lib/ratelimit';
import { publicAccount } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const ip = clientIp(req);
  if (!(await underLimit('link.claim', ip, 20, 60))) {
    return json({ error: 'Too many attempts. Wait an hour and try again.' }, 429);
  }
  const body = await readJson(req);
  const code = String(body.code || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  const username = String(body.username || '').trim();

  if (!/^[A-Z0-9]{6}$/.test(code)) return json({ error: 'Link code must be 6 characters.' }, 400);
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400);
  if (!USERNAME_RE.test(username)) {
    return json({ error: 'Username must be 3-20 characters, letters, numbers or underscore.' }, 400);
  }

  const { data: link, error: linkError } = await db()
    .from('link_codes')
    .select('id, status, expires_at, device_id')
    .eq('code', code)
    .maybeSingle();

  if (linkError || !link) return json({ error: 'That code is not active.' }, 404);
  if (link.status === 'claimed') return json({ error: 'This console is already linked.' }, 409);
  if (link.status !== 'pending') return json({ error: 'That code expired. Refresh the launcher for a new one.' }, 410);
  if (new Date(link.expires_at).getTime() < Date.now()) {
    await db().from('link_codes').update({ status: 'expired' }).eq('id', link.id);
    return json({ error: 'That code expired. Refresh the launcher for a new one.' }, 410);
  }

  const { data: existingEmail } = await db().from('accounts').select('id').eq('email', email).maybeSingle();
  if (existingEmail) return json({ error: 'An account already uses that email.' }, 409);
  const { data: existingName } = await db().from('accounts').select('id').eq('username', username).maybeSingle();
  if (existingName) return json({ error: 'That username is taken.' }, 409);

  const { data: account, error: accountError } = await db()
    .from('accounts')
    .insert({ email, username })
    .select('*')
    .single();
  if (accountError) {
    if (accountError.code === '23505') return json({ error: 'Email or username already in use.' }, 409);
    return json({ error: 'Could not create the account.' }, 500);
  }

  const webToken = newToken(32);
  await db().from('sessions').insert({
    account_id: account.id,
    device_id: link.device_id,
    token_hash: hashToken(webToken),
    kind: 'web'
  });

  const { error: claimError } = await db()
    .from('link_codes')
    .update({ status: 'claimed', claimed_account_id: account.id, claimed_at: new Date().toISOString() })
    .eq('id', link.id)
    .eq('status', 'pending');
  if (claimError) return json({ error: 'Could not complete the link. Try again.' }, 500);

  await audit('account.created', {
    accountId: account.id,
    deviceId: link.device_id,
    ip,
    meta: { code }
  });

  return json({ token: webToken, account: publicAccount(account) });
}

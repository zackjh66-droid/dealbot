import { db, siteUrl } from '@/lib/db';
import { newLinkCode, newToken, hashToken, json, readJson, clientIp } from '@/lib/security';
import { underLimit, audit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CODE_TTL_MINUTES = 15;

export async function POST(req) {
  const ip = clientIp(req);
  if (!(await underLimit('link.start', ip, 30, 60))) {
    return json({ error: 'Too many consoles linked from this network. Wait an hour.' }, 429);
  }

  const body = await readJson(req);
  const name = String(body.deviceName || 'Xbox console').slice(0, 64);
  const platform = String(body.platform || 'xbox').slice(0, 32);
  const appVersion = String(body.appVersion || 'unknown').slice(0, 32);
  const consoleId = body.consoleId ? String(body.consoleId).slice(0, 64) : null;

  const deviceToken = newToken(32);
  const pollToken = newToken(24);

  const { data: device, error: deviceError } = await db()
    .from('devices')
    .insert({
      token_hash: hashToken(deviceToken),
      name,
      platform,
      console_id: consoleId,
      app_version: appVersion
    })
    .select('id')
    .single();

  if (deviceError) return json({ error: 'Could not register device' }, 500);

  let code = newLinkCode();
  let inserted = null;
  for (let attempt = 0; attempt < 6 && !inserted; attempt += 1) {
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
    const { data, error } = await db()
      .from('link_codes')
      .insert({
        code,
        device_id: device.id,
        poll_token_hash: hashToken(pollToken),
        expires_at: expiresAt
      })
      .select('code, expires_at')
      .single();
    if (!error) inserted = data;
    else if (error.code === '23505') code = newLinkCode();
    else return json({ error: 'Could not create link code' }, 500);
  }

  if (!inserted) return json({ error: 'Could not allocate a link code' }, 500);

  await audit('link.start', { deviceId: device.id, ip, meta: { appVersion, platform } });

  return json({
    code: inserted.code,
    deviceToken,
    pollToken,
    expiresAt: inserted.expires_at,
    linkUrl: `${siteUrl()}/link?code=${inserted.code}`,
    ttlSeconds: CODE_TTL_MINUTES * 60
  });
}

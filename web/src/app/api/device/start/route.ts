import { NextResponse } from 'next/server';
import { admin, newDeviceCode, opaqueToken, sha256 } from '@/lib/server';

export async function POST() {
  const code = newDeviceCode();
  const deviceToken = opaqueToken();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await admin.from('device_links').insert({
    code_hash: sha256(code, process.env.DEVICE_CODE_PEPPER!),
    device_token_hash: sha256(deviceToken, process.env.DEVICE_CODE_PEPPER!),
    expires_at: expiresAt
  });
  if (error) return NextResponse.json({error:'device_link_create_failed'}, {status:500});
  return NextResponse.json({
    code,
    deviceToken,
    verificationUrl: process.env.NEXT_PUBLIC_VERIFY_URL,
    expiresAt,
    pollAfterSeconds: 3
  }, {headers:{'Cache-Control':'no-store'}});
}

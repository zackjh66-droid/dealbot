import { NextRequest, NextResponse } from 'next/server';
import { admin, opaqueToken, sha256 } from '@/lib/server';

export async function POST(req: NextRequest) {
  const { deviceToken } = await req.json().catch(() => ({}));
  if (typeof deviceToken !== 'string' || deviceToken.length < 20)
    return NextResponse.json({error:'invalid_request'}, {status:400});

  const tokenHash = sha256(deviceToken, process.env.DEVICE_CODE_PEPPER!);
  const { data: link } = await admin.from('device_links').select('id,status,user_id,expires_at').eq('device_token_hash', tokenHash).maybeSingle();
  if (!link) return NextResponse.json({error:'unknown_device'}, {status:404});
  if (new Date(link.expires_at).getTime() <= Date.now()) {
    await admin.from('device_links').update({status:'expired'}).eq('id', link.id).eq('status','pending');
    return NextResponse.json({status:'expired'}, {status:410});
  }
  if (link.status === 'pending') return NextResponse.json({status:'pending'}, {headers:{'Cache-Control':'no-store'}});
  if (link.status !== 'claimed' || !link.user_id) return NextResponse.json({status:link.status});

  const sessionToken = opaqueToken(48);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60_000).toISOString();
  const { error } = await admin.from('launcher_sessions').insert({
    user_id: link.user_id,
    device_link_id: link.id,
    token_hash: sha256(sessionToken, process.env.SESSION_PEPPER!),
    expires_at: expiresAt
  });
  if (error) return NextResponse.json({error:'session_create_failed'}, {status:500});
  await admin.from('device_links').update({status:'consumed', consumed_at:new Date().toISOString()}).eq('id',link.id).eq('status','claimed');
  return NextResponse.json({status:'linked', sessionToken, expiresAt}, {headers:{'Cache-Control':'no-store'}});
}

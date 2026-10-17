import { NextRequest, NextResponse } from 'next/server';
import { admin, sha256 } from '@/lib/server';

export async function POST(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if (!bearer) return NextResponse.json({error:'sign_in_required'}, {status:401});
  const { data: authData } = await admin.auth.getUser(bearer);
  const user = authData.user;
  if (!user) return NextResponse.json({error:'invalid_session'}, {status:401});

  const { code } = await req.json().catch(() => ({}));
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalized))
    return NextResponse.json({error:'invalid_code'}, {status:400});

  const hash = sha256(normalized, process.env.DEVICE_CODE_PEPPER!);
  const { data: link } = await admin.from('device_links').select('id,status,expires_at').eq('code_hash',hash).maybeSingle();
  if (!link || link.status !== 'pending' || new Date(link.expires_at).getTime() <= Date.now())
    return NextResponse.json({error:'code_not_available'}, {status:404});

  const { error } = await admin.from('device_links').update({
    status:'claimed', user_id:user.id, claimed_at:new Date().toISOString()
  }).eq('id',link.id).eq('status','pending');
  if (error) return NextResponse.json({error:'claim_failed'}, {status:409});
  return NextResponse.json({ok:true});
}

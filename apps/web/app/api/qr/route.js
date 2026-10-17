import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const data = (searchParams.get('data') || '').slice(0, 512);
  if (!data) return new Response('missing data', { status: 400 });
  try {
    const png = await QRCode.toBuffer(data, {
      type: 'png',
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#08060E', light: '#F7F3FF' }
    });
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch {
    return new Response('qr failed', { status: 500 });
  }
}

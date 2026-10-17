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
      width: 640,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000FF',
        light: '#FFFFFFFF'
      }
    });

    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return new Response('qr failed', { status: 500 });
  }
}

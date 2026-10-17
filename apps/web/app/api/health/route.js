import { db } from '@/lib/db';
import { json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  const { error } = await db().from('builds').select('id', { head: true, count: 'exact' }).limit(1);
  return json({
    ok: !error,
    service: 'project-zero-control-plane',
    database: error ? 'unreachable' : 'up',
    latencyMs: Date.now() - started,
    time: new Date().toISOString()
  }, error ? 503 : 200);
}

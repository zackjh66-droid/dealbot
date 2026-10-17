import { db } from '@/lib/db';
import { json } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await db()
    .from('builds')
    .select('season, channel, version, cl, build_label, download_url, mirror_url, archive_url, launch_uri, package_family_name')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) return json({ error: 'Build registry unavailable' }, 500);
  return json({ builds: data });
}

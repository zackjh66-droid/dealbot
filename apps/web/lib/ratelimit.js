import { db } from './db';

export async function underLimit(event, ip, max, windowMinutes) {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await db()
    .from('audit_events')
    .select('id', { count: 'exact', head: true })
    .eq('event', event)
    .eq('ip', ip)
    .gte('created_at', since);
  if (error) return true;
  return (count || 0) < max;
}

export async function audit(event, { accountId = null, deviceId = null, ip = null, meta = {} } = {}) {
  try {
    await db().from('audit_events').insert({
      event,
      account_id: accountId,
      device_id: deviceId,
      ip,
      meta
    });
  } catch {
    /* audit must never break a request */
  }
}

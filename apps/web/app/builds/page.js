import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Build registry · Project Zero'
};

export default async function BuildsPage() {
  let builds = [];
  let offline = false;
  try {
    const { data } = await db()
      .from('builds')
      .select('season, channel, version, cl, build_label, download_url, mirror_url, archive_url, notes')
      .eq('active', true)
      .order('sort_order', { ascending: true });
    builds = data || [];
  } catch {
    offline = true;
  }

  const seasons = [6, 7];

  return (
    <div className="container page">
      <div className="page-head">
        <span className="eyebrow">Registry</span>
        <h1>Season 06 / 07</h1>
        <p>
          Builds tracked for the console channel. The archives are third party and this workspace does not
          host or mirror them. Client packages must be rebuilt for UWP and signed before Dev Mode will load
          them.
        </p>
      </div>

      {offline ? (
        <div className="alert" style={{ marginTop: 30 }}>
          Registry unreachable. Control plane database is not answering.
        </div>
      ) : null}

      {seasons.map((season) => {
        const rows = builds.filter((build) => build.season === season);
        return (
          <section className="section" key={season}>
            <div className="section-head">
              <div>
                <span className="eyebrow dim">Channel</span>
                <h2>Season {String(season).padStart(2, '0')}</h2>
              </div>
              <p>{rows.length} tracked reference builds. Download links point to the public archive mirrors.</p>
            </div>
            <div className="build-grid">
              {rows.length ? (
                rows.map((build) => (
                  <div className="build-card" key={`${build.version}-${build.cl}`}>
                    <span className="build-season">{build.build_label || `Season ${season}`}</span>
                    <span className="build-version">{build.version}</span>
                    <span className="build-cl">{build.cl}</span>
                    {build.notes ? (
                      <span className="note" style={{ fontSize: 11 }}>
                        {build.notes}
                      </span>
                    ) : null}
                    <span className="build-link" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {build.download_url ? (
                        <a href={build.download_url} target="_blank" rel="noreferrer">
                          Mirror ↗
                        </a>
                      ) : null}
                      {build.archive_url ? (
                        <a href={build.archive_url} target="_blank" rel="noreferrer">
                          Archive ↗
                        </a>
                      ) : null}
                    </span>
                  </div>
                ))
              ) : (
                <div className="build-card">
                  <span className="build-season">Empty</span>
                  <span className="build-version">—</span>
                  <span className="build-cl">No builds registered in this channel.</span>
                </div>
              )}
            </div>
          </section>
        );
      })}

      <div className="panel" style={{ padding: 28, marginTop: 20 }}>
        <span className="eyebrow">Client status</span>
        <p className="note" style={{ marginTop: 12 }}>
          None of these PC archives are installable on Xbox as-is. The launcher expects a UWP client package
          that registers <span className="mono gold">projectzero-game://launch</span>. Until that package is
          built and signed, the launcher stops at the handoff screen. That is the current state of the
          project, not a bug.
        </p>
      </div>
    </div>
  );
}

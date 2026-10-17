import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Builds · Project Zero'
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

  const seasons = [7, 6];

  return (
    <div className="container page">
      <header className="page-head">
        <span className="eyebrow">BUILD REGISTRY</span>
        <h1>Archived builds.</h1>
        <p>
          Reference metadata for the Chapter 1 builds Project Zero understands. Season 7 v7.00 / CL-4629139
          is the current Xbox target. Archive links remain separate from the launcher and are only for content
          you are authorised to hold.
        </p>
      </header>

      {offline ? (
        <div className="alert" style={{ marginTop: 30 }}>
          The registry is temporarily unavailable. The launcher services are separate from this page.
        </div>
      ) : null}

      {seasons.map((season) => {
        const rows = builds.filter((build) => Number(build.season) === season);
        return (
          <section className="section" key={season}>
            <div className="section-head">
              <div>
                <span className="eyebrow dim">CHAPTER 1</span>
                <h2>Season {season}</h2>
              </div>
              <p>{rows.length ? `${rows.length} tracked build${rows.length === 1 ? '' : 's'}.` : 'No active builds in this channel.'}</p>
            </div>

            <div className="build-grid">
              {rows.length ? rows.map((build) => (
                <article className="build-card" key={`${build.version}-${build.cl}`}>
                  <span className="build-season">{build.build_label || `Season ${season}`}</span>
                  <span className="build-version">{build.version}</span>
                  <span className="build-cl">{build.cl}</span>
                  {build.notes ? <span className="note" style={{ marginTop: 10 }}>{build.notes}</span> : null}
                  <span className="build-link" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {build.download_url ? <a href={build.download_url} target="_blank" rel="noreferrer">Mirror ↗</a> : null}
                    {build.archive_url ? <a href={build.archive_url} target="_blank" rel="noreferrer">Archive ↗</a> : null}
                  </span>
                </article>
              )) : (
                <article className="build-card">
                  <span className="build-season">No active entries</span>
                  <span className="build-version">—</span>
                  <span className="build-cl">Nothing registered for Season {season}.</span>
                </article>
              )}
            </div>
          </section>
        );
      })}

      <section className="section">
        <div className="panel side-panel">
          <span className="eyebrow">XBOX NOTE</span>
          <p className="note" style={{ marginTop: 12, maxWidth: '75ch' }}>
            A Windows archive is not an Xbox package by itself. Project Zero keeps the archived files as content,
            verifies them, and hands them to the separate Xbox-compatible client/runtime work. The current target
            is Season 7 v7.00 / CL-4629139.
          </p>
        </div>
      </section>
    </div>
  );
}

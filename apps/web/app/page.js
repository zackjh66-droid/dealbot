import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getBuilds() {
  try {
    const { data } = await db()
      .from('builds')
      .select('season, version, cl, build_label, download_url')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .limit(4);
    return data || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const builds = await getBuilds();

  return (
    <>
      <section className="container hero">
        <div>
          <p className="eyebrow">XBOX DEV MODE · SEASON 06 / 07</p>
          <h1 className="display">
            Project
            <br />
            <em>Zero</em>
          </h1>
          <p className="hero-sub">
            A private console home for the builds you already hold. Link the console, mint the account,
            hand the session to the client. No matchmaking, no storefront traffic, no rebuilt lobby, just the
            original Season 6 and 7 front end running on your own hardware.
          </p>
          <div className="hero-actions">
            <Link href="/link" className="btn btn-primary">
              Link your console
            </Link>
            <Link href="/builds" className="btn btn-ghost">
              Build registry
            </Link>
          </div>
          <div className="meta-row">
            <div className="meta-item">
              <b>06 / 07</b>
              <span>Season channels</span>
            </div>
            <div className="meta-item">
              <b>UWP · x64</b>
              <span>Dev Mode package</span>
            </div>
            <div className="meta-item">
              <b>15 min</b>
              <span>Link code window</span>
            </div>
          </div>
        </div>

        <div className="panel console-card">
          <div className="console-head">
            <span className="eyebrow dim">Console handshake</span>
            <span className="status-dot standby" />
          </div>
          <div className="code-display">· · · · · ·</div>
          <span className="code-label">Waiting for a code</span>
          <div className="console-foot">
            <span className="scan" aria-hidden="true" />
            <span>
              The launcher prints a six character code on the TV. Enter it here to bind this console to an
              account.
            </span>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow dim">01 / Sequence</span>
            <h2>Three moves to the lobby</h2>
          </div>
          <p>
            The launcher owns the whole handoff: code, account, build selection, process start. The website is
            only the bridge.
          </p>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-num">STEP 01</span>
            <h3>Boot the launcher</h3>
            <p>
              Sideload the Project Zero MSIX in Xbox Dev Mode. The launcher opens on the link screen and
              requests a fresh code from the control plane.
            </p>
          </div>
          <div className="step">
            <span className="step-num">STEP 02</span>
            <h3>Claim on the site</h3>
            <p>
              Enter the six character code, pick an email and username. That account is the identity the
              client will boot into.
            </p>
          </div>
          <div className="step">
            <span className="step-num">STEP 03</span>
            <h3>Client handoff</h3>
            <p>
              The console sees the claim within seconds, pulls its session ticket and launches the installed
              Season 6 or 7 client package.
            </p>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow dim">02 / Registry</span>
            <h2>Season channels</h2>
          </div>
          <p>
            Reference builds tracked by the archive. Project Zero never hosts the archives; the registry
            points to the public mirrors.
          </p>
        </div>
        <div className="build-grid">
          {builds.length ? (
            builds.map((build) => (
              <a
                key={`${build.version}-${build.cl}`}
                className="build-card"
                href={build.download_url || '/builds'}
                target="_blank"
                rel="noreferrer"
              >
                <span className="build-season">Season {String(build.season).padStart(2, '0')}</span>
                <span className="build-version">{build.version}</span>
                <span className="build-cl">{build.cl}</span>
                <span className="build-link">Open archive →</span>
              </a>
            ))
          ) : (
            <div className="build-card">
              <span className="build-season">Registry offline</span>
              <span className="build-version">—</span>
              <span className="build-cl">Control plane unreachable</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: 22 }}>
          <Link href="/builds" className="btn btn-ghost">
            All tracked builds
          </Link>
        </div>
      </section>

      <section className="container section">
        <div className="panel" style={{ padding: 34 }}>
          <div className="spread" style={{ flexWrap: 'wrap' }}>
            <div>
              <span className="eyebrow">Scope</span>
              <h2 className="display" style={{ fontSize: 30, margin: '12px 0 8px' }}>
                Lobby only. By design.
              </h2>
              <p className="note" style={{ maxWidth: '62ch' }}>
                No matchmaking and no live services at this stage. The client boots to the original front end
                and stops there. Session and account services are held open for the game layer that comes
                later.
              </p>
            </div>
            <Link href="/link" className="btn btn-primary">
              Start a handshake
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SEASON7_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fblog%2Ftake-to-the-skies-in-season-7%2FBR07_News_Featured_16_9-1920x1080-c8c58d82b2986bf9615c839d53bb7763c06895c5.jpg';

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
  const featured = builds.find((build) => String(build.version) === '7.00') || builds[0];

  return (
    <div className="home-shell">
      <section
        className="home-scene home-hero"
        style={{ '--scene-image': `url("${SEASON7_ART}")` }}
      >
        <div className="home-scene-shade" />
        <div className="container home-scene-inner home-hero-inner">
          <div className="home-copy home-reveal">
            <span className="home-kicker">PROJECT ZERO · XBOX DEV MODE</span>
            <h1>
              Drop back into
              <span>Season Seven.</span>
            </h1>
            <p>
              A clean preservation launcher built around the original Chapter 1 Season 7 client. Link your
              console, install the archived content you are authorised to hold, and hand the session to the
              Xbox client.
            </p>
            <div className="home-actions">
              <Link href="/link" className="home-btn home-btn-primary">
                Link console
              </Link>
              <Link href="/builds" className="home-btn home-btn-secondary">
                View builds
              </Link>
            </div>
          </div>

          <div className="home-build-glass home-reveal home-reveal-delay">
            <span className="home-card-label">TARGET BUILD</span>
            <strong>{featured?.version || '7.00'}</strong>
            <span>{featured?.cl || 'CL-4629139'}</span>
            <div className="home-card-rule" />
            <div className="home-build-row">
              <span>Platform</span>
              <b>Xbox Dev Mode · x64</b>
            </div>
            <div className="home-build-row">
              <span>Content</span>
              <b>Private verified archive</b>
            </div>
            <div className="home-build-row">
              <span>Status</span>
              <b className="home-status">In development</b>
            </div>
          </div>
        </div>

        <div className="home-scroll-hint" aria-hidden="true">
          <span>SCROLL</span>
          <i />
        </div>
      </section>

      <section className="home-scene home-scene-dark home-how">
        <div className="container home-scene-inner home-stack">
          <div className="home-section-heading home-reveal">
            <span className="home-kicker">HOW IT WORKS</span>
            <h2>One launcher. Three steps.</h2>
            <p>
              The website handles the account and console handshake. The Xbox package handles the local
              content and client handoff.
            </p>
          </div>

          <div className="home-step-grid">
            <article className="home-step-card home-reveal">
              <span>01</span>
              <h3>Install</h3>
              <p>Sideload Project Zero through Xbox Developer Mode and open the launcher.</p>
            </article>
            <article className="home-step-card home-reveal home-reveal-delay">
              <span>02</span>
              <h3>Link</h3>
              <p>Enter the six-character code on this site to bind your account and console.</p>
            </article>
            <article className="home-step-card home-reveal home-reveal-delay-2">
              <span>03</span>
              <h3>Launch</h3>
              <p>Verify the Season 7 content, create a session, and hand it to the Xbox client.</p>
            </article>
          </div>

          <div className="home-marquee" aria-label="Project Zero features">
            <div className="home-marquee-track">
              {[...Array(2)].flatMap((_, loop) =>
                [
                  'SEASON 7 · V7.00',
                  'XBOX DEV MODE',
                  'DEVICE LINKING',
                  'PRIVATE CONTENT',
                  'SHA-256 VERIFY',
                  'CLIENT HANDOFF'
                ].map((item) => (
                  <span key={`${loop}-${item}`}>{item}</span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="home-scene home-builds-scene"
        style={{ '--scene-image': `url("${SEASON7_ART}")` }}
      >
        <div className="home-scene-shade home-scene-shade-heavy" />
        <div className="container home-scene-inner home-stack">
          <div className="home-section-heading home-reveal">
            <span className="home-kicker">BUILD REGISTRY</span>
            <h2>Pick your preserved build.</h2>
            <p>Project Zero keeps launcher metadata separate from the game content so builds can be verified independently.</p>
          </div>

          <div className="home-build-grid">
            {builds.length ? (
              builds.map((build) => (
                <Link
                  key={`${build.version}-${build.cl}`}
                  className="home-season-card home-reveal"
                  href="/builds"
                >
                  <span>SEASON {String(build.season).padStart(2, '0')}</span>
                  <strong>{build.version}</strong>
                  <small>{build.cl}</small>
                  <b>Open build →</b>
                </Link>
              ))
            ) : (
              <div className="home-season-card home-reveal">
                <span>REGISTRY</span>
                <strong>7.00</strong>
                <small>CL-4629139</small>
                <b>Season 7 target</b>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="home-scene home-final"
        style={{ '--scene-image': `url("${SEASON7_ART}")` }}
      >
        <div className="home-scene-shade home-scene-shade-final" />
        <div className="container home-scene-inner home-final-inner">
          <div className="home-final-copy home-reveal">
            <span className="home-mark" aria-hidden="true">Ø</span>
            <span className="home-kicker">PROJECT ZERO</span>
            <h2>Ready when your console is.</h2>
            <p>
              Link an Xbox, check the active build, and continue from the launcher. Project Zero is independent
              and is not affiliated with Epic Games or Microsoft.
            </p>
            <div className="home-actions home-actions-center">
              <Link href="/link" className="home-btn home-btn-primary">
                Start linking
              </Link>
              <Link href="/preview/launcher" className="home-btn home-btn-secondary">
                Preview launcher
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

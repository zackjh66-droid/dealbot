import Link from 'next/link';
import Brand from '@/components/Brand';

export const dynamic = 'force-dynamic';

const SEASON7_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fblog%2Ftake-to-the-skies-in-season-7%2FBR07_News_Featured_16_9-1920x1080-c8c58d82b2986bf9615c839d53bb7763c06895c5.jpg';

export default function Home() {
  return (
    <div className="home-scroll">
      <section className="home-panel home-panel-hero" style={{ '--panel-art': `url("${SEASON7_ART}")` }}>
        <div className="home-backdrop" />
        <div className="home-center">
          <Brand size={82} showWord={false} />
          <p className="home-overline">PROJECT ZERO · XBOX DEV MODE</p>
          <h1>
            RETURN TO
            <span>SEASON 7</span>
          </h1>
          <p className="home-intro">
            A preservation launcher for the archived Fortnite 7.00 client on Xbox Developer Mode.
            Link the console, verify the build and continue into the client handoff.
          </p>
          <div className="home-actions">
            <Link href="/link" className="home-primary">LINK CONSOLE</Link>
            <Link href="/preview/launcher" className="home-secondary">VIEW LAUNCHER</Link>
          </div>
        </div>
        <div className="home-scroll-cue" aria-hidden="true">
          <span>SCROLL</span><i />
        </div>
      </section>

      <section className="home-panel home-panel-season">
        <div className="home-season-media" style={{ '--panel-art': `url("${SEASON7_ART}")` }}>
          <div className="home-season-tag">CHAPTER 1</div>
        </div>
        <div className="home-season-copy">
          <p className="home-overline">TARGET BUILD</p>
          <h2>SEASON<br /><span>SEVEN</span></h2>
          <p>
            Project Zero is currently targeting Fortnite <strong>7.00</strong>, build
            <strong> CL-4629139</strong>. The original content stays separate from the launcher and is
            checked before the Xbox client uses it.
          </p>
          <dl className="home-facts">
            <div><dt>Version</dt><dd>7.00</dd></div>
            <div><dt>Build</dt><dd>CL-4629139</dd></div>
            <div><dt>Platform</dt><dd>Xbox Dev Mode · x64</dd></div>
          </dl>
          <Link href="/builds" className="home-text-link">OPEN BUILD REGISTRY →</Link>
        </div>
      </section>

      <section className="home-panel home-panel-process">
        <div className="home-process-wrap">
          <div className="home-process-head">
            <p className="home-overline">HOW IT WORKS</p>
            <h2>THREE STEPS.<br />NOT THREE DASHBOARDS.</h2>
          </div>
          <div className="home-process-list">
            <article>
              <span>01</span>
              <div><h3>INSTALL</h3><p>Sideload Project Zero through Xbox Developer Mode and open the launcher.</p></div>
            </article>
            <article>
              <span>02</span>
              <div><h3>LINK</h3><p>Enter the six-character code from your TV on this site to bind the console.</p></div>
            </article>
            <article>
              <span>03</span>
              <div><h3>LAUNCH</h3><p>Verify the Season 7 files, create the session and hand it to the Xbox client.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="home-panel home-panel-final" style={{ '--panel-art': `url("${SEASON7_ART}")` }}>
        <div className="home-backdrop home-backdrop-final" />
        <div className="home-center home-final-copy">
          <Brand size={72} showWord={false} />
          <p className="home-overline">PROJECT ZERO</p>
          <h2>READY WHEN<br />YOUR XBOX IS.</h2>
          <p>
            Link a console, check the active build and continue from the launcher. Project Zero is independent
            and is not affiliated with Epic Games or Microsoft.
          </p>
          <div className="home-actions">
            <Link href="/link" className="home-primary">START LINKING</Link>
            <Link href="/account" className="home-secondary">ACCOUNT</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Brand from '@/components/Brand';

const SEASON7_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fblog%2Ftake-to-the-skies-in-season-7%2FBR07_News_Featured_16_9-1920x1080-c8c58d82b2986bf9615c839d53bb7763c06895c5.jpg';

const PANEL_COUNT = 4;
const TRANSITION_MS = 900;

export default function Home() {
  const [active, setActive] = useState(0);
  const lockRef = useRef(false);
  const touchStartRef = useRef(null);

  function moveTo(next) {
    const target = Math.max(0, Math.min(PANEL_COUNT - 1, next));
    if (target === active || lockRef.current) return;

    lockRef.current = true;
    setActive(target);
    window.setTimeout(() => {
      lockRef.current = false;
    }, TRANSITION_MS);
  }

  useEffect(() => {
    const onWheel = (event) => {
      if (Math.abs(event.deltaY) < 16) return;
      event.preventDefault();
      moveTo(active + (event.deltaY > 0 ? 1 : -1));
    };

    const onKeyDown = (event) => {
      if (['ArrowDown', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        moveTo(active + 1);
      } else if (['ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        moveTo(active - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        moveTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        moveTo(PANEL_COUNT - 1);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active]);

  function onTouchStart(event) {
    touchStartRef.current = event.touches?.[0]?.clientY ?? null;
  }

  function onTouchEnd(event) {
    if (touchStartRef.current == null) return;
    const endY = event.changedTouches?.[0]?.clientY;
    if (typeof endY !== 'number') return;
    const delta = touchStartRef.current - endY;
    touchStartRef.current = null;
    if (Math.abs(delta) < 42) return;
    moveTo(active + (delta > 0 ? 1 : -1));
  }

  return (
    <div className="home-viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="home-track" style={{ transform: `translate3d(0, -${active * 100}%, 0)` }}>
        <section
          className={`home-panel home-panel-hero ${active === 0 ? 'is-active' : ''}`}
          style={{ '--panel-art': `url("${SEASON7_ART}")` }}
          aria-hidden={active !== 0}
        >
          <div className="home-backdrop" />
          <div className="home-center home-stage-copy">
            <Brand size={86} showWord={false} />
            <p className="home-overline">PROJECT ZERO · XBOX DEV MODE</p>
            <h1>
              RETURN TO
              <span>SEASON 7</span>
            </h1>
            <p className="home-intro">
              A preservation launcher for Fortnite 7.00 on Xbox Developer Mode. Link the console,
              verify your authorised build and continue into the client handoff.
            </p>
            <div className="home-actions">
              <Link href="/link" className="home-primary">LINK CONSOLE</Link>
              <Link href="/downloads" className="home-secondary">DOWNLOADS</Link>
            </div>
          </div>
          <button className="home-scroll-cue" type="button" onClick={() => moveTo(1)} aria-label="Move to next section">
            <span>SCROLL</span><i />
          </button>
        </section>

        <section className={`home-panel home-panel-season ${active === 1 ? 'is-active' : ''}`} aria-hidden={active !== 1}>
          <div className="home-season-media" style={{ '--panel-art': `url("${SEASON7_ART}")` }}>
            <div className="home-season-tag">CHAPTER 1</div>
          </div>
          <div className="home-season-copy home-stage-copy">
            <p className="home-overline">TARGET BUILD</p>
            <h2>SEASON<br /><span>SEVEN</span></h2>
            <p>
              Project Zero targets Fortnite <strong>7.00</strong>, build <strong>CL-4629139</strong>.
              Game content remains separate from the launcher and is verified before the Xbox client uses it.
            </p>
            <dl className="home-facts">
              <div><dt>Version</dt><dd>7.00</dd></div>
              <div><dt>Build</dt><dd>CL-4629139</dd></div>
              <div><dt>Platform</dt><dd>Xbox Dev Mode · x64</dd></div>
            </dl>
            <Link href="/downloads" className="home-text-link">OPEN DOWNLOADS →</Link>
          </div>
        </section>

        <section className={`home-panel home-panel-process ${active === 2 ? 'is-active' : ''}`} aria-hidden={active !== 2}>
          <div className="home-process-wrap home-stage-copy">
            <div className="home-process-head">
              <p className="home-overline">HOW IT WORKS</p>
              <h2>INSTALL.<br />LINK. PLAY.</h2>
            </div>
            <div className="home-process-list">
              <article>
                <span>01</span>
                <div><h3>INSTALL</h3><p>Install the signed Project Zero UWP package through Xbox Developer Mode.</p></div>
              </article>
              <article>
                <span>02</span>
                <div><h3>LINK</h3><p>Enter the six-character code shown by the launcher to bind your console.</p></div>
              </article>
              <article>
                <span>03</span>
                <div><h3>LAUNCH</h3><p>Verify the local Season 7 files, create a session and hand it to the Xbox client.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section
          className={`home-panel home-panel-final ${active === 3 ? 'is-active' : ''}`}
          style={{ '--panel-art': `url("${SEASON7_ART}")` }}
          aria-hidden={active !== 3}
        >
          <div className="home-backdrop home-backdrop-final" />
          <div className="home-center home-final-copy home-stage-copy">
            <Brand size={74} showWord={false} />
            <p className="home-overline">PROJECT ZERO</p>
            <h2>READY WHEN<br />YOUR XBOX IS.</h2>
            <p>
              Get the launcher, link your console and continue from there. Project Zero is independent and
              is not affiliated with Epic Games or Microsoft.
            </p>
            <div className="home-actions">
              <Link href="/downloads" className="home-primary">DOWNLOADS</Link>
              <Link href="/link" className="home-secondary">LINK CONSOLE</Link>
            </div>
          </div>
        </section>
      </div>

      <nav className="home-pager" aria-label="Homepage sections">
        {['Intro', 'Season 7', 'How it works', 'Start'].map((label, index) => (
          <button
            type="button"
            key={label}
            className={index === active ? 'active' : ''}
            onClick={() => moveTo(index)}
            aria-label={label}
            aria-current={index === active ? 'true' : undefined}
          />
        ))}
      </nav>
    </div>
  );
}

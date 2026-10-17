'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Brand from '@/components/Brand';

const SEASON7_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fblog%2Ftake-to-the-skies-in-season-7%2FBR07_News_Featured_16_9-1920x1080-c8c58d82b2986bf9615c839d53bb7763c06895c5.jpg';

export default function Home() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const shadeRef = useRef(null);
  const topTextRef = useRef(null);
  const leftTextRef = useRef(null);
  const bottomTextRef = useRef(null);
  const finalRef = useRef(null);
  const hintRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let release = () => {};

    (async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      if (disposed) return;

      const gsap = gsapModule.gsap || gsapModule.default;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      const hero = heroRef.current;
      const frame = frameRef.current;
      if (!root || !hero || !frame) return;

      const context = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
          const coverScale = () => {
            const width = Math.max(frame.offsetWidth, 1);
            const height = Math.max(frame.offsetHeight, 1);
            return Math.max(window.innerWidth / width, window.innerHeight / height) * 1.045;
          };

          gsap.set(frame, {
            transformOrigin: '50% 50%',
            force3D: true
          });

          const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: () => `+=${Math.round(window.innerHeight * 2.7)}`,
              pin: true,
              pinSpacing: true,
              scrub: 0.72,
              anticipatePin: 1,
              invalidateOnRefresh: true
            }
          });

          timeline
            .to(frame, {
              scale: coverScale,
              borderRadius: 0,
              boxShadow: '0 0 0 rgba(0,0,0,0)',
              duration: 1
            }, 0)
            .to(imageRef.current, {
              scale: 1.12,
              duration: 1
            }, 0)
            .to(shadeRef.current, {
              opacity: 0.18,
              duration: 0.88
            }, 0.08)
            .to(topTextRef.current, {
              yPercent: -95,
              xPercent: -10,
              scale: 1.52,
              opacity: 0,
              filter: 'blur(8px)',
              duration: 0.72
            }, 0.1)
            .to(leftTextRef.current, {
              xPercent: -120,
              scale: 1.45,
              opacity: 0,
              filter: 'blur(7px)',
              duration: 0.72
            }, 0.12)
            .to(bottomTextRef.current, {
              yPercent: 105,
              xPercent: 12,
              scale: 1.58,
              opacity: 0,
              filter: 'blur(9px)',
              duration: 0.72
            }, 0.1)
            .to(hintRef.current, {
              opacity: 0,
              y: 20,
              duration: 0.3
            }, 0.05)
            .fromTo(finalRef.current,
              { opacity: 0, y: 42, scale: 0.9 },
              { opacity: 1, y: 0, scale: 1, duration: 0.28 },
              0.72
            );

          return () => timeline.scrollTrigger?.kill();
        });

        mm.add('(prefers-reduced-motion: reduce)', () => {
          gsap.set(finalRef.current, { opacity: 1, y: 0, scale: 1 });
        });

        return () => mm.revert();
      }, root);

      ScrollTrigger.refresh();
      release = () => context.revert();
    })();

    return () => {
      disposed = true;
      release();
    };
  }, []);

  return (
    <div ref={rootRef} className="cinematic-home">
      <section ref={heroRef} className="zoom-pin" aria-label="Project Zero Season 7 introduction">
        <div
          className="zoom-ambient"
          aria-hidden="true"
          style={{ '--season-art': `url("${SEASON7_ART}")` }}
        />
        <div className="zoom-vignette" aria-hidden="true" />

        <div ref={topTextRef} className="zoom-copy zoom-copy-top" aria-hidden="true">
          <span>PROJECT</span>
          <strong>ZERO</strong>
        </div>

        <div ref={leftTextRef} className="zoom-copy zoom-copy-left" aria-hidden="true">
          XBOX DEV MODE
        </div>

        <div ref={bottomTextRef} className="zoom-copy zoom-copy-bottom" aria-hidden="true">
          <span>SEASON</span>
          <strong>SEVEN</strong>
        </div>

        <div className="portal-wrap">
          <div ref={frameRef} className="portal-frame">
            <img
              ref={imageRef}
              className="portal-image"
              src={SEASON7_ART}
              alt="Fortnite Chapter 1 Season 7 promotional artwork"
            />
            <div ref={shadeRef} className="portal-shade" />
            <div className="portal-meta portal-meta-top">
              <span>PROJECT ZERO</span>
              <span>7.00 / CL-4629139</span>
            </div>
            <div className="portal-meta portal-meta-bottom">
              <span>CHAPTER 1</span>
              <span>SEASON 7</span>
            </div>

            <div ref={finalRef} className="portal-final">
              <Brand size={76} showWord={false} />
              <p className="portal-kicker">PROJECT ZERO</p>
              <h1>DROP BACK IN.</h1>
              <p>
                Season 7 · v7.00 · CL-4629139<br />
                Xbox Developer Mode
              </p>
              <div className="portal-actions">
                <Link href="/downloads" className="portal-button portal-button-primary">DOWNLOADS</Link>
                <Link href="/link" className="portal-button">LINK CONSOLE</Link>
              </div>
            </div>
          </div>
        </div>

        <div ref={hintRef} className="zoom-scroll-hint" aria-hidden="true">
          <span>SCROLL TO ENTER</span>
          <i />
        </div>
      </section>

      <section className="post-hero post-hero-intro">
        <div className="post-hero-grid">
          <div>
            <p className="post-eyebrow">PROJECT ZERO / 01</p>
            <h2>SEASON 7.<br />ON XBOX DEV MODE.</h2>
          </div>
          <div className="post-copy">
            <p>
              Project Zero is focused on the archived Fortnite 7.00 client. The launcher handles account linking,
              content verification and the handoff into the Xbox-side client work.
            </p>
            <div className="post-stats">
              <div><span>VERSION</span><strong>7.00</strong></div>
              <div><span>BUILD</span><strong>CL-4629139</strong></div>
              <div><span>PLATFORM</span><strong>XBOX · X64</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="post-hero post-hero-image" style={{ '--season-art': `url("${SEASON7_ART}")` }}>
        <div className="post-image-shade" />
        <div className="post-image-copy">
          <p className="post-eyebrow">PROJECT ZERO / 02</p>
          <h2>INSTALL.<br />LINK.<br />LAUNCH.</h2>
          <p>When the signed UWP package is ready, it will live on the Downloads page.</p>
          <Link href="/downloads" className="portal-button portal-button-primary">OPEN DOWNLOADS</Link>
        </div>
      </section>
    </div>
  );
}

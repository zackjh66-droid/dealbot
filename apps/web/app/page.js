'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Brand from '@/components/Brand';
import styles from './page.module.css';

const SEASON7_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fblog%2Ftake-to-the-skies-in-season-7%2FBR07_News_Featured_16_9-1920x1080-c8c58d82b2986bf9615c839d53bb7763c06895c5.jpg';

const STORMWING_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fpatch-notes%2Fv7-00%2Foverview-text-v7-00%2FBR07_Social_Stormwing-1920x1080-8ca2d8dab3afdb8d23f41993b718edd0db5a57ce.jpg';

const WRAPS_ART =
  'https://cdn2.unrealengine.com/Fortnite%2Fpatch-notes%2Fv7-00%2Foverview-text-v7-00%2FBR07_Social_Wraps-1920x1080-d705ed4633562dbb5efcb1803684b9e09f797e61.jpg';

const FLOW = [
  {
    n: '01',
    title: 'INSTALL',
    body: 'Install the x64 Project Zero UWP and its required dependencies through Xbox Developer Mode.',
    foot: 'PACKAGE TYPE · GAME, NOT APP'
  },
  {
    n: '02',
    title: 'LINK',
    body: 'Generate a short link code on Xbox, then claim the console session from the Project Zero website.',
    foot: 'DEVICE CODE · QR · SESSION'
  },
  {
    n: '03',
    title: 'FETCH',
    body: 'The launcher reads the finalized Season 7 manifest and restores the authorized content tree on console.',
    foot: 'ENGINE / FORTNITEGAME'
  },
  {
    n: '04',
    title: 'VERIFY',
    body: 'Files are checked against their expected sizes and SHA-256 values before Project Zero marks the build ready.',
    foot: '7.00 · CL-4629139'
  },
  {
    n: '05',
    title: 'HANDOFF',
    body: 'The verified build is handed to the Xbox-side Project Zero client work rather than pretending a desktop EXE can run as UWP.',
    foot: 'CLEAN-ROOM XBOX RUNTIME'
  }
];

export default function Home() {
  const rootRef = useRef(null);

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
      if (!root) return;

      const context = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(min-width: 721px) and (prefers-reduced-motion: no-preference)', () => {
          const hero = root.querySelector('[data-hero]');
          const heroFrame = root.querySelector('[data-hero-frame]');
          const heroImage = root.querySelector('[data-hero-image]');
          const heroFinal = root.querySelector('[data-hero-final]');
          const heroBg = root.querySelector('[data-hero-bg]');
          const heroCopies = gsap.utils.toArray('[data-hero-copy]', root);
          const scrollHint = root.querySelector('[data-scroll-hint]');

          if (hero && heroFrame) {
            const coverScale = () => {
              const width = Math.max(heroFrame.offsetWidth, 1);
              const height = Math.max(heroFrame.offsetHeight, 1);
              return Math.max(window.innerWidth / width, window.innerHeight / height) * 1.08;
            };

            const heroTl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: hero,
                start: 'top top',
                end: () => `+=${Math.round(window.innerHeight * 2.45)}`,
                pin: true,
                pinSpacing: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true
              }
            });

            heroTl
              .to(heroBg, { scale: 1.12, yPercent: 3, duration: 1 }, 0)
              .to(heroFrame, {
                scale: coverScale,
                rotateX: 0,
                rotateY: 0,
                boxShadow: '0 0 0 rgba(0,0,0,0)',
                duration: 1
              }, 0)
              .to(heroImage, { scale: 1.12, duration: 1 }, 0)
              .to(heroCopies[0], { xPercent: -35, yPercent: -90, z: 320, opacity: 0, duration: .58 }, .08)
              .to(heroCopies[1], { xPercent: 25, yPercent: 88, z: 340, opacity: 0, duration: .58 }, .08)
              .to(scrollHint, { opacity: 0, y: 20, duration: .25 }, .05)
              .fromTo(heroFinal,
                { opacity: 0, y: 60, z: -180, scale: .86 },
                { opacity: 1, y: 0, z: 120, scale: 1, duration: .34 },
                .7
              );
          }

          const scenes = gsap.utils.toArray('[data-depth-scene]', root);
          scenes.forEach((scene, index) => {
            const bg = scene.querySelector('[data-scene-bg]');
            const title = scene.querySelector('[data-scene-title]');
            const panel = scene.querySelector('[data-scene-panel]');
            const marker = scene.querySelector('[data-scene-marker]');

            const tl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: scene,
                start: 'top top',
                end: () => `+=${Math.round(window.innerHeight * 1.45)}`,
                pin: true,
                pinSpacing: true,
                scrub: 0.9,
                anticipatePin: 1,
                invalidateOnRefresh: true
              }
            });

            tl
              .fromTo(bg,
                { scale: 1.2, xPercent: index % 2 === 0 ? -3 : 3, rotateZ: index % 2 === 0 ? -1.1 : 1.1 },
                { scale: .98, xPercent: index % 2 === 0 ? 3 : -3, rotateZ: 0, duration: 1 },
                0
              )
              .fromTo(title,
                { y: 180, z: -280, rotateX: 14, opacity: .08 },
                { y: 0, z: 105, rotateX: 0, opacity: 1, duration: .42 },
                0
              )
              .to(title, { y: -100, z: 300, rotateX: -7, opacity: .12, duration: .42 }, .58)
              .fromTo(panel,
                { y: 130, z: -190, rotateY: index % 2 === 0 ? -10 : 10, opacity: 0 },
                { y: 0, z: 75, rotateY: 0, opacity: 1, duration: .44 },
                .14
              )
              .to(panel, { y: -36, z: 180, opacity: .45, duration: .3 }, .69)
              .fromTo(marker, { opacity: 0, x: 35 }, { opacity: 1, x: 0, duration: .25 }, .05)
              .to(marker, { opacity: .18, x: -30, duration: .28 }, .72);
          });

          const flow = root.querySelector('[data-flow]');
          const flowTrack = root.querySelector('[data-flow-track]');
          const flowCards = gsap.utils.toArray('[data-flow-card]', root);
          if (flow && flowTrack && flowCards.length) {
            gsap.set(flowCards, {
              rotateY: (i) => (i % 2 ? -7 : 7),
              z: (i) => -35 * i,
              transformOrigin: '50% 50%'
            });

            const travel = () => Math.max(0, flowTrack.scrollWidth - window.innerWidth + window.innerWidth * .1);
            const flowTl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: flow,
                start: 'top top',
                end: () => `+=${Math.round(window.innerHeight * 2.6)}`,
                pin: true,
                pinSpacing: true,
                scrub: .9,
                anticipatePin: 1,
                invalidateOnRefresh: true
              }
            });

            flowTl
              .to(flowTrack, { x: () => -travel(), duration: 1 }, 0)
              .to(flowCards, { rotateY: 0, z: 90, stagger: .045, duration: .38 }, .06)
              .to(flowCards, { z: -70, opacity: .5, stagger: .04, duration: .32 }, .66);
          }

          const gallery = root.querySelector('[data-gallery]');
          const galleryCards = gsap.utils.toArray('[data-gallery-card]', root);
          if (gallery && galleryCards.length) {
            const galleryTl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: gallery,
                start: 'top top',
                end: () => `+=${Math.round(window.innerHeight * 1.8)}`,
                pin: true,
                pinSpacing: true,
                scrub: .92,
                anticipatePin: 1
              }
            });

            galleryTl
              .fromTo(galleryCards[0], { xPercent: -35, yPercent: 20, z: -420, rotateY: 18, rotateX: 9, opacity: .15 }, { xPercent: 0, yPercent: 0, z: 90, rotateY: -3, rotateX: 0, opacity: 1, duration: .45 }, 0)
              .fromTo(galleryCards[1], { xPercent: 40, yPercent: -25, z: -520, rotateY: -22, rotateX: -8, opacity: .1 }, { xPercent: 0, yPercent: 0, z: 40, rotateY: 4, rotateX: 0, opacity: 1, duration: .45 }, .06)
              .fromTo(galleryCards[2], { xPercent: 35, yPercent: 35, z: -620, rotateY: -14, rotateX: 11, opacity: .08 }, { xPercent: 0, yPercent: 0, z: 130, rotateY: -4, rotateX: 0, opacity: 1, duration: .45 }, .12)
              .to(galleryCards[0], { xPercent: -24, z: 360, rotateY: -12, opacity: .25, duration: .38 }, .62)
              .to(galleryCards[1], { yPercent: -24, z: 320, rotateX: 10, opacity: .22, duration: .38 }, .64)
              .to(galleryCards[2], { xPercent: 24, yPercent: 20, z: 400, rotateY: 12, opacity: .24, duration: .38 }, .62);
          }

          const final = root.querySelector('[data-final]');
          const finalBg = root.querySelector('[data-final-bg]');
          const finalContent = root.querySelector('[data-final-content]');
          if (final && finalContent) {
            const finalTl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: final,
                start: 'top top',
                end: () => `+=${Math.round(window.innerHeight * 1.1)}`,
                pin: true,
                scrub: .8,
                anticipatePin: 1
              }
            });
            finalTl
              .fromTo(finalBg, { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
              .fromTo(finalContent, { z: -380, scale: .74, opacity: .05 }, { z: 120, scale: 1, opacity: 1, duration: .62 }, .04)
              .to(finalContent, { z: 260, scale: 1.04, duration: .38 }, .62);
          }
        });

        mm.add('(max-width: 720px) and (prefers-reduced-motion: no-preference)', () => {
          const reveals = gsap.utils.toArray('[data-mobile-reveal]', root);
          reveals.forEach((item) => {
            gsap.fromTo(item,
              { y: 46, opacity: .35 },
              {
                y: 0,
                opacity: 1,
                duration: .8,
                ease: 'power2.out',
                scrollTrigger: { trigger: item, start: 'top 84%', once: true }
              }
            );
          });
        });

        mm.add('(prefers-reduced-motion: reduce)', () => {
          gsap.set('[data-hero-final], [data-mobile-reveal]', { opacity: 1, y: 0, scale: 1 });
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
    <main ref={rootRef} className={styles.home}>
      <section className={styles.hero} data-hero aria-label="Project Zero Season 7 introduction">
        <img className={styles.heroBg} data-hero-bg src={SEASON7_ART} alt="" aria-hidden="true" />
        <div className={styles.heroShade} />
        <div className={styles.heroNoise} />
        <div className={styles.heroIndex} aria-hidden="true">07</div>

        <div className={styles.heroRail}>
          <span>PROJECT ZERO / CHAPTER 1 ARCHIVE</span>
          <span>7.00 · CL-4629139</span>
        </div>

        <div className={styles.heroWords} aria-hidden="true">
          <div className={styles.heroWordsTop} data-hero-copy>
            <span>PROJECT</span>
            <strong>ZERO</strong>
          </div>
          <div className={styles.heroWordsBottom} data-hero-copy>
            <span>SEASON</span>
            <strong>SEVEN</strong>
          </div>
        </div>

        <div className={styles.portal} data-hero-frame>
          <img
            className={styles.portalImage}
            data-hero-image
            src={SEASON7_ART}
            alt="Fortnite Chapter 1 Season 7 promotional artwork"
          />
          <div className={styles.portalOverlay} />
          <div className={`${styles.portalMeta} ${styles.portalMetaTop}`}>
            <span>PROJECT ZERO</span>
            <span>XBOX DEV MODE</span>
          </div>
          <div className={`${styles.portalMeta} ${styles.portalMetaBottom}`}>
            <span>CHAPTER 1</span>
            <span>DECEMBER 2018 · BUILD 7.00</span>
          </div>

          <div className={styles.portalFinal} data-hero-final>
            <Brand size={72} showWord={false} />
            <p className={styles.portalKicker}>PROJECT ZERO / XBOX</p>
            <h1>DROP BACK IN.</h1>
            <p>Season 7 · v7.00 · CL-4629139<br />Built around Xbox Developer Mode.</p>
            <div className={styles.actions}>
              <Link href="/downloads" className={`${styles.button} ${styles.buttonPrimary}`}>Downloads</Link>
              <Link href="/link" className={styles.button}>Link Console</Link>
            </div>
          </div>
        </div>

        <div className={styles.scrollHint} data-scroll-hint aria-hidden="true">
          <span>Scroll to descend</span>
          <i />
        </div>
      </section>

      <section className={styles.scene} data-depth-scene data-mobile-reveal>
        <img className={styles.sceneBg} data-scene-bg src={STORMWING_ART} alt="Fortnite Season 7 X-4 Stormwing promotional artwork" />
        <div className={styles.sceneShade} />
        <div className={styles.sceneGrid} />
        <div className={styles.sceneMarker} data-scene-marker>01 / THE ERA</div>

        <div className={styles.sceneInner}>
          <div className={styles.sceneCopy}>
            <p className={styles.sceneLabel}>FORTNITE 7.00 / DEC 2018</p>
            <h2 className={styles.sceneTitle} data-scene-title>
              THE ISLAND<br /><span className={styles.sceneTitleOutline}>FROZE OVER.</span>
            </h2>
          </div>
          <aside className={styles.scenePanel} data-scene-panel>
            <h3>Season 7 changed the map.</h3>
            <p>
              Frosty Flights, Polar Peak, Happy Hamlet, ziplines and the X-4 Stormwing defined the opening of Chapter 1 Season 7.
              Project Zero targets the original 7.00 / CL-4629139 build.
            </p>
            <div className={styles.sceneFacts}>
              <div><span>Version</span><strong>7.00</strong></div>
              <div><span>Target</span><strong>Xbox x64</strong></div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.scene} data-depth-scene data-mobile-reveal>
        <img className={styles.sceneBg} data-scene-bg src={WRAPS_ART} alt="Fortnite Season 7 Wraps promotional artwork" />
        <div className={styles.sceneShade} />
        <div className={styles.sceneGrid} />
        <div className={styles.sceneMarker} data-scene-marker>02 / THE BUILD</div>

        <div className={styles.sceneInner}>
          <div className={styles.sceneCopy}>
            <p className={styles.sceneLabel}>PROJECT ZERO / CLEAN-ROOM ROUTE</p>
            <h2 className={styles.sceneTitle} data-scene-title>
              NOT A SKIN.<br /><span className={styles.sceneTitleOutline}>A SYSTEM.</span>
            </h2>
          </div>
          <aside className={styles.scenePanel} data-scene-panel>
            <h3>More than a launcher screen.</h3>
            <p>
              Account linking, private content delivery, integrity checks and Xbox-side handoff are separate parts of one pipeline.
              The site and UWP are designed around that flow instead of pretending the Windows client can simply be opened on Xbox.
            </p>
            <div className={styles.sceneFacts}>
              <div><span>Content</span><strong>Private</strong></div>
              <div><span>Checks</span><strong>SHA-256</strong></div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.flow} data-flow data-mobile-reveal>
        <div className={styles.flowHead}>
          <div>
            <p className={styles.kicker}>PROJECT ZERO / 03</p>
            <h2>THE ROUTE<br />BACK.</h2>
          </div>
          <p>
            The homepage now follows the project itself: every scroll stage advances through the Xbox path instead of ending after one hero trick.
          </p>
        </div>

        <div className={styles.flowViewport}>
          <div className={styles.flowTrack} data-flow-track>
            {FLOW.map((step) => (
              <article className={styles.flowCard} data-flow-card key={step.n}>
                <p className={styles.stepNumber}>{step.n} / 05</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <small>{step.foot}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.gallery} data-gallery data-mobile-reveal>
        <div className={styles.galleryHead}>
          <p className={styles.kicker}>PROJECT ZERO / 04</p>
          <h2>SEASON 7<br />IN FRAME.</h2>
          <p>
            Original Season 7 promotional imagery is used as the visual language of the site, with the interface kept deliberately sharp and editorial rather than generic dashboard glass cards.
          </p>
        </div>

        <div className={styles.galleryStage}>
          <figure className={`${styles.galleryCard} ${styles.galleryCardOne}`} data-gallery-card>
            <img src={SEASON7_ART} alt="Season 7 key art" />
            <figcaption className={styles.galleryCaption}>
              <span className={styles.galleryLabel}>01 / KEY ART</span>
              <strong>Take to<br />the skies</strong>
            </figcaption>
          </figure>

          <figure className={`${styles.galleryCard} ${styles.galleryCardTwo}`} data-gallery-card>
            <img src={STORMWING_ART} alt="Season 7 Stormwing artwork" />
            <figcaption className={styles.galleryCaption}>
              <span className={styles.galleryLabel}>02 / STORMWING</span>
              <strong>X-4</strong>
            </figcaption>
          </figure>

          <figure className={`${styles.galleryCard} ${styles.galleryCardThree}`} data-gallery-card>
            <img src={WRAPS_ART} alt="Season 7 Wraps artwork" />
            <figcaption className={styles.galleryCaption}>
              <span className={styles.galleryLabel}>03 / WRAPS</span>
              <strong>7.00</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.final} data-final data-mobile-reveal>
        <img className={styles.finalBg} data-final-bg src={SEASON7_ART} alt="" aria-hidden="true" />
        <div className={styles.finalShade} />
        <div className={styles.finalContent} data-final-content>
          <Brand size={92} showWord={false} />
          <p className={styles.finalKicker}>PROJECT ZERO / SEASON 7</p>
          <h2>ENTER<br />ZERO.</h2>
          <p className={styles.finalCopy}>
            Download the Xbox UWP, set the package type to <strong>GAME</strong> in Developer Mode, then link the console from the web control plane.
          </p>
          <div className={styles.finalRule} />
          <div className={styles.actions}>
            <Link href="/downloads" className={`${styles.button} ${styles.buttonPrimary}`}>Get the UWP</Link>
            <Link href="/link" className={styles.button}>Link Xbox</Link>
            <Link href="/builds" className={styles.button}>Build Status</Link>
          </div>
          <p className={styles.disclaimer}>Fan preservation / compatibility project · not affiliated with Epic Games</p>
        </div>
      </section>
    </main>
  );
}

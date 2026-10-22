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
  ['INSTALL', 'Install the x64 Project Zero UWP and its dependencies in Xbox Developer Mode.', 'SET PACKAGE TYPE TO GAME'],
  ['LINK', 'Generate the console code, then claim the Xbox session from the Project Zero website.', 'DEVICE CODE · QR · SESSION'],
  ['FETCH', 'The launcher reads a finalized private manifest and restores authorised content to the console.', 'ENGINE / FORTNITEGAME'],
  ['VERIFY', 'Expected file sizes and SHA-256 values are checked before the build is marked ready.', '7.00 · CL-4629139'],
  ['HANDOFF', 'Verified content is handed to the Xbox-side Project Zero client workflow.', 'CLEAN-ROOM XBOX ROUTE']
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
          const story = root.querySelector('[data-story]');
          const scenes = gsap.utils.toArray('[data-story-scene]', root);
          if (!story || scenes.length < 2) return;

          gsap.set(scenes, { autoAlpha: 0, scale: .965, z: -90, transformPerspective: 1500 });
          gsap.set(scenes[0], { autoAlpha: 1, scale: 1, z: 0 });

          scenes.forEach((scene, index) => {
            const pops = gsap.utils.toArray('[data-pop]', scene);
            if (index === 0) gsap.set(pops, { opacity: 1, y: 0, z: 0, rotateX: 0 });
            else gsap.set(pops, { opacity: 0, y: 74, z: -150, rotateX: 7, transformPerspective: 1200 });
          });

          const timeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: story,
              start: 'top 68px',
              end: () => `+=${Math.round(window.innerHeight * 7.3)}`,
              pin: true,
              pinSpacing: true,
              scrub: .68,
              anticipatePin: 1,
              invalidateOnRefresh: true
            }
          });

          const heroBg = scenes[0].querySelector('[data-scene-bg]');
          const heroPortal = scenes[0].querySelector('[data-hero-portal]');
          const heroWords = gsap.utils.toArray('[data-hero-word]', scenes[0]);
          const heroGlass = scenes[0].querySelector('[data-hero-glass]');

          timeline
            .to(heroBg, { scale: 1.14, xPercent: -2, duration: .92 }, 0)
            .to(heroPortal, { scale: 1.115, z: 190, rotateY: 0, rotateX: 0, duration: .78 }, 0)
            .to(heroWords[0], { xPercent: -19, yPercent: -35, z: 240, opacity: .13, duration: .58 }, .18)
            .to(heroWords[1], { xPercent: 19, yPercent: 34, z: 270, opacity: .11, duration: .58 }, .18)
            .fromTo(heroGlass, { y: 46, opacity: .18, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .4 }, .27);

          scenes.slice(1).forEach((scene, offset) => {
            const index = offset + 1;
            const previous = scenes[index - 1];
            const at = index * 1.03;
            const bg = scene.querySelector('[data-scene-bg]');
            const pops = gsap.utils.toArray('[data-pop]', scene);
            const cards = gsap.utils.toArray('[data-stagger-card]', scene);

            timeline
              .to(previous, {
                autoAlpha: 0,
                scale: 1.075,
                z: 230,
                filter: 'blur(13px)',
                duration: .29
              }, at - .18)
              .fromTo(scene,
                { autoAlpha: 0, scale: .89, z: -270, filter: 'blur(21px)' },
                { autoAlpha: 1, scale: 1, z: 0, filter: 'blur(0px)', duration: .43 },
                at
              );

            if (bg) {
              timeline.fromTo(bg,
                { scale: 1.2, xPercent: index % 2 ? -3.5 : 3.5 },
                { scale: 1.025, xPercent: index % 2 ? 2 : -2, duration: .9 },
                at
              );
            }

            if (pops.length) {
              timeline.to(pops, {
                opacity: 1,
                y: 0,
                z: 0,
                rotateX: 0,
                stagger: .05,
                duration: .35,
                ease: 'power2.out'
              }, at + .08);
            }

            if (cards.length) {
              timeline.fromTo(cards,
                {
                  y: (i) => 105 + i * 12,
                  z: (i) => -260 - i * 45,
                  rotateY: (i) => (i % 2 ? -10 : 10),
                  rotateX: 8,
                  opacity: 0,
                  transformPerspective: 1300
                },
                {
                  y: 0,
                  z: 0,
                  rotateY: 0,
                  rotateX: 0,
                  opacity: 1,
                  stagger: .06,
                  duration: .43,
                  ease: 'power3.out'
                },
                at + .15
              );
            }
          });

          const galleryCards = gsap.utils.toArray('[data-gallery-card]', root);
          if (galleryCards.length) {
            const at = 4.22;
            timeline
              .fromTo(galleryCards[0], { xPercent: -30, yPercent: 20, rotateY: 15, z: -280 }, { xPercent: 0, yPercent: 0, rotateY: -3, z: 82, duration: .49 }, at)
              .fromTo(galleryCards[1], { yPercent: -25, rotateX: -11, z: -360 }, { yPercent: 0, rotateX: 2, z: 26, duration: .49 }, at + .06)
              .fromTo(galleryCards[2], { xPercent: 30, yPercent: 18, rotateY: -15, z: -420 }, { xPercent: 0, yPercent: 0, rotateY: 3, z: 102, duration: .49 }, at + .12);
          }

          return () => timeline.scrollTrigger?.kill();
        });

        mm.add('(max-width: 720px) and (prefers-reduced-motion: no-preference)', () => {
          gsap.utils.toArray('[data-story-scene]', root).forEach((scene) => {
            gsap.fromTo(scene,
              { y: 52, opacity: .35 },
              {
                y: 0,
                opacity: 1,
                duration: .8,
                ease: 'power2.out',
                scrollTrigger: { trigger: scene, start: 'top 85%', once: true }
              }
            );
          });
        });

        mm.add('(prefers-reduced-motion: reduce)', () => {
          gsap.set('[data-story-scene], [data-pop], [data-stagger-card]', {
            clearProps: 'all',
            opacity: 1,
            visibility: 'visible'
          });
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
      <section className={styles.story} data-story aria-label="Project Zero Season 7 story">
        <article className={`${styles.scene} ${styles.heroScene}`} data-story-scene>
          <img className={styles.sceneBg} data-scene-bg src={SEASON7_ART} alt="" aria-hidden="true" />
          <div className={styles.deepShade} />
          <div className={styles.iceGlow} />
          <div className={styles.liquidOrb} aria-hidden="true" />

          <div className={styles.heroRail} data-pop>
            <span>PROJECT ZERO / CHAPTER 1 ARCHIVE</span>
            <span>7.00 · CL-4629139</span>
          </div>

          <div className={styles.heroWords} aria-hidden="true">
            <div data-hero-word><span>PROJECT</span><strong>ZERO</strong></div>
            <div data-hero-word><span>SEASON</span><strong>SEVEN</strong></div>
          </div>

          <div className={styles.heroPortal} data-hero-portal>
            <img src={SEASON7_ART} alt="Fortnite Chapter 1 Season 7 promotional artwork" />
            <div className={styles.heroPortalShade} />
            <div className={styles.portalEdge} />
          </div>

          <div className={`${styles.liquidGlass} ${styles.heroGlass}`} data-hero-glass data-pop data-pz-interactive>
            <div className={styles.glassBrand}><Brand size={56} showWord={false} /></div>
            <p className={styles.kicker}>PROJECT ZERO / XBOX DEV MODE</p>
            <h1>DROP BACK IN.</h1>
            <p>Season 7 · v7.00 · CL-4629139<br />A preservation-focused Xbox Developer Mode project.</p>
            <div className={styles.actions}>
              <Link href="/downloads" className={`${styles.button} ${styles.buttonPrimary}`} data-pz-interactive>Downloads</Link>
              <Link href="/link" className={styles.button} data-pz-interactive>Link Console</Link>
            </div>
          </div>
        </article>

        <article className={`${styles.scene} ${styles.featureScene}`} data-story-scene>
          <img className={styles.sceneBg} data-scene-bg src={STORMWING_ART} alt="Fortnite Season 7 X-4 Stormwing promotional artwork" />
          <div className={styles.deepShade} />
          <div className={styles.featureCopy}>
            <p className={styles.kicker} data-pop>DECEMBER 2018 / VERSION 7.00</p>
            <h2 data-pop>THE SKY<br /><span>OPENED.</span></h2>
          </div>
          <aside className={`${styles.liquidGlass} ${styles.featurePanel}`} data-pop data-pz-interactive>
            <span className={styles.panelLabel}>SEASON 7 / THE ERA</span>
            <h3>Iceberg. Stormwing. A changed island.</h3>
            <p>Frosty Flights, Polar Peak, Happy Hamlet, ziplines and the X-4 Stormwing were part of the 7.00 launch. Project Zero targets that original build line.</p>
            <div className={styles.miniStats}>
              <div><span>VERSION</span><strong>7.00</strong></div>
              <div><span>BUILD</span><strong>4629139</strong></div>
              <div><span>PLATFORM</span><strong>XBOX x64</strong></div>
            </div>
          </aside>
        </article>

        <article className={`${styles.scene} ${styles.systemScene}`} data-story-scene>
          <img className={styles.sceneBg} data-scene-bg src={WRAPS_ART} alt="Fortnite Season 7 Wraps promotional artwork" />
          <div className={styles.deepShade} />
          <div className={styles.featureCopy}>
            <p className={styles.kicker} data-pop>PROJECT ZERO / THE SYSTEM</p>
            <h2 data-pop>NOT JUST<br /><span>A LAUNCHER.</span></h2>
          </div>
          <aside className={`${styles.liquidGlass} ${styles.featurePanel} ${styles.featurePanelRight}`} data-pop data-pz-interactive>
            <span className={styles.panelLabel}>AUTH · CONTENT · VERIFY · HANDOFF</span>
            <h3>Every step is its own layer.</h3>
            <p>Console linking, private content delivery, integrity checks and the Xbox-side handoff are treated as separate parts of the pipeline.</p>
            <div className={styles.signalRows}>
              <span><i /> PRIVATE CONTENT</span>
              <span><i /> SHA-256 VERIFY</span>
              <span><i /> CONTROLLER FIRST</span>
            </div>
          </aside>

          <div className="pz-fn-lobby" data-pop data-pz-interactive aria-label="Season 7 inspired Project Zero interface preview">
            <div className="pz-fn-tabs"><b>PLAY</b><span>LOCKER</span><span>ITEM SHOP</span><span>CAREER</span></div>
            <div className="pz-fn-player">
              <div className="pz-fn-avatar">PZ</div>
              <div><strong>PROJECT ZERO</strong><small>SEASON 7 · XBOX</small></div>
            </div>
            <div className="pz-fn-mode">
              <small>SELECTED MODE</small>
              <strong>SEASON 7</strong>
              <span>7.00 · CL-4629139</span>
              <em>READY</em>
            </div>
          </div>
        </article>

        <article className={`${styles.scene} ${styles.flowScene}`} data-story-scene>
          <div className={styles.abstractBg} data-scene-bg />
          <div className={styles.deepShade} />
          <div className={styles.flowHeading}>
            <p className={styles.kicker} data-pop>PROJECT ZERO / XBOX ROUTE</p>
            <h2 data-pop>THE ROUTE<br /><span>BACK.</span></h2>
          </div>
          <div className={styles.flowGrid}>
            {FLOW.map(([title, body, foot]) => (
              <article key={title} className={`${styles.liquidGlass} ${styles.flowCard}`} data-stagger-card data-pz-interactive>
                <h3>{title}</h3>
                <p>{body}</p>
                <small>{foot}</small>
              </article>
            ))}
          </div>
        </article>

        <article className={`${styles.scene} ${styles.galleryScene}`} data-story-scene>
          <div className={styles.galleryBackdrop} data-scene-bg />
          <div className={styles.deepShade} />
          <div className={styles.galleryHeading}>
            <p className={styles.kicker} data-pop>OFFICIAL SEASON 7 ART</p>
            <h2 data-pop>SEASON 7<br /><span>IN FRAME.</span></h2>
          </div>
          <div className={styles.galleryStack}>
            <figure className={`${styles.galleryCard} ${styles.galleryOne}`} data-gallery-card data-stagger-card data-pz-interactive>
              <img src={SEASON7_ART} alt="Season 7 key art" />
              <figcaption><span>KEY ART</span><strong>TAKE TO THE SKIES</strong></figcaption>
            </figure>
            <figure className={`${styles.galleryCard} ${styles.galleryTwo}`} data-gallery-card data-stagger-card data-pz-interactive>
              <img src={STORMWING_ART} alt="Season 7 Stormwing art" />
              <figcaption><span>STORMWING</span><strong>X-4</strong></figcaption>
            </figure>
            <figure className={`${styles.galleryCard} ${styles.galleryThree}`} data-gallery-card data-stagger-card data-pz-interactive>
              <img src={WRAPS_ART} alt="Season 7 Wraps art" />
              <figcaption><span>WRAPS</span><strong>7.00</strong></figcaption>
            </figure>
          </div>
        </article>

        <article className={`${styles.scene} ${styles.finalScene}`} data-story-scene>
          <img className={styles.sceneBg} data-scene-bg src={SEASON7_ART} alt="" aria-hidden="true" />
          <div className={styles.finalShade} />
          <div className={styles.finalHalo} aria-hidden="true" />
          <div className={`${styles.liquidGlass} ${styles.finalGlass}`} data-pop data-pz-interactive>
            <Brand size={86} showWord={false} />
            <p className={styles.kicker}>PROJECT ZERO / SEASON 7</p>
            <h2>ENTER<br /><span>ZERO.</span></h2>
            <p>Install the Xbox UWP, set it as <strong>GAME</strong> in Developer Mode, then link the console from the web control plane.</p>
            <div className={styles.actions}>
              <Link href="/downloads" className={`${styles.button} ${styles.buttonPrimary}`} data-pz-interactive>Get the UWP</Link>
              <Link href="/link" className={styles.button} data-pz-interactive>Link Xbox</Link>
              <Link href="/preview/launcher" className={styles.button} data-pz-interactive>Launcher Preview</Link>
            </div>
            <small className={styles.disclaimer}>Fan preservation / compatibility project · not affiliated with Epic Games or Microsoft.</small>
          </div>
        </article>
      </section>
    </main>
  );
}
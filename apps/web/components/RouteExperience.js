'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function routeVariant(pathname = '/') {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/downloads')) return 'downloads';
  if (pathname.startsWith('/preview/launcher')) return 'launcher';
  if (pathname.startsWith('/link')) return 'link';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/builds')) return 'builds';
  return 'default';
}

function routeLabel(pathname = '/') {
  const variant = routeVariant(pathname);
  return {
    home: 'PROJECT ZERO',
    downloads: 'DOWNLOADS',
    launcher: 'XBOX LAUNCHER',
    link: 'LINK CONSOLE',
    account: 'ACCOUNT',
    builds: 'BUILD STATUS',
    default: 'PROJECT ZERO'
  }[variant];
}

function routeSubLabel(pathname = '/') {
  const variant = routeVariant(pathname);
  return {
    home: 'SEASON 7 · XBOX DEV MODE',
    downloads: 'SIGNED PACKAGES · GAME, NOT APP',
    launcher: 'CONTROLLER-FIRST CONSOLE SHELL',
    link: 'DEVICE CODE · QR · SESSION',
    account: 'PROFILE · DEVICES · SESSIONS',
    builds: '7.00 · CL-4629139',
    default: 'PROJECT ZERO · SEASON 7'
  }[variant];
}

export default function RouteExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const overlayRef = useRef(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      if (disposed) return;

      const gsap = gsapModule.gsap || gsapModule.default;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);

      const variant = routeVariant(pathname);
      document.body.dataset.route = variant;
      document.body.classList.remove('pz-route-leaving');
      lockedRef.current = false;

      const overlay = overlayRef.current;
      if (overlay) {
        const pieces = overlay.querySelectorAll('[data-transition-piece]');
        const ring = overlay.querySelector('[data-transition-ring]');
        const label = overlay.querySelector('[data-transition-label]');
        const sub = overlay.querySelector('[data-transition-sub]');
        const bar = overlay.querySelector('[data-transition-bar]');
        const media = overlay.querySelector('[data-transition-media]');
        overlay.dataset.variant = variant;
        if (label) label.textContent = routeLabel(pathname);
        if (sub) sub.textContent = routeSubLabel(pathname);

        const reveal = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
        reveal
          .to(bar, { scaleX: 1, duration: .22, ease: 'power2.out' }, 0)
          .to(media, { scale: 1.07, opacity: 0, duration: .68 }, 0)
          .to(pieces, {
            xPercent: (i) => (i % 2 ? 118 : -118),
            yPercent: (i) => (variant === 'launcher' ? (i % 2 ? 112 : -112) : 0),
            duration: .62,
            stagger: .024
          }, .04)
          .to(ring, { scale: variant === 'link' ? 7 : 2.9, opacity: 0, duration: .62 }, .02)
          .to([label, sub], { opacity: 0, y: -16, duration: .24, stagger: .025 }, .08)
          .set(overlay, { autoAlpha: 0, pointerEvents: 'none' });
      }

      const root = document.querySelector('.main');
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const context = gsap.context(() => {
        const head = root.querySelector('.page-head');
        if (head) {
          const title = head.querySelector('h1');
          const kicker = head.querySelector('.eyebrow');
          const copy = head.querySelector('p');
          const from = {
            downloads: { x: -92, rotateY: 9, z: -80 },
            launcher: { y: 86, rotateX: 11, z: -100 },
            link: { scale: .84, z: -190 },
            account: { x: 94, rotateY: -9, z: -70 },
            builds: { y: -72, rotateX: -9, z: -90 },
            default: { y: 56, z: -60 }
          }[variant] || { y: 56 };

          gsap.fromTo([kicker, title, copy].filter(Boolean),
            { ...from, opacity: 0, transformPerspective: 1200 },
            {
              x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, scale: 1, opacity: 1,
              duration: .95, stagger: .075, ease: 'power3.out', clearProps: 'transform'
            }
          );
        }

        if (variant === 'downloads') {
          const releaseBar = root.querySelector('.download-release-bar');
          if (releaseBar) {
            gsap.fromTo(releaseBar,
              { xPercent: 12, opacity: 0, filter: 'blur(10px)' },
              { xPercent: 0, opacity: 1, filter: 'blur(0px)', duration: .75, ease: 'power3.out' }
            );
          }

          gsap.utils.toArray('.download-row', root).forEach((row, index) => {
            gsap.fromTo(row,
              { y: 110, z: -230, rotateX: 9, opacity: .12, transformPerspective: 1250 },
              {
                y: 0, z: 0, rotateX: 0, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: row, start: 'top 96%', end: 'top 50%', scrub: .68 }
              }
            );
            gsap.to(row, {
              '--glass-shift': `${18 + index * 12}%`,
              scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true }
            });
          });
        } else if (variant === 'launcher') {
          const stage = root.querySelector('.fn-preview-stage') || root.querySelector('.tv');
          const background = root.querySelector('.fn-preview-bg') || root.querySelector('.tv-bg');
          const cards = gsap.utils.toArray('.fn-preview-card, .tv-body > *, .tv .panel', root);

          if (stage) {
            gsap.fromTo(stage,
              { scale: .84, z: -280, rotateX: 9, opacity: .18, transformPerspective: 1450 },
              { scale: 1, z: 0, rotateX: 0, opacity: 1, duration: 1.05, ease: 'power3.out' }
            );

            if (background) {
              gsap.to(background, {
                scale: 1.11,
                yPercent: -2,
                scrollTrigger: { trigger: stage, start: 'top 76%', end: 'bottom 10%', scrub: .8 }
              });
            }

            cards.forEach((card, index) => {
              gsap.fromTo(card,
                { y: 65 + index * 8, z: -130, opacity: .25, rotateX: 6, transformPerspective: 1000 },
                {
                  y: 0, z: 0, opacity: 1, rotateX: 0, ease: 'none',
                  scrollTrigger: { trigger: stage, start: `${28 + index * 4}% 82%`, end: `${58 + index * 3}% 55%`, scrub: .55 }
                }
              );
            });
          }
        } else if (variant === 'link') {
          const panels = gsap.utils.toArray('.flow-grid .panel', root);
          panels.forEach((panel, index) => {
            gsap.fromTo(panel,
              { x: index ? 96 : -96, z: -220, rotateY: index ? -11 : 11, opacity: 0, transformPerspective: 1350 },
              { x: 0, z: 0, rotateY: 0, opacity: 1, duration: .98, delay: .14 + index * .08, ease: 'power3.out' }
            );
          });
          const code = root.querySelector('.code-input');
          if (code) {
            gsap.fromTo(code,
              { boxShadow: '0 0 0 rgba(112,217,255,0)' },
              { boxShadow: '0 0 42px rgba(112,217,255,.15)', duration: 1.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }
            );
          }
        } else if (variant === 'account') {
          const panels = gsap.utils.toArray('.account-grid .panel, .page > .panel', root);
          panels.forEach((panel, index) => {
            gsap.fromTo(panel,
              { xPercent: index % 2 ? 20 : -20, y: 48, z: -120, opacity: 0, rotateY: index % 2 ? -8 : 8, transformPerspective: 1250 },
              { xPercent: 0, y: 0, z: 0, rotateY: 0, opacity: 1, duration: .9, delay: .1 + index * .08, ease: 'power3.out' }
            );
          });
        } else if (variant === 'builds') {
          gsap.utils.toArray('.build-card', root).forEach((card, index) => {
            gsap.fromTo(card,
              { y: 74, z: -145, rotateX: 8, opacity: 0, transformPerspective: 1050 },
              {
                y: 0, z: 0, rotateX: 0, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: card, start: 'top 94%', end: 'top 66%', scrub: .52 }
              }
            );
          });
        } else if (variant !== 'home') {
          gsap.utils.toArray('.panel', root).forEach((panel, index) => {
            gsap.fromTo(panel,
              { y: 46 + index * 8, opacity: 0, z: -90 },
              { y: 0, z: 0, opacity: 1, duration: .7, ease: 'power2.out' }
            );
          });
        }

        return () => ScrollTrigger.getAll().forEach((trigger) => {
          if (trigger.trigger && root.contains(trigger.trigger)) trigger.kill();
        });
      }, root);

      ScrollTrigger.refresh();
      cleanup = () => context.revert();
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [pathname]);

  useEffect(() => {
    const selector = [
      '[data-pz-interactive]',
      '.btn',
      '.download-action:not(.disabled)',
      '.nav-links a',
      '.tv-tabs button',
      '.build-card',
      '.download-row',
      '.panel'
    ].join(',');

    function onMove(event) {
      const element = event.target.closest?.(selector);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      element.style.setProperty('--pz-mx', `${x * 100}%`);
      element.style.setProperty('--pz-my', `${y * 100}%`);
      element.style.setProperty('--pz-rx', `${(x - .5) * 4.2}deg`);
      element.style.setProperty('--pz-ry', `${(.5 - y) * 4.2}deg`);
    }

    function onLeave(event) {
      const element = event.target.closest?.(selector);
      if (!element) return;
      element.style.setProperty('--pz-rx', '0deg');
      element.style.setProperty('--pz-ry', '0deg');
    }

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onLeave, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onLeave);
    };
  }, [pathname]);

  useEffect(() => {
    function shouldIgnore(event, anchor, url) {
      return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        anchor.target === '_blank' || anchor.hasAttribute('download') || url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.search === window.location.search && url.hash);
    }

    async function onClick(event) {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || lockedRef.current) return;
      const url = new URL(anchor.href, window.location.href);
      if (shouldIgnore(event, anchor, url)) return;

      event.preventDefault();
      lockedRef.current = true;
      document.body.classList.add('pz-route-leaving');

      const gsapModule = await import('gsap');
      const gsap = gsapModule.gsap || gsapModule.default;
      const overlay = overlayRef.current;
      if (!overlay) {
        router.push(`${url.pathname}${url.search}${url.hash}`);
        return;
      }

      const targetVariant = routeVariant(url.pathname);
      overlay.dataset.variant = targetVariant;
      const pieces = overlay.querySelectorAll('[data-transition-piece]');
      const ring = overlay.querySelector('[data-transition-ring]');
      const label = overlay.querySelector('[data-transition-label]');
      const sub = overlay.querySelector('[data-transition-sub]');
      const bar = overlay.querySelector('[data-transition-bar]');
      const media = overlay.querySelector('[data-transition-media]');
      if (label) label.textContent = routeLabel(url.pathname);
      if (sub) sub.textContent = routeSubLabel(url.pathname);

      gsap.set(overlay, { autoAlpha: 1, pointerEvents: 'all' });
      gsap.set([label, sub], { opacity: 0, y: 18 });
      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });
      gsap.set(media, { opacity: .42, scale: 1.16 });
      gsap.set(ring, { opacity: 1, scale: targetVariant === 'link' ? .08 : .3 });

      if (targetVariant === 'launcher') {
        gsap.set(pieces, { xPercent: 0, yPercent: (i) => (i % 2 ? 112 : -112) });
      } else if (targetVariant === 'account') {
        gsap.set(pieces, { xPercent: (i) => (i % 2 ? 112 : -112), yPercent: 0 });
      } else if (targetVariant === 'downloads') {
        gsap.set(pieces, { xPercent: (i) => (i === 1 ? 112 : -112), yPercent: 0 });
      } else if (targetVariant === 'link') {
        gsap.set(pieces, { xPercent: 0, yPercent: 0, opacity: 0 });
      } else if (targetVariant === 'builds') {
        gsap.set(pieces, { xPercent: (i) => (i === 0 ? -112 : i === 1 ? 112 : 0), yPercent: (i) => (i === 2 ? 112 : 0) });
      } else {
        gsap.set(pieces, { xPercent: (i) => (i % 2 ? 112 : -112), yPercent: 0 });
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: () => router.push(`${url.pathname}${url.search}${url.hash}`)
      });

      if (targetVariant === 'link') {
        tl.to(ring, { scale: 7.5, duration: .58 }, 0)
          .to(pieces, { opacity: 1, duration: .28 }, .24);
      } else {
        tl.to(pieces, { xPercent: 0, yPercent: 0, duration: .54, stagger: .024 }, 0)
          .to(ring, { scale: 2.45, duration: .5 }, .04);
      }

      tl.to(media, { opacity: .74, scale: 1.05, duration: .52 }, .04)
        .to([label, sub], { opacity: 1, y: 0, duration: .24, stagger: .03 }, .24)
        .to(bar, { scaleX: 1, duration: .32, ease: 'power2.out' }, .27);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  return (
    <div ref={overlayRef} className="pz-transition" aria-hidden="true">
      <span className="pz-transition-media" data-transition-media />
      <span className="pz-transition-grid" />
      <span className="pz-transition-piece pz-transition-piece-a" data-transition-piece />
      <span className="pz-transition-piece pz-transition-piece-b" data-transition-piece />
      <span className="pz-transition-piece pz-transition-piece-c" data-transition-piece />
      <span className="pz-transition-ring" data-transition-ring />
      <div className="pz-transition-copy">
        <strong className="pz-transition-label" data-transition-label>PROJECT ZERO</strong>
        <span className="pz-transition-sub" data-transition-sub>SEASON 7 · XBOX DEV MODE</span>
        <i className="pz-transition-bar"><b data-transition-bar /></i>
      </div>
    </div>
  );
}

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
        overlay.dataset.variant = variant;
        if (label) label.textContent = routeLabel(pathname);

        const reveal = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
        reveal
          .to(pieces, { xPercent: (i) => (i % 2 ? 118 : -118), yPercent: (i) => (variant === 'launcher' ? (i % 2 ? 112 : -112) : 0), duration: .58, stagger: .025 }, 0)
          .to(ring, { scale: variant === 'link' ? 7 : 2.8, opacity: 0, duration: .6 }, 0)
          .to(label, { opacity: 0, y: -16, duration: .26 }, .08)
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
            downloads: { x: -90, rotateY: 8 },
            launcher: { y: 80, rotateX: 10 },
            link: { scale: .86, z: -180 },
            account: { x: 90, rotateY: -8 },
            builds: { y: -70, rotateX: -8 },
            default: { y: 54 }
          }[variant] || { y: 54 };
          gsap.fromTo([kicker, title, copy].filter(Boolean),
            { ...from, opacity: 0, transformPerspective: 1100 },
            { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, scale: 1, opacity: 1, duration: .9, stagger: .08, ease: 'power3.out', clearProps: 'transform' }
          );
        }

        if (variant === 'downloads') {
          gsap.utils.toArray('.download-row', root).forEach((row, index) => {
            gsap.fromTo(row,
              { y: 110, z: -220, rotateX: 9, opacity: .14, transformPerspective: 1200 },
              {
                y: 0, z: 0, rotateX: 0, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: row, start: 'top 94%', end: 'top 53%', scrub: .65 }
              }
            );
            gsap.to(row, {
              '--glass-shift': `${18 + index * 11}%`,
              scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true }
            });
          });
        } else if (variant === 'launcher') {
          const tv = root.querySelector('.tv');
          if (tv) {
            gsap.fromTo(tv,
              { scale: .86, z: -260, rotateX: 8, opacity: .2, transformPerspective: 1400 },
              { scale: 1, z: 0, rotateX: 0, opacity: 1, duration: 1, ease: 'power3.out' }
            );
            gsap.to('.tv-bg', {
              scale: 1.1,
              scrollTrigger: { trigger: tv, start: 'top 70%', end: 'bottom 15%', scrub: .8 }
            });
          }
        } else if (variant === 'link') {
          const panels = gsap.utils.toArray('.flow-grid .panel', root);
          panels.forEach((panel, index) => {
            gsap.fromTo(panel,
              { x: index ? 90 : -90, z: -210, rotateY: index ? -10 : 10, opacity: 0, transformPerspective: 1300 },
              { x: 0, z: 0, rotateY: 0, opacity: 1, duration: .95, delay: .15 + index * .08, ease: 'power3.out' }
            );
          });
        } else if (variant === 'account') {
          const panels = gsap.utils.toArray('.account-grid .panel, .page > .panel', root);
          panels.forEach((panel, index) => {
            gsap.fromTo(panel,
              { xPercent: index % 2 ? 18 : -18, y: 45, opacity: 0, rotateY: index % 2 ? -7 : 7, transformPerspective: 1200 },
              { xPercent: 0, y: 0, rotateY: 0, opacity: 1, duration: .85, delay: .12 + index * .08, ease: 'power3.out' }
            );
          });
        } else if (variant === 'builds') {
          gsap.utils.toArray('.build-card', root).forEach((card, index) => {
            gsap.fromTo(card,
              { y: 70, z: -120, rotateX: 7, opacity: 0, transformPerspective: 1000 },
              { y: 0, z: 0, rotateX: 0, opacity: 1, duration: .7, delay: index * .06, ease: 'power3.out' }
            );
          });
        } else if (variant !== 'home') {
          gsap.utils.toArray('.panel', root).forEach((panel) => {
            gsap.fromTo(panel, { y: 42, opacity: 0 }, { y: 0, opacity: 1, duration: .65, ease: 'power2.out' });
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
      if (label) label.textContent = routeLabel(url.pathname);

      gsap.set(overlay, { autoAlpha: 1, pointerEvents: 'all' });
      gsap.set(label, { opacity: 0, y: 18 });
      gsap.set(ring, { opacity: 1, scale: targetVariant === 'link' ? .08 : .3 });

      if (targetVariant === 'launcher') {
        gsap.set(pieces, { xPercent: 0, yPercent: (i) => (i % 2 ? 110 : -110) });
      } else if (targetVariant === 'account') {
        gsap.set(pieces, { xPercent: (i) => (i % 2 ? 110 : -110), yPercent: 0 });
      } else if (targetVariant === 'downloads') {
        gsap.set(pieces, { xPercent: (i) => (i === 1 ? 110 : -110), yPercent: 0 });
      } else if (targetVariant === 'link') {
        gsap.set(pieces, { xPercent: 0, yPercent: 0, opacity: 0 });
      } else {
        gsap.set(pieces, { xPercent: (i) => (i % 2 ? 110 : -110), yPercent: 0 });
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: () => router.push(`${url.pathname}${url.search}${url.hash}`)
      });

      if (targetVariant === 'link') {
        tl.to(ring, { scale: 7.5, duration: .58 }, 0)
          .to(pieces, { opacity: 1, duration: .28 }, .24);
      } else {
        tl.to(pieces, { xPercent: 0, yPercent: 0, duration: .52, stagger: .025 }, 0)
          .to(ring, { scale: 2.4, duration: .5 }, .04);
      }
      tl.to(label, { opacity: 1, y: 0, duration: .24 }, .25);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  return (
    <div ref={overlayRef} className="pz-transition" aria-hidden="true">
      <span className="pz-transition-piece pz-transition-piece-a" data-transition-piece />
      <span className="pz-transition-piece pz-transition-piece-b" data-transition-piece />
      <span className="pz-transition-piece pz-transition-piece-c" data-transition-piece />
      <span className="pz-transition-ring" data-transition-ring />
      <strong className="pz-transition-label" data-transition-label>PROJECT ZERO</strong>
    </div>
  );
}

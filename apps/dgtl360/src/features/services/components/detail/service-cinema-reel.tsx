'use client';

import { visibleAnimation } from '../../../../lib/animation/visible-animation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import type { Service } from '../../types/service.types';
import type { CMSSiteSettings } from '../../../../lib/cms';
import styles from '../../service-detail.module.css';

const MOBILE_REEL = '(max-width: 1000px), (pointer: coarse)';
const REDUCED_REEL = '(prefers-reduced-motion: reduce)';
function subscribeReel(onChange: () => void) {
  const queries = [MOBILE_REEL, REDUCED_REEL].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener('change', onChange));
  return () => queries.forEach((query) => query.removeEventListener('change', onChange));
}
function getReelMode() {
  if (window.matchMedia(REDUCED_REEL).matches) return 'static';
  return window.matchMedia(MOBILE_REEL).matches ? 'mobile' : 'desktop';
}
const getServerReelMode = () => 'static';

type CinemaService = Pick<
  Service,
  'slug' | 'label' | 'image' | 'imagePosition' | 'accent'
>;

function ReelCard({
  service,
  currentSlug,
  duplicate,
}: {
  service: CinemaService;
  currentSlug: string;
  duplicate: boolean;
}) {
  const isCurrent = service.slug === currentSlug;

  return (
    <li>
      <Link
        className={styles.reelCard}
        data-current={isCurrent || undefined}
        draggable={false}
        href={`/services/${service.slug}`}
        aria-current={!duplicate && isCurrent ? 'page' : undefined}
        tabIndex={duplicate ? -1 : undefined}
        style={{ '--reel-accent': service.accent } as CSSProperties}
      >
        <Image
          className={styles.reelImage}
          src={service.image}
          alt=""
          draggable={false}
          fill
          loading={isCurrent ? 'eager' : 'lazy'}
          sizes="(max-width: 680px) 70vw, (max-width: 1200px) 30vw, 260px"
          style={{ objectFit: 'cover', objectPosition: service.imagePosition }}
        />
        <strong>{service.label}</strong>
      </Link>
    </li>
  );
}

export function ServiceCinemaReel({
  services,
  currentSlug,
  labels,
}: {
  services: CinemaService[];
  currentSlug: string;
  labels?: CMSSiteSettings['serviceContent'];
}) {
  const mode = useSyncExternalStore(subscribeReel, getReelMode, getServerReelMode);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Keep mouse dragging available in narrow layouts; touch uses native scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || mode === 'desktop') return;
    let x: number | null = null;
    let start = 0;
    let moved = false;
    const down = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      x = start = event.clientX;
      moved = false;
    };
    const move = (event: globalThis.PointerEvent) => {
      if (x === null) return;
      if (Math.abs(event.clientX - start) > 6) moved = true;
      if (moved) {
        viewport.setPointerCapture(event.pointerId);
        viewport.dataset.dragging = 'true';
        viewport.scrollLeft += x - event.clientX;
        event.preventDefault();
      }
      x = event.clientX;
    };
    const up = (event: globalThis.PointerEvent) => {
      x = null;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      delete viewport.dataset.dragging;
    };
    const click = (event: MouseEvent) => {
      if (moved && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); moved = false; }
    };
    viewport.addEventListener('pointerdown', down);
    viewport.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    viewport.addEventListener('click', click, true);
    return () => {
      viewport.removeEventListener('pointerdown', down);
      viewport.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      viewport.removeEventListener('click', click, true);
    };
  }, [mode]);

  useEffect(() => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport || mode === 'static') return;

    if (mode === 'mobile') {
      let previous = performance.now();
      let direction = 1;
      let pausedUntil = 0;
      let touching = false;
      let focused = false;
      let offset = viewport.scrollLeft;
      const pause = () => { touching = true; };
      const resume = () => { touching = false; pausedUntil = performance.now() + 2200; };
      const focus = () => { focused = true; };
      const blur = () => { focused = false; pausedUntil = performance.now() + 2200; };
      const wheel = () => { pausedUntil = performance.now() + 2200; };
      const animate = (now: number) => {
        const dt = Math.min((now - previous) / 1000, 0.05);
        previous = now;
        if (!document.hidden && !touching && !focused && now > pausedUntil) {
          const end = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          offset = Math.min(end, Math.max(0, offset + direction * 28 * dt));
          viewport.scrollLeft = offset;
          if (offset >= end) direction = -1;
          if (offset <= 0) direction = 1;
          viewport.dataset.reelDirection = direction > 0 ? 'left' : 'right';
        } else offset = viewport.scrollLeft;
      };
      viewport.addEventListener('pointerdown', pause, { passive: true });
      window.addEventListener('pointerup', resume, { passive: true });
      window.addEventListener('pointercancel', resume, { passive: true });
      viewport.addEventListener('focusin', focus);
      viewport.addEventListener('focusout', blur);
      viewport.addEventListener('wheel', wheel, { passive: true });
      const stopAnimation = visibleAnimation(viewport, animate);
      return () => {
        stopAnimation();
        viewport.removeEventListener('pointerdown', pause);
        window.removeEventListener('pointerup', resume);
        window.removeEventListener('pointercancel', resume);
        viewport.removeEventListener('focusin', focus);
        viewport.removeEventListener('focusout', blur);
        viewport.removeEventListener('wheel', wheel);
        viewport.scrollLeft = 0;
      };
    }

    let position = 0;
    let velocity = -28;
    let previousTime = performance.now();
    let loopWidth = track.scrollWidth / 2;
    let hovering = false;
    let focused = false;
    let pausedUntil = 0;
    let suppressClick = false;
    let drag: { id: number; start: number; x: number; time: number; moved: boolean } | null = null;
    const resize = new ResizeObserver(() => { loopWidth = track.scrollWidth / 2; });
    resize.observe(track);
    const render = () => {
      if (loopWidth > 0) position = ((position % loopWidth) - loopWidth) % loopWidth;
      track.style.transform = `translate3d(${position}px, 0, 0)`;
    };
    const down = (event: globalThis.PointerEvent) => {
      if (event.button !== 0 || (event.target as Element).closest('button')) return;
      suppressClick = false;
      velocity = 0;
      drag = { id: event.pointerId, start: event.clientX, x: event.clientX, time: performance.now(), moved: false };
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const now = performance.now();
      const dx = event.clientX - drag.x;
      if (!drag.moved && Math.abs(event.clientX - drag.start) > 6) {
        drag.moved = true;
        viewport.setPointerCapture(event.pointerId);
        viewport.dataset.dragging = 'true';
      }
      if (drag.moved) {
        event.preventDefault();
        position += dx;
        const measured = dx / Math.max((now - drag.time) / 1000, 0.008);
        velocity = velocity * 0.35 + Math.max(-1600, Math.min(1600, measured)) * 0.65;
        render();
      }
      drag.x = event.clientX;
      drag.time = now;
    };
    const up = (event: globalThis.PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      suppressClick = drag.moved;
      if (performance.now() - drag.time > 100 || event.type === 'pointercancel') velocity = 0;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      drag = null;
      delete viewport.dataset.dragging;
      pausedUntil = performance.now() + 2200;
    };
    const click = (event: MouseEvent) => {
      if (suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    };
    const enter = () => { hovering = true; };
    const leave = () => { hovering = false; };
    const focus = () => { focused = true; velocity = 0; };
    const blur = (event: FocusEvent) => { if (!viewport.contains(event.relatedTarget as Node)) focused = false; };
    const key = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      velocity = event.key === 'ArrowLeft' ? 700 : -700;
      pausedUntil = performance.now() + 2200;
    };
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) && !event.shiftKey) return;
      event.preventDefault();
      velocity += Math.max(-600, Math.min(600, -(event.deltaX || event.deltaY) * 8));
      velocity = Math.max(-1600, Math.min(1600, velocity));
      pausedUntil = performance.now() + 2200;
    };
    const moveFilm = (time: number) => {
      const elapsed = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      if (drag) return;
      const target = hovering || focused || time < pausedUntil ? 0 : -28;
      velocity += (target - velocity) * (1 - Math.exp(-4 * elapsed));
      position += velocity * elapsed;
      render();
    };
    viewport.addEventListener('pointerdown', down);
    viewport.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    viewport.addEventListener('click', click, true);
    viewport.addEventListener('pointerenter', enter);
    viewport.addEventListener('pointerleave', leave);
    viewport.addEventListener('focusin', focus);
    viewport.addEventListener('focusout', blur);
    viewport.addEventListener('keydown', key);
    viewport.addEventListener('wheel', wheel, { passive: false });
    const stopAnimation = visibleAnimation(viewport, moveFilm);
    return () => {
      stopAnimation();
      resize.disconnect();
      viewport.removeEventListener('pointerdown', down);
      viewport.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      viewport.removeEventListener('click', click, true);
      viewport.removeEventListener('pointerenter', enter);
      viewport.removeEventListener('pointerleave', leave);
      viewport.removeEventListener('focusin', focus);
      viewport.removeEventListener('focusout', blur);
      viewport.removeEventListener('keydown', key);
      viewport.removeEventListener('wheel', wheel);
      delete viewport.dataset.dragging;
      track.style.removeProperty('transform');
    };
  }, [mode]);

  return (
    <section className={styles.cinemaReel} aria-labelledby="service-reel-title" data-service-reveal>
      <header className={styles.reelHeader}>
        <p>{labels?.reelKicker ?? 'DGTL 360 / SERVICE REEL'}</p>
        <h2 id="service-reel-title">{labels?.reelHeading ?? 'Explore every service'}</h2>
        <span>{labels?.reelInstruction ?? (mode === 'desktop' ? 'DRAG TO EXPLORE · CLICK A SERVICE' : 'SWIPE LEFT / RIGHT · SELECT A FRAME')}</span>
      </header>

      <div
        className={styles.reelViewport}
        ref={viewportRef}
        data-reel-direction="left"
        tabIndex={0}
        role="group"
        aria-label="Services carousel. Drag or use left and right arrow keys to explore."
      >
        <div className={styles.reelTrack} ref={trackRef}>
          {[false, true].map((duplicate) => (
            <ul className={styles.reelList} aria-hidden={duplicate || undefined} key={String(duplicate)}>
              {services.map((service) => (
                <ReelCard
                  service={service}
                  currentSlug={currentSlug}
                  duplicate={duplicate}
                  key={`${duplicate ? 'duplicate' : 'primary'}-${service.slug}`}
                />
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

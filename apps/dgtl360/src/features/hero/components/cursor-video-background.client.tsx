'use client';

import { useEffect, useRef } from 'react';
import type { CMSMedia } from '../../../lib/cms';
import styles from '../hero.module.css';

const IDLE_DELAY_MS = 720;

export function CursorVideoBackground({ poster, video }: { poster?: CMSMedia | null; video?: CMSMedia | null }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const video = videoRef.current;

    if (!layer || !video) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let animationFrame = 0;

    const pauseAtRest = () => {
      layer.dataset.active = 'false';
      video.pause();
    };

    const schedulePause = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(pauseAtRest, IDLE_DELAY_MS);
    };

    const playVideo = () => {
      if (reducedMotion.matches || !video.paused) return;
      void video.play().catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(idleTimer);
        pauseAtRest();
        return;
      }

      applyInputMode();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;

      const bounds = layer.getBoundingClientRect();
      const isInside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;

      if (!isInside) {
        pauseAtRest();
        return;
      }

      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;

        layer.style.setProperty('--cursor-x', `${x * 100}%`);
        layer.style.setProperty('--cursor-y', `${y * 100}%`);
        layer.style.setProperty('--video-x', `${(0.5 - x) * 2.8}%`);
        layer.style.setProperty('--video-y', `${(0.5 - y) * 2.8}%`);
        layer.dataset.active = 'true';
        video.playbackRate = 0.78 + x * 0.32;
        playVideo();
        schedulePause();
      });
    };

    const applyInputMode = () => {
      clearTimeout(idleTimer);

      if (reducedMotion.matches) {
        pauseAtRest();
        return;
      }

      if (coarsePointer.matches) {
        layer.dataset.active = 'touch';
        playVideo();
      } else {
        pauseAtRest();
      }
    };

    applyInputMode();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    reducedMotion.addEventListener('change', applyInputMode);
    coarsePointer.addEventListener('change', applyInputMode);

    return () => {
      clearTimeout(idleTimer);
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      reducedMotion.removeEventListener('change', applyInputMode);
      coarsePointer.removeEventListener('change', applyInputMode);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className={styles.mycelialBackground}
      data-active="false"
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        className={styles.mycelialVideo}
        muted
        loop
        playsInline
        preload="auto"
        poster={poster?.url}
        tabIndex={-1}
      >
        <source
          src={video?.url || '/assets/video/mycelial-transport.mp4'}
          type={video?.mimeType || 'video/mp4'}
        />
      </video>
    </div>
  );
}

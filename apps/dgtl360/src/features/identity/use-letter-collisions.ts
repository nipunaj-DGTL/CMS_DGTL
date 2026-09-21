'use client';

import { useEffect, useRef } from 'react';
import { visibleAnimation } from '../../lib/animation/visible-animation';

/** Continuous drifting and pointer impulses, suspended offscreen and in hidden tabs. */
export function useLetterCollisions(contentKey = '') {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<(index: number, hover: boolean) => void>(() => {});

  useEffect(() => {
    if (!root.current) return;
    const scene = root.current;
    const letters = Array.from(scene.querySelectorAll<HTMLElement>('[data-collision-letter]'));
    if (!letters.length) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let previous = 0;
    let radius = 0;
    let lastHover = -Infinity;
    let width = scene.clientWidth, height = scene.clientHeight;
    const bodies = letters.map((_, i) => ({
      homeX: 0, homeY: 0, x: 0, y: 0, vx: 0, vy: 0, delay: -1, dx: 0, dy: 0, index: i,
    }));
    const paint = () => bodies.forEach((b, i) => {
      letters[i].style.transform = `translate3d(${b.x - b.homeX}px, ${b.y - b.homeY}px, 0) translate(-50%, -50%)`;

    });
    const reset = () => {

      width = scene.clientWidth; height = scene.clientHeight;
      radius = letters[0].offsetWidth * .42;
      bodies.forEach(b => {
        b.homeX = letters[b.index].offsetLeft;
        b.homeY = letters[b.index].offsetTop;
        b.x = b.homeX; b.y = b.homeY;
        b.vx = Math.cos(b.index * 2.4) * 85; b.vy = Math.sin(b.index * 2.4) * 85; b.delay = -1;
      });
      scene.dataset.motion = 'idle';
      paint();
    };
    const tick = (time: number) => {
      const dt = Math.min((time - previous) / 1000, .025);
      previous = time;
      bodies.forEach(b => {
        if (b.delay >= 0) {
          b.delay -= dt;
          if (b.delay < 0) { b.vx += b.dx; b.vy += b.dy; }
        }
        const speed = Math.hypot(b.vx, b.vy);
        const cruise = Math.min(100, width * .2);
        const next = speed + (cruise - speed) * (1 - Math.exp(-1.2 * dt));
        if (speed > .001) { b.vx *= next / speed; b.vy *= next / speed; }
        else { b.vx = Math.cos(b.index * 2.4) * cruise; b.vy = Math.sin(b.index * 2.4) * cruise; }
        b.x += b.vx * dt; b.y += b.vy * dt;
      });
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j];
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < radius * 2) {
          const nx = dx / distance, ny = dy / distance, overlap = (radius * 2 - distance) / 2;
          a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
          const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (speed < 0) {
            a.vx += speed * .82 * nx; a.vy += speed * .82 * ny;
            b.vx -= speed * .82 * nx; b.vy -= speed * .82 * ny;
          }
        }
      }
      bodies.forEach(b => {
        if (b.x < radius || b.x > width - radius) b.vx *= -.7;
        if (b.y < radius || b.y > height - radius) b.vy *= -.7;
        b.x = Math.max(radius, Math.min(width - radius, b.x));
        b.y = Math.max(radius, Math.min(height - radius, b.y));
      });
      paint();
      scene.dataset.motion = 'active';
    };
    trigger.current = (index, hover) => {
      if (document.hidden || reduced.matches) return;
      // Moving letters can cross the pointer repeatedly; avoid stacking impulses.
      const now = performance.now();
      if (hover && now - lastHover < 350) return;
      lastHover = now;
      const origin = bodies[index];
      const neighbour = bodies[(index + 1) % bodies.length];
      const angle = Math.atan2(neighbour.y - origin.y, neighbour.x - origin.x);
      bodies.forEach((b, i) => {
        const distance = Math.hypot(b.x - origin.x, b.y - origin.y);
        const direction = i === index ? angle : Math.atan2(b.y - origin.y, b.x - origin.x);
        b.delay = i === index ? 0 : distance / 850;
        const force = Math.min(width * 1.8, i === index ? 1300 : 650);
        b.dx = Math.cos(direction) * force; b.dy = Math.sin(direction) * force;
      });

    };
    reset();
    const stop = visibleAnimation(scene, tick);
    window.addEventListener('resize', reset);
    return () => {
      stop(); trigger.current = () => {};
      window.removeEventListener('resize', reset);
    };
  }, [contentKey]);
  return { root, push: (index: number, hover = false) => trigger.current(index, hover) };
}

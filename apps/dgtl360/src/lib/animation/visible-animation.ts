/** Run an animation only while its surface is onscreen and the tab is visible. */
export function visibleAnimation(element: Element, update: (time: number) => void, canRun = () => true) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let intersecting = false;
  const tick = (time: number) => {
    update(time);
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (intersecting && !document.hidden && !reducedMotion.matches && canRun()) frame = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting;
    sync();
  });
  observer.observe(element);
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  const stop = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reducedMotion.removeEventListener('change', sync);
  };
  return Object.assign(stop, { refresh: sync });
}

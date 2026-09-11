"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1001px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

// Both layers tear down immediately when desktop motion is no longer appropriate.
export function useCursorMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

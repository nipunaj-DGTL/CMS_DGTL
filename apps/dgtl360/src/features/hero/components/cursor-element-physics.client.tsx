"use client";

import { useEffect, useRef } from "react";
import { useCursorMotion } from "./use-cursor-motion";

export type CursorElementPhysicsSettings = {
  enabled: boolean;
  titleEnabled: boolean;
  subtitleEnabled: boolean;
  cardsEnabled: boolean;
  cardCoupling: number;
  cardPush: number;
  cardTilt: number;
  titleCoupling: number;
  titlePush: number;
  titleTilt: number;
  titleSkew: number;
  subtitleCoupling: number;
};

// Founder-set portable handoff baseline. Field source: main@5aad17ff; tuned 2026-09-04.
export const acceptedCursorElementPhysics: CursorElementPhysicsSettings = {
  enabled: true,
  titleEnabled: true,
  subtitleEnabled: true,
  cardsEnabled: true,
  cardCoupling: 0.97,
  cardPush: 5.99,
  cardTilt: 0.5,
  titleCoupling: 1.46,
  titlePush: 2.59,
  titleTilt: 2,
  titleSkew: 0.659,
  subtitleCoupling: 0.8806,
};

type CursorElementPhysicsProps = {
  settings?: CursorElementPhysicsSettings;
  rootSelector?: string;
};

const titleVariables = ["--cursor-title-x", "--cursor-title-y", "--cursor-title-tilt-x", "--cursor-title-tilt-y", "--cursor-title-skew"] as const;
const subtitleVariables = ["--cursor-subtitle-x", "--cursor-subtitle-y"] as const;
const cardVariables = ["--cursor-card-x", "--cursor-card-y", "--cursor-card-tilt-x", "--cursor-card-tilt-y"] as const;

export function CursorElementPhysics({
  settings = acceptedCursorElementPhysics,
  rootSelector = "[data-cursor-physics-root]",
}: CursorElementPhysicsProps) {
  const motionAllowed = useCursorMotion();
  const settingsRef = useRef(settings);
  const requestUpdateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
    requestUpdateRef.current?.();
  }, [settings]);

  useEffect(() => {
    if (!settings.enabled || !motionAllowed) return;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarseQuery = window.matchMedia("(pointer: coarse)");
    const narrowQuery = window.matchMedia("(max-width: 1000px)");
    if (reducedQuery.matches || coarseQuery.matches || narrowQuery.matches) return;

    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    const title = root.querySelector<HTMLElement>("[data-cursor-title-surface]");
    const subtitle = root.querySelector<HTMLElement>("[data-cursor-subtitle-surface]");
    let activeCard: HTMLElement | null = null;
    let activeCardSurface: HTMLElement | null = null;
    let activeCardRect: DOMRect | null = null;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let cardX = 0;
    let cardY = 0;

    const removeVariables = (element: HTMLElement | null, names: readonly string[]) => {
      if (!element) return;
      for (const name of names) element.style.removeProperty(name);
    };

    const clearCard = () => {
      activeCard?.classList.remove("cursor-physics-active");
      removeVariables(activeCardSurface, cardVariables);
      activeCard = null;
      activeCardSurface = null;
      activeCardRect = null;
    };

    const reset = () => {
      pointerX = 0;
      pointerY = 0;
      cardX = 0;
      cardY = 0;
      clearCard();
      removeVariables(title, titleVariables);
      removeVariables(subtitle, subtitleVariables);
    };

    const apply = () => {
      frame = 0;
      const current = settingsRef.current;
      title?.style.setProperty("--cursor-title-x", `${current.titleEnabled ? pointerX * 2 * current.titlePush * current.titleCoupling : 0}px`);
      title?.style.setProperty("--cursor-title-y", `${current.titleEnabled ? pointerY * 2 * current.titlePush * current.titleCoupling : 0}px`);
      title?.style.setProperty("--cursor-title-tilt-x", `${current.titleEnabled ? -pointerY * 2 * current.titleTilt * current.titleCoupling : 0}deg`);
      title?.style.setProperty("--cursor-title-tilt-y", `${current.titleEnabled ? pointerX * 2 * current.titleTilt * current.titleCoupling : 0}deg`);
      title?.style.setProperty("--cursor-title-skew", `${current.titleEnabled ? pointerX * 2 * current.titleSkew * current.titleCoupling : 0}deg`);
      subtitle?.style.setProperty("--cursor-subtitle-x", `${current.subtitleEnabled ? pointerX * 2 * current.titlePush * current.subtitleCoupling : 0}px`);
      subtitle?.style.setProperty("--cursor-subtitle-y", `${current.subtitleEnabled ? pointerY * 2 * current.titlePush * current.subtitleCoupling : 0}px`);

      if (!current.cardsEnabled) clearCard();
      if (activeCardSurface && current.cardsEnabled) {
        activeCardSurface.style.setProperty("--cursor-card-x", `${cardX * 2 * current.cardPush * current.cardCoupling}px`);
        activeCardSurface.style.setProperty("--cursor-card-y", `${cardY * 2 * current.cardPush * current.cardCoupling}px`);
        activeCardSurface.style.setProperty("--cursor-card-tilt-x", `${-cardY * 2 * current.cardTilt * current.cardCoupling}deg`);
        activeCardSurface.style.setProperty("--cursor-card-tilt-y", `${cardX * 2 * current.cardTilt * current.cardCoupling}deg`);
      }
    };

    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    requestUpdateRef.current = requestUpdate;

    const selectCard = (next: HTMLElement | null) => {
      if (next === activeCard) return;
      clearCard();
      if (!next || next.matches(":focus-within")) return;
      activeCard = next;
      activeCardSurface = next.querySelector<HTMLElement>("[data-cursor-card-surface]");
      if (!activeCardSurface) {
        activeCard = null;
        return;
      }
      activeCardRect = next.getBoundingClientRect();
      next.classList.add("cursor-physics-active");
    };

    const pointerMove = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-cursor-ui]")) return;
      const rootRect = root.getBoundingClientRect();
      pointerX = (event.clientX - rootRect.left) / Math.max(rootRect.width, 1) - 0.5;
      pointerY = (event.clientY - rootRect.top) / Math.max(rootRect.height, 1) - 0.5;
      const card = settingsRef.current.cardsEnabled && event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-cursor-card]")
        : null;
      selectCard(card);
      activeCardRect = activeCard?.getBoundingClientRect() ?? null;
      if (activeCardRect) {
        cardX = (event.clientX - activeCardRect.left) / Math.max(activeCardRect.width, 1) - 0.5;
        cardY = (event.clientY - activeCardRect.top) / Math.max(activeCardRect.height, 1) - 0.5;
      }
      requestUpdate();
    };

    const pointerLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      reset();
    };
    const resize = () => {
      activeCardRect = activeCard?.getBoundingClientRect() ?? null;
      requestUpdate();
    };
    const visibility = () => {
      if (document.hidden) pointerLeave();
    };

    root.addEventListener("pointermove", pointerMove, { passive: true });
    root.addEventListener("pointerleave", pointerLeave, { passive: true });
    root.addEventListener("pointercancel", pointerLeave, { passive: true });
    root.addEventListener("focusin", pointerLeave);
    window.addEventListener("scroll", pointerLeave, { passive: true });
    window.addEventListener("blur", pointerLeave);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", visibility);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      requestUpdateRef.current = null;
      reset();
      root.removeEventListener("pointermove", pointerMove);
      root.removeEventListener("pointerleave", pointerLeave);
      root.removeEventListener("pointercancel", pointerLeave);
      root.removeEventListener("focusin", pointerLeave);
      window.removeEventListener("scroll", pointerLeave);
      window.removeEventListener("blur", pointerLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [settings.enabled, rootSelector, motionAllowed]);

  return null;
}

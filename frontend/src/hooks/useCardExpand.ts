import { useCallback, useEffect, useRef, useState } from "react";

// How fast an un-hovered card eases back to collapsed, in progress
// units per second — a "slow snap-back," not an instant reset.
const SNAP_BACK_SPEED = 1.8;
// Progress gained per pixel of wheel deltaY while hovering + scrolling.
const SCROLL_EXPAND_RATE = 0.0009;
// How fast a click/tap-triggered expand or collapse animates, in
// progress units per second — deliberately slow enough (~1.7s for a
// full traverse) that the same scroll-driven animation is visible,
// rather than snapping straight to the end state.
const CLICK_ANIMATION_SPEED = 0.6;

export function useCardExpand(count: number) {
  const [progress, setProgress] = useState<number[]>(() =>
    new Array(count).fill(0),
  );
  const [hoveredIndex, setHoveredIndexState] = useState<number | null>(null);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const hoveredRef = useRef<number | null>(null);
  // Separate from hoveredRef on purpose. The 3D card's canvas and the
  // expanded panel's interactive elements (e.g. the GitHub stat link)
  // are different DOM subtrees fighting over the same screen region —
  // moving onto the link fires the canvas's native pointerleave and
  // this overlay's pointerenter as part of the same browser event
  // sequence, but their relative order isn't guaranteed. Two
  // independent flags OR'd together in the decay check means whichever
  // fires last can't stomp the other's claim.
  const interactiveRef = useRef<number | null>(null);
  const innerScrollRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Index -> target progress (0 or 1) for an in-flight click/tap
  // animation. Takes priority over the hover-based snap-back below so
  // a tap on a touch device (which has no lingering "hover" to exempt
  // it) still animates all the way to its target instead of being
  // immediately pulled back.
  const clickTargetsRef = useRef<Map<number, number>>(new Map());

  // Per-frame loop: a card with an active click-triggered target eases
  // toward that target; otherwise, any card that isn't currently
  // hovered eases its progress down toward 0 — independently per card.
  useEffect(() => {
    let frameId: number;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setProgress((prev) => {
        let changed = false;
        const next = prev.map((p, i) => {
          const clickTarget = clickTargetsRef.current.get(i);
          if (clickTarget !== undefined) {
            const step = CLICK_ANIMATION_SPEED * dt;
            const nextP =
              clickTarget > p
                ? Math.min(clickTarget, p + step)
                : Math.max(clickTarget, p - step);
            if (nextP === clickTarget) clickTargetsRef.current.delete(i);
            if (nextP !== p) changed = true;
            return nextP;
          }
          if (i !== hoveredRef.current && i !== interactiveRef.current && p > 0) {
            changed = true;
            return Math.max(0, p - SNAP_BACK_SPEED * dt);
          }
          return p;
        });
        return changed ? next : prev;
      });
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const setHoveredIndex = useCallback((index: number | null) => {
    hoveredRef.current = index;
    setHoveredIndexState(index);
  }, []);

  const setInteractiveIndex = useCallback((index: number | null) => {
    interactiveRef.current = index;
  }, []);

  // Returns true if the caller should preventDefault (we consumed the
  // scroll), false if the page should be left to scroll normally.
  const handleWheel = useCallback((index: number, deltaY: number): boolean => {
    const current = progressRef.current[index] ?? 0;
    const innerEl = innerScrollRefs.current.get(index);

    if (current >= 1 && innerEl) {
      if (deltaY > 0) {
        innerEl.scrollTop += deltaY;
        return true;
      }
      if (innerEl.scrollTop > 0) {
        innerEl.scrollTop += deltaY;
        return true;
      }
      // deltaY < 0 and inner content is already at its top: fall
      // through and resume collapsing below.
    }

    const next = Math.min(1, Math.max(0, current + deltaY * SCROLL_EXPAND_RATE));
    setProgress((prev) => {
      const copy = prev.slice();
      copy[index] = next;
      return copy;
    });
    return true;
  }, []);

  // Click/tap fallback — always works, on any device. Toggles: expands
  // a collapsed-or-mid card fully, collapses an already-expanded one.
  // Animated (via the per-frame loop above) rather than an instant
  // jump, so it plays the same expand/collapse motion scrolling does.
  const toggleExpand = useCallback((index: number) => {
    const current = progressRef.current[index] ?? 0;
    const next = current >= 0.98 ? 0 : 1;
    clickTargetsRef.current.set(index, next);
  }, []);

  const registerInnerScroll = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      if (el) innerScrollRefs.current.set(index, el);
      else innerScrollRefs.current.delete(index);
    },
    [],
  );

  return {
    progress,
    hoveredIndex,
    setHoveredIndex,
    setInteractiveIndex,
    handleWheel,
    toggleExpand,
    registerInnerScroll,
  };
}

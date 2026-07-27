import { useEffect, useRef, useState, type RefObject } from "react";

// How gently the returned value follows the raw scroll fraction. This
// is the ONE smoothing layer for the whole post-gate journey — camera
// position (CathedralScene) and content crossfade (App.tsx) both
// consume this same smoothed number, not their own independent copies.
// That used to be two separate smoothings (camera lagged, content
// didn't), which let a single fast scroll gesture pop the "How I Work"
// card in well before the camera had gone anywhere — the content had
// no time floor of its own, only a scroll-distance one, and scroll
// distance can be covered instantly by one big flick. A shared smoothed
// value means both the camera and the content take the same real time
// to arrive, however fast someone scrolls.
const SMOOTH_SPEED = 1.4;

// Same rAF-coalesced rect-based scroll tracking as the old
// useScrollProgress, scoped to the post-gate journey container, plus a
// continuous eased-follow loop on top. `active` gates both entirely —
// before the gate opens there's no scrollable journey container to
// measure yet, and neither loop should be live.
export function useCathedralJourney(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): number {
  const [smoothed, setSmoothed] = useState(0);
  const rawRef = useRef(0);
  const smoothedRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    let scrollFrameId: number | null = null;

    const updateRaw = () => {
      scrollFrameId = null;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) {
        rawRef.current = rect.top <= 0 ? 1 : 0;
        return;
      }

      const scrolled = -rect.top;
      rawRef.current = Math.min(1, Math.max(0, scrolled / scrollableDistance));
    };

    const onScroll = () => {
      if (scrollFrameId !== null) return;
      scrollFrameId = requestAnimationFrame(updateRaw);
    };

    updateRaw();
    smoothedRef.current = rawRef.current;
    setSmoothed(rawRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let animFrameId: number | null = null;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      smoothedRef.current = prefersReducedMotion
        ? rawRef.current
        : smoothedRef.current +
          (rawRef.current - smoothedRef.current) * Math.min(1, SMOOTH_SPEED * delta);
      setSmoothed(smoothedRef.current);
      animFrameId = requestAnimationFrame(tick);
    };
    animFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollFrameId !== null) cancelAnimationFrame(scrollFrameId);
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    };
  }, [containerRef, active]);

  return smoothed;
}

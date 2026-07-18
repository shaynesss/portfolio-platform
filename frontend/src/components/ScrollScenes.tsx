import { useEffect, useRef, type ReactNode } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { isTouchDevice } from "@/lib/isTouchDevice";

// How long to wait after the last scroll event before deciding the user
// has settled and snapping the rest of the way into a section.
const SNAP_SETTLE_MS = 140;

// Null means "already settled in a hold zone, nothing to do." Otherwise
// the progress fraction (0-1) to smooth-scroll to — whichever
// neighboring hold zone's center is closer, so an accidental overshoot
// past a boundary always resolves cleanly into one section or the
// other instead of getting stuck half-transitioned.
function findSnapTarget(
  raw: number,
  sceneCount: number,
  holdFraction: number,
  stride: number,
): number | null {
  for (let i = 0; i < sceneCount; i++) {
    const holdStart = i * stride;
    const holdEnd = holdStart + holdFraction;
    if (raw <= holdEnd) {
      if (raw >= holdStart) return null;
      const prevHoldEnd = (i - 1) * stride + holdFraction;
      const midpoint = (prevHoldEnd + holdStart) / 2;
      return raw < midpoint
        ? prevHoldEnd - holdFraction / 2
        : holdStart + holdFraction / 2;
    }
  }
  return null;
}

interface ScrollScenesProps {
  scenes: ReactNode[];
  holdVh?: number;
  transitionVh?: number;
}

// A softer deceleration than a quadratic ease — reads as a smoother,
// more premium settle for the cross-dissolve between sections.
function easeInOutCubic(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// How far an incoming scene rises into place (and an outgoing one sinks
// away), how blurred and how scaled-down it is while off-screen — all
// scale with how hidden the scene currently is, so they track scroll
// position exactly like opacity does, with no separate animation/lag
// of their own. Deliberately large: the transition zone is a short
// fraction of the total scroll distance, so a subtle effect would fly
// by unnoticed at normal scroll speed.
const SCENE_RISE_PX = 70;
const SCENE_BLUR_PX = 32;
const SCENE_MIN_SCALE = 0.92;

// Outgoing scene fades out over the first half of the transition zone,
// incoming fades in over the second half — sequential, not overlapping,
// so there's no double-exposure ghosting between sections.
function sceneOpacity(
  index: number,
  sceneCount: number,
  progress: number,
  holdFraction: number,
  transitionFraction: number,
  stride: number,
) {
  const holdStart = index * stride;
  const holdEnd = holdStart + holdFraction;
  const half = transitionFraction / 2;

  if (progress >= holdStart && progress <= holdEnd) return 1;

  if (progress < holdStart) {
    if (index === 0) return 1;
    const fadeInMid = holdStart - half;
    if (progress < fadeInMid) return 0;
    return easeInOutCubic((progress - fadeInMid) / half);
  }

  if (index === sceneCount - 1) return 1;
  const fadeOutMid = holdEnd + half;
  if (progress > fadeOutMid) return 0;
  return 1 - easeInOutCubic((progress - holdEnd) / half);
}

export default function ScrollScenes({
  scenes,
  holdVh = 60,
  transitionVh = 45,
}: ScrollScenesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(containerRef);
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const segments = scenes.length - 1;
  const totalVh = holdVh * scenes.length + transitionVh * segments;
  const holdFraction = holdVh / totalVh;
  const transitionFraction = transitionVh / totalVh;
  const stride = holdFraction + transitionFraction;

  const opacities = scenes.map((_, i) =>
    sceneOpacity(i, scenes.length, progress, holdFraction, transitionFraction, stride),
  );

  // Once the user stops scrolling, resolve any overshoot into a
  // transition zone by smoothly finishing the trip into whichever
  // section is closer — makes it much harder to accidentally leave the
  // page half-scrolled between two sections.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion || scenes.length < 2) return;

    let settleTimer: number | undefined;

    const trySnap = () => {
      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) return;
      const raw = Math.min(1, Math.max(0, -rect.top / scrollableDistance));

      const target = findSnapTarget(raw, scenes.length, holdFraction, stride);
      if (target === null) return;

      const targetScrollY = window.scrollY + rect.top + target * scrollableDistance;
      window.scrollTo({ top: targetScrollY, behavior: "smooth" });
    };

    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(trySnap, SNAP_SETTLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(settleTimer);
    };
  }, [scenes.length, holdFraction, stride]);

  // Touch-only: replace native inertial scrolling with one-swipe-per-
  // section paging. A phone flick is far more sensitive than a mouse
  // wheel tick and routinely blows straight through several sections in
  // one gesture — the settle-snap above only cleans up afterward, it
  // can't stop the overshoot itself. Taking the gesture over at the
  // window level (rather than relying on native scroll physics) also
  // fixes swiping back "up" out of the Projects section: its WebGL
  // canvas sets `touch-action: none` so drag gestures on cards don't
  // trigger the browser's own pan/zoom, but that leaves nothing to
  // translate a touch swipe there into a page scroll — this handler
  // doesn't depend on native scrolling happening at all, so it works
  // the same whether the gesture starts over the canvas or anywhere
  // else. Swipes that start inside a card's own scrollable writeup
  // (`[data-scroll-region]`) are left alone so that still scrolls
  // natively. Desktop is untouched — this effect no-ops there entirely.
  useEffect(() => {
    if (!isTouchDevice || scenes.length < 2) return;
    const container = containerRef.current;
    if (!container) return;

    const SWIPE_THRESHOLD_PX = 40;
    let startY = 0;
    let startX = 0;
    let startSection = 0;
    let insideScrollRegion = false;
    let tracking = false;

    const currentSection = (): number => {
      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) return 0;
      const raw = Math.min(1, Math.max(0, -rect.top / scrollableDistance));
      return Math.min(scenes.length - 1, Math.max(0, Math.round(raw / stride)));
    };

    const goToSection = (index: number) => {
      const clamped = Math.min(scenes.length - 1, Math.max(0, index));
      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) return;
      const target = clamped * stride + holdFraction / 2;
      const targetScrollY = window.scrollY + rect.top + target * scrollableDistance;
      window.scrollTo({
        top: targetScrollY,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      startX = touch.clientX;
      startSection = currentSection();
      insideScrollRegion = !!(event.target as HTMLElement | null)?.closest?.(
        "[data-scroll-region]",
      );
      tracking = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || insideScrollRegion) return;
      event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      if (insideScrollRegion) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dy = startY - touch.clientY;
      const dx = startX - touch.clientX;
      if (Math.abs(dy) < SWIPE_THRESHOLD_PX || Math.abs(dy) < Math.abs(dx)) return;
      goToSection(startSection + (dy > 0 ? 1 : -1));
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [scenes.length, holdFraction, stride, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${totalVh}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {scenes.map((scene, i) => {
          const hidden = prefersReducedMotion ? 0 : 1 - opacities[i];
          const scale = 1 - hidden * (1 - SCENE_MIN_SCALE);
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                opacity: opacities[i],
                transform: `translateY(${hidden * SCENE_RISE_PX}px) scale(${scale})`,
                filter: `blur(${hidden * SCENE_BLUR_PX}px)`,
                pointerEvents: opacities[i] < 0.05 ? "none" : "auto",
              }}
            >
              {scene}
            </div>
          );
        })}
      </div>
    </div>
  );
}

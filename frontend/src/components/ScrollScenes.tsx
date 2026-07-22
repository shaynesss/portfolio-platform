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

// Each scene is a render function, not a plain node — it receives
// whether its own section has ever started fading into view, so a
// scene with a heavy mount (a Three.js canvas, say) can defer that
// mount until it's actually about to be seen instead of initializing
// every scene at once on page load.
type SceneRenderer = (active: boolean) => ReactNode;

interface ScrollScenesProps {
  scenes: SceneRenderer[];
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

  // Sticky once true: a scene becomes "active" the moment it first
  // starts fading in (opacity > 0), and stays active even if the user
  // scrolls back past it later — a heavy mount inside it (e.g. a
  // Three.js canvas) shouldn't tear down and re-initialize every time
  // the scene dips back out of view.
  const activeRef = useRef<boolean[]>(scenes.map(() => false));
  if (activeRef.current.length !== scenes.length) {
    activeRef.current = scenes.map((_, i) => activeRef.current[i] ?? false);
  }
  opacities.forEach((o, i) => {
    if (o > 0) activeRef.current[i] = true;
  });

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
    // A gesture ending with less than this much total movement counts as
    // a tap, not a drag — dispatched as a manual click below rather than
    // relying on the browser's own tap-to-click synthesis, which turned
    // out not to survive preventDefault reliably on real devices (a real
    // finger never holds perfectly still, so an intended tap routinely
    // produces enough incidental touchmove movement to have triggered
    // that suppression). Movement between this and SWIPE_THRESHOLD_PX is
    // deliberately ambiguous and does nothing — neither a clean tap nor
    // a clean swipe.
    const TAP_MAX_PX = 15;
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
      // Suppressed outside a scroll region — the tap/swipe outcome is
      // decided and dispatched ourselves at touchend below. Left alone
      // inside a scroll region so its native touch-scroll keeps working;
      // the click there is still resolved manually at touchend (see
      // below), not left to native click synthesis either — that's what
      // made tap-to-collapse flaky, since a tap inside a scrollable
      // pointer-events:auto region doesn't reliably get a native click
      // after it on real devices.
      event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      // Always suppress the native click here too — we resolve and
      // dispatch it ourselves below, in every case, so nothing about
      // this gesture is ever left to the browser's own tap-to-click
      // heuristics. Harmless for a scroll region: this only affects the
      // trailing synthesized click, not scrolling that already happened
      // natively via touchmove above.
      event.preventDefault();
      const dy = startY - touch.clientY;
      const dx = startX - touch.clientX;
      const distance = Math.hypot(dx, dy);

      if (
        !insideScrollRegion &&
        distance >= SWIPE_THRESHOLD_PX &&
        Math.abs(dy) >= Math.abs(dx)
      ) {
        goToSection(startSection + (dy > 0 ? 1 : -1));
        return;
      }

      if (distance <= TAP_MAX_PX) {
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        target?.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch.clientX,
            clientY: touch.clientY,
          }),
        );
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    // Not passive: onTouchEnd calls preventDefault to suppress the
    // browser's native click, since every tap is dispatched manually
    // instead (see above). A passive listener silently ignores
    // preventDefault, which let the native click through as well —
    // toggleExpand is a toggle, so that second, slightly delayed native
    // click would catch a card mid-collapse-animation and flip it back
    // open, which is why collapsing an expanded card never actually
    // stuck.
    window.addEventListener("touchend", onTouchEnd, { passive: false });
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
              {scene(activeRef.current[i])}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { isTouchDevice } from "@/lib/isTouchDevice";

// Restores tap-to-click sitewide on touch devices. Used to be handled by
// ScrollScenes' window-level touch handler (swipe-to-page + tap-dispatch
// combined) — that component was retired when the cathedral scene
// replaced it with real native scroll, but nothing replaced the
// tap-dispatch half, so every touch-only tap-to-expand path (the Noctis
// card, the rose-window panes) has been silently dead since. Only the
// tap half is needed now — page navigation is real native scroll, not
// fake section-paging, so there's nothing left to hijack for swipes.
//
// Native click-after-touch synthesis doesn't reliably survive
// `preventDefault` firing mid-gesture on real devices (confirmed the
// hard way during the original build — see STATUS.md's mobile-touch
// history), so taps are dispatched manually instead of relying on it.
const TAP_MAX_PX = 15;

export function useGlobalTapDispatch() {
  useEffect(() => {
    if (!isTouchDevice) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const distance = Math.hypot(touch.clientX - startX, touch.clientY - startY);
      if (distance > TAP_MAX_PX) return;

      // Suppress the native click only for a qualifying tap — a real
      // swipe/scroll gesture is left completely alone so native
      // scrolling (including inside [data-scroll-region] writeups)
      // keeps working untouched.
      event.preventDefault();
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
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    // Not passive: preventDefault above is what stops the native click
    // from also firing and double-handling the same tap.
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}

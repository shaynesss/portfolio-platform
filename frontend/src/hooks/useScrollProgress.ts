import { useEffect, useState, type RefObject } from "react";

export function useScrollProgress(containerRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId: number | null = null;

    const update = () => {
      frameId = null;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0);
        return;
      }

      const scrolled = -rect.top;
      const raw = scrolled / scrollableDistance;
      setProgress(Math.min(1, Math.max(0, raw)));
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [containerRef]);

  return progress;
}

import { useRef, type ReactNode } from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface ScrollScenesProps {
  scenes: ReactNode[];
  holdVh?: number;
  transitionVh?: number;
}

function easeInOutQuad(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

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
    return easeInOutQuad((progress - fadeInMid) / half);
  }

  if (index === sceneCount - 1) return 1;
  const fadeOutMid = holdEnd + half;
  if (progress > fadeOutMid) return 0;
  return 1 - easeInOutQuad((progress - holdEnd) / half);
}

export default function ScrollScenes({
  scenes,
  holdVh = 60,
  transitionVh = 45,
}: ScrollScenesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(containerRef);

  const segments = scenes.length - 1;
  const totalVh = holdVh * scenes.length + transitionVh * segments;
  const holdFraction = holdVh / totalVh;
  const transitionFraction = transitionVh / totalVh;
  const stride = holdFraction + transitionFraction;

  const opacities = scenes.map((_, i) =>
    sceneOpacity(i, scenes.length, progress, holdFraction, transitionFraction, stride),
  );

  return (
    <div
      ref={containerRef}
      style={{ height: `${totalVh}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {scenes.map((scene, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              opacity: opacities[i],
              pointerEvents: opacities[i] < 0.05 ? "none" : "auto",
            }}
          >
            {scene}
          </div>
        ))}
      </div>
    </div>
  );
}

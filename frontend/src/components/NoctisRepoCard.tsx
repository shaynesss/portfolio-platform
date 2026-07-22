import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Project, RepoCard } from "@/lib/api";
import ProjectCardScene from "@/components/ProjectCardScene";
import ProjectCard from "@/components/ProjectCard";
import { useCardExpand } from "@/hooks/useCardExpand";
import { cardExpandedScreenRect, crossfadeT, type ScreenRect } from "@/lib/cardLayout";

interface NoctisRepoCardProps {
  repoCard: RepoCard;
}

// cardLayout's MIN_CAMERA_Z (9) is tuned for a shared row of up to 6
// cards spanning the full page width — applied here, it holds the
// camera much further back than this single card's own small,
// fixed-aspect container needs, making it read as tiny regardless of
// how big the container itself is. This card doesn't share a frame
// with anything else, so it can sit much closer.
const NOCTIS_CARD_MIN_CAMERA_Z = 3.4;

// A single-card, contained-expand sibling of ProjectsSection: same 3D
// card mechanic (ProjectCardScene/ProjectCard/useCardExpand/cardLayout,
// all reused unmodified), but scoped to its own container's own
// measured size rather than the window — every cardLayout function
// already takes width/height as plain params, so feeding it this
// container's box instead of the viewport is enough to keep the card's
// expand contained within this column instead of covering the page.
export default function NoctisRepoCard({ repoCard }: NoctisRepoCardProps) {
  // Stable identity across re-renders — ProjectCardScene's setup effect
  // depends on this array by reference, so a fresh object/array every
  // render (progress updates every animation frame) would tear down and
  // rebuild the entire Three.js scene on every frame instead of once.
  const project: Project = useMemo(
    () => ({
      id: "noctis-os",
      slug: "noctis-os",
      title: repoCard.title,
      displayOrder: 0,
      writeup: repoCard.writeup,
      githubUrl: repoCard.githubUrl,
      githubStars: repoCard.githubStars,
      githubLanguage: repoCard.githubLanguage,
      demoMediaType: "image",
      demoMediaUrl: repoCard.demoMediaUrl,
      videoSource: null,
    }),
    [repoCard],
  );
  const projects = useMemo(() => [project], [project]);

  const {
    progress,
    setHoveredIndex,
    setInteractiveIndex,
    handleWheel,
    toggleExpand,
    registerInnerScroll,
  } = useCardExpand(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mediaRef = useRef<HTMLDivElement | null>(null);
  const mediaRect = useRef<ScreenRect | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useLayoutEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if ((progressRef.current[0] ?? 0) > 0.01) return;
    const r = el.getBoundingClientRect();
    mediaRect.current = { x: r.left, y: r.top, width: r.width, height: r.height };
  }, [box.width, box.height]);

  const p = progress[0] ?? 0;
  const t = crossfadeT(p);

  let mediaTransform: string | undefined;
  const finalMediaRect = mediaRect.current;
  if (finalMediaRect && box.width > 0 && box.height > 0) {
    const bigRect = cardExpandedScreenRect(
      0,
      1,
      box.width,
      box.height,
      p,
      NOCTIS_CARD_MIN_CAMERA_Z,
    );
    // bigRect is relative to the container's own coordinate space
    // (0,0 top-left of the container) since box.width/height came from
    // the container, not the window — but finalMediaRect was measured
    // via getBoundingClientRect, which is viewport-relative. Offset by
    // the container's own viewport position so both rects share the
    // same origin before diffing them.
    const containerRectNow = containerRef.current?.getBoundingClientRect();
    const originX = containerRectNow?.left ?? 0;
    const originY = containerRectNow?.top ?? 0;
    const bigCenterX = originX + bigRect.x + bigRect.width / 2;
    const bigCenterY = originY + bigRect.y + bigRect.height / 2;
    const finalCenterX = finalMediaRect.x + finalMediaRect.width / 2;
    const finalCenterY = finalMediaRect.y + finalMediaRect.height / 2;
    const scaleX = bigRect.width / finalMediaRect.width;
    const scaleY = bigRect.height / finalMediaRect.height;

    const translateX = (bigCenterX - finalCenterX) * (1 - t);
    const translateY = (bigCenterY - finalCenterY) * (1 - t);
    const scaleXNow = scaleX + (1 - scaleX) * t;
    const scaleYNow = scaleY + (1 - scaleY) * t;
    mediaTransform = `translate(${translateX}px, ${translateY}px) scale(${scaleXNow}, ${scaleYNow})`;
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ProjectCardScene
        projects={projects}
        progress={progress}
        onHover={setHoveredIndex}
        onWheel={handleWheel}
        onToggleExpand={toggleExpand}
        minCameraZ={NOCTIS_CARD_MIN_CAMERA_Z}
      />
      <div
        className="pointer-events-none absolute inset-3 sm:inset-6 md:inset-8"
        style={{ opacity: t }}
      >
        <ProjectCard
          project={project}
          innerScrollRef={(el) => registerInnerScroll(0, el)}
          mediaWrapperRef={(el) => {
            mediaRef.current = el;
          }}
          mediaTransform={mediaTransform}
          interactive={t > 0.05}
          onInteractiveEnter={() => {
            setHoveredIndex(0);
            setInteractiveIndex(0);
          }}
          onInteractiveLeave={() => setInteractiveIndex(null)}
          onPanelTap={() => toggleExpand(0)}
        />
      </div>
    </div>
  );
}

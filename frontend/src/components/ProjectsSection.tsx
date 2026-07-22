import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project } from "@/lib/api";
import ProjectCardScene from "@/components/ProjectCardScene";
import ProjectCard from "@/components/ProjectCard";
import { useCardExpand } from "@/hooks/useCardExpand";
import { cardExpandedScreenRect, crossfadeT, type ScreenRect } from "@/lib/cardLayout";

interface ProjectsSectionProps {
  projects: Project[];
  // Deferred mount signal from ScrollScenes — the shared card scene's
  // Three.js canvas only initializes once this section has actually
  // started fading into view, same as NoctisRepoCard in the AI Workflow
  // section, instead of every section's canvas running from page load.
  active: boolean;
}

export default function ProjectsSection({ projects, active }: ProjectsSectionProps) {
  const {
    progress,
    setHoveredIndex,
    setInteractiveIndex,
    handleWheel,
    toggleExpand,
    registerInnerScroll,
  } = useCardExpand(projects.length);

  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The demo-media box's own natural (untransformed) on-screen rect —
  // measured at rest only, since measuring it while its own transform
  // is active would read back the transformed position instead of its
  // true layout position. Stays valid through any later expand/collapse
  // cycle; only re-measured on resize (and only for cards at rest then).
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mediaRects = useRef<(ScreenRect | null)[]>(projects.map(() => null));
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useLayoutEffect(() => {
    mediaRefs.current.forEach((el, i) => {
      if (!el) return;
      if ((progressRef.current[i] ?? 0) > 0.01) return;
      const r = el.getBoundingClientRect();
      mediaRects.current[i] = { x: r.left, y: r.top, width: r.width, height: r.height };
    });
  }, [projects.length, viewport.width, viewport.height]);

  if (!active) {
    return <section className="relative z-10 h-full w-full" />;
  }

  return (
    <section className="relative z-10 h-full w-full">
      <ProjectCardScene
        projects={projects}
        progress={progress}
        onHover={setHoveredIndex}
        onWheel={handleWheel}
        onToggleExpand={toggleExpand}
      />
      {projects.map((project, i) => {
        const p = progress[i] ?? 0;
        // 0 while the 3D card is still growing (panel fully invisible),
        // ramping 0 -> 1 only once it's finished — the crossfade window.
        const t = crossfadeT(p);

        const finalMediaRect = mediaRects.current[i];
        let mediaTransform: string | undefined;
        if (finalMediaRect) {
          // Where the 3D card currently sits on screen — at any point in
          // the crossfade window this matches its actual (frozen, fully
          // grown) size and position exactly, so the handoff has no jump.
          const bigRect = cardExpandedScreenRect(
            i,
            projects.length,
            viewport.width,
            viewport.height,
            p,
          );
          const bigCenterX = bigRect.x + bigRect.width / 2;
          const bigCenterY = bigRect.y + bigRect.height / 2;
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
          <div
            key={project.id}
            className="pointer-events-none absolute inset-6 sm:inset-12 md:inset-16"
            style={{ opacity: t }}
          >
            <ProjectCard
              project={project}
              innerScrollRef={(el) => registerInnerScroll(i, el)}
              mediaWrapperRef={(el) => {
                mediaRefs.current[i] = el;
              }}
              mediaTransform={mediaTransform}
              // Every card's panel sits at the same absolute screen rect,
              // stacked by DOM order — only differing by opacity. Without
              // this, a collapsed-but-still-mounted card's own interactive
              // region (invisible, opacity 0) can sit on top of the
              // actually-visible expanded card's and silently steal its
              // hover/clicks.
              interactive={t > 0.05}
              onInteractiveEnter={() => {
                setHoveredIndex(i);
                setInteractiveIndex(i);
              }}
              onInteractiveLeave={() => setInteractiveIndex(null)}
              onPanelTap={() => toggleExpand(i)}
            />
          </div>
        );
      })}
    </section>
  );
}

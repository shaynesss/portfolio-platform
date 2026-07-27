import type { Project } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";
import { crossfadeT } from "@/lib/cardLayout";

interface RoseWindowProjectsOverlayProps {
  projects: Project[];
  progress: number[];
  setHoveredIndex: (index: number | null) => void;
  setInteractiveIndex: (index: number | null) => void;
  registerInnerScroll: (index: number, el: HTMLDivElement | null) => void;
  toggleExpand: (index: number) => void;
}

// The DOM half of the rose-window pane expand mechanic — mirrors
// ProjectsSection's own panel-rendering exactly (see git history), with
// one deliberate scope-cut: no mediaTransform seamless handoff.
// ProjectsSection's version of that trick solves cardExpandedScreenRect
// from cardLayout.ts's row-of-slabs camera math (cardBaseX, rowSpan,
// computeCameraZ) — none of which describes a radial wedge arrangement.
// Reworking that math for the rose window is real follow-up work, not
// something to fake here; until then the demo image just fades in at
// its normal panel position instead of visually growing out of the
// pane's exact on-screen spot.
export default function RoseWindowProjectsOverlay({
  projects,
  progress,
  setHoveredIndex,
  setInteractiveIndex,
  registerInnerScroll,
  toggleExpand,
}: RoseWindowProjectsOverlayProps) {
  return (
    <>
      {projects.map((project, i) => {
        const t = crossfadeT(progress[i] ?? 0);
        return (
          <div
            key={project.id}
            className="pointer-events-none fixed inset-6 z-10 sm:inset-12 md:inset-16"
            style={{ opacity: t }}
          >
            <ProjectCard
              project={project}
              innerScrollRef={(el) => registerInnerScroll(i, el)}
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
    </>
  );
}

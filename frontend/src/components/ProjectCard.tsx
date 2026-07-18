import type { Project } from "@/lib/api";
import DemoMedia from "@/components/DemoMedia";
import GithubStatCard from "@/components/GithubStatCard";
import { isTouchDevice } from "@/lib/isTouchDevice";

interface ProjectCardProps {
  project: Project;
  innerScrollRef?: (el: HTMLDivElement | null) => void;
  mediaWrapperRef?: (el: HTMLDivElement | null) => void;
  mediaTransform?: string;
  // Every card in the row is mounted at all times (only faded via
  // opacity), sharing the exact same screen rect — so a collapsed card's
  // own interactive region must not accept pointer events, or it (being
  // later/earlier in DOM order) can invisibly shadow whichever card is
  // actually visible underneath/on top at that same spot.
  interactive: boolean;
  // The GitHub stat card is the one spot in this panel with
  // pointer-events enabled (so it's clickable) — everything else passes
  // events through to the 3D card's canvas underneath so hover/scroll
  // keeps driving the expand animation. That means the canvas sees a
  // pointerleave the instant the cursor crosses onto this link, which
  // would otherwise read as "cursor left the card" and start the
  // snap-back. onInteractiveEnter/Leave pin a separate "interactive"
  // hover flag for this exact reason (see useCardExpand's
  // interactiveRef) rather than relying on event ordering between this
  // DOM element and the canvas's native pointer events, which isn't
  // guaranteed.
  onInteractiveEnter?: () => void;
  onInteractiveLeave?: () => void;
}

export default function ProjectCard({
  project,
  innerScrollRef,
  mediaWrapperRef,
  mediaTransform,
  interactive,
  onInteractiveEnter,
  onInteractiveLeave,
}: ProjectCardProps) {
  return (
    <article className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
      {/* Echoes the card's own look from before the scroll — its own
          demo image, heavily blurred — instead of a flat, unrelated
          panel background. A real <img> (not a CSS background-image)
          so crossOrigin can match the 3D card face's texture loader
          for this same URL — see DemoMedia's crossOrigin comment. */}
      {project.demoMediaType === "image" && (
        <img
          aria-hidden
          src={project.demoMediaUrl}
          crossOrigin="anonymous"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-3xl"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-zinc-950/70" />
      <div
        ref={innerScrollRef}
        data-scroll-region
        className="relative flex-1 overflow-y-auto overscroll-contain p-8"
        // The panel is pointer-events-none by default (see the interactive
        // prop comment below) so a collapsed-but-mounted card's writeup
        // never shadows the visible one. Desktop scrolls this region via
        // the wheel-hijack in useCardExpand's handleWheel regardless of
        // pointer-events, so it stays untouched; touch has no equivalent
        // wheel path, so it needs real hit-testing to scroll natively —
        // only ever turned on for the currently visible, interactive card.
        style={isTouchDevice && interactive ? { pointerEvents: "auto" } : undefined}
      >
        {/* mx-auto + max-w-xl centers this column as a block within the
            panel; items-start + text-left then left-aligns everything
            inside it — long writeups read far better left-aligned than
            centered, without losing the centered layout. */}
        <div className="mx-auto flex max-w-xl flex-col items-start text-left">
          <div
            ref={mediaWrapperRef}
            className="w-full"
            style={{
              transform: mediaTransform,
              transformOrigin: "center center",
            }}
          >
            <DemoMedia
              type={project.demoMediaType}
              url={project.demoMediaUrl}
              videoSource={project.videoSource}
            />
          </div>
          <h3 className="mt-6 text-3xl font-semibold text-zinc-50">
            {project.title}
          </h3>
          <div className="mt-4 flex flex-col gap-4">
            {/* Plain <p> collapses newlines by default — a writeup
                typed as separate paragraphs in the TUI would otherwise
                read as one run-on block here. Split on blank lines. */}
            {project.writeup.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line leading-relaxed text-zinc-400">
                {paragraph}
              </p>
            ))}
          </div>
          <div
            className={`mt-6 ${interactive ? "pointer-events-auto" : "pointer-events-none"}`}
            onPointerEnter={onInteractiveEnter}
            onPointerLeave={onInteractiveLeave}
          >
            <GithubStatCard
              url={project.githubUrl}
              stars={project.githubStars}
              language={project.githubLanguage}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

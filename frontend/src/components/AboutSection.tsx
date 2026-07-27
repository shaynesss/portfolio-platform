import type { AboutContent } from "@/lib/api";
import { withScheme } from "@/lib/url";

const TEXT_FADE_MS = 1600;
// A smoother deceleration than a plain ease-out, matching the same
// curve used for the section-to-section cross-dissolve.
const SMOOTH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TEXT_RISE_PX = 56;
const TEXT_BLUR_PX = 26;
const TEXT_MIN_SCALE = 0.9;

interface AboutSectionProps {
  content: AboutContent;
  // Externally driven, not a timer off its own mount — this section now
  // reveals mid-swing when the cathedral gate is clicked open, so the
  // caller (App) owns exactly when that happens.
  visible: boolean;
}

export default function AboutSection({ content, visible }: AboutSectionProps) {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const hidden = !visible && !prefersReducedMotion;

  return (
    <section
      className="relative z-10 mx-auto flex h-full max-w-3xl flex-col justify-center px-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${hidden ? TEXT_RISE_PX : 0}px) scale(${hidden ? TEXT_MIN_SCALE : 1})`,
        filter: `blur(${hidden ? TEXT_BLUR_PX : 0}px)`,
        transition: `opacity ${TEXT_FADE_MS}ms ${SMOOTH_EASE}, transform ${TEXT_FADE_MS}ms ${SMOOTH_EASE}, filter ${TEXT_FADE_MS}ms ${SMOOTH_EASE}`,
      }}
    >
      <h1 className="text-5xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
        Shayne Yong
      </h1>
      <p className="mt-8 text-xl leading-relaxed text-zinc-400">
        {content.body}
      </p>
      <div className="mt-12 flex gap-8 text-base font-medium text-zinc-300">
        <a
          href={withScheme(content.linkedinUrl)}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-white"
        >
          LinkedIn
        </a>
        <a
          href={withScheme(content.devpostUrl)}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-white"
        >
          Devpost
        </a>
        {content.githubUrl && (
          <a
            href={withScheme(content.githubUrl)}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            GitHub
          </a>
        )}
      </div>
    </section>
  );
}

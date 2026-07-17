import { useEffect, useState } from "react";
import type { AboutContent } from "@/lib/api";
import { LANDING_SEQUENCE_MS } from "@/components/DotBackground";

const TEXT_FADE_MS = 1600;
// Starts noticeably before the particle field is fully done staging in
// — waiting for the complete sequence made the landing screen feel slow.
const EARLY_START_MS = 750;
const TEXT_START_DELAY_MS = Math.max(0, LANDING_SEQUENCE_MS - EARLY_START_MS);
// A smoother deceleration than a plain ease-out, matching the same
// curve used for the section-to-section cross-dissolve.
const SMOOTH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const TEXT_RISE_PX = 56;
const TEXT_BLUR_PX = 26;
const TEXT_MIN_SCALE = 0.9;

interface AboutSectionProps {
  content: AboutContent;
}

export default function AboutSection({ content }: AboutSectionProps) {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    // Text starts fading in a bit before the particle field's staged
    // reveal is fully done, not after — the two tail ends overlap.
    const timer = setTimeout(() => setVisible(true), TEXT_START_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hidden = !visible && !prefersReducedMotion;

  return (
    <section
      className="relative z-10 mx-auto flex h-full max-w-2xl flex-col justify-center px-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${hidden ? TEXT_RISE_PX : 0}px) scale(${hidden ? TEXT_MIN_SCALE : 1})`,
        filter: `blur(${hidden ? TEXT_BLUR_PX : 0}px)`,
        transition: `opacity ${TEXT_FADE_MS}ms ${SMOOTH_EASE}, transform ${TEXT_FADE_MS}ms ${SMOOTH_EASE}, filter ${TEXT_FADE_MS}ms ${SMOOTH_EASE}`,
      }}
    >
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
        Shayne Yong
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-zinc-400">
        {content.body}
      </p>
      <div className="mt-10 flex gap-6 text-sm font-medium text-zinc-300">
        <a
          href={content.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-white"
        >
          LinkedIn
        </a>
        <a
          href={content.devpostUrl}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-white"
        >
          Devpost
        </a>
      </div>
    </section>
  );
}

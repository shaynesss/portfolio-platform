import { useEffect, useState } from "react";
import type { AboutContent } from "@/lib/api";
import { LANDING_SEQUENCE_MS } from "@/components/DotBackground";

const TEXT_FADE_MS = 1600;

interface AboutSectionProps {
  content: AboutContent;
}

export default function AboutSection({ content }: AboutSectionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    // Particles finish their staged reveal first; the text only starts
    // fading in once that's essentially done, not at the same time.
    const timer = setTimeout(() => setVisible(true), LANDING_SEQUENCE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="relative z-10 mx-auto flex h-full max-w-2xl flex-col justify-center px-6 transition-opacity ease-out"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${TEXT_FADE_MS}ms` }}
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

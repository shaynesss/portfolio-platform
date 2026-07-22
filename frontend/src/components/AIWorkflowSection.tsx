import type { AiWorkflowContent } from "@/lib/api";
import NoctisRepoCard from "@/components/NoctisRepoCard";

interface AIWorkflowSectionProps {
  content: AiWorkflowContent;
  // Deferred mount signal from ScrollScenes — the repo card's Three.js
  // scene only initializes once this section has actually started
  // fading into view, not preloaded alongside every other section.
  active: boolean;
}

export default function AIWorkflowSection({ content, active }: AIWorkflowSectionProps) {
  return (
    <section className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:gap-16 lg:py-0">
      <div className="flex max-w-md flex-col justify-center lg:w-2/5">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-zinc-400">
          {content.intro}
        </p>
      </div>
      <div className="flex w-full items-center justify-center lg:w-3/5">
        <div className="aspect-[4/3] w-full max-w-4xl">
          {active && <NoctisRepoCard repoCard={content.repoCard} />}
        </div>
      </div>
    </section>
  );
}

import type { AiWorkflowContent } from "@/lib/api";
import NoctisRepoCard from "@/components/NoctisRepoCard";

interface AIWorkflowSectionProps {
  content: AiWorkflowContent;
}

export default function AIWorkflowSection({ content }: AIWorkflowSectionProps) {
  return (
    <section className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center gap-10 px-6 py-16 lg:flex-row lg:items-stretch lg:gap-16 lg:py-0">
      <div className="flex max-w-xl flex-col justify-center lg:w-1/2">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-zinc-400">
          {content.intro}
        </p>
      </div>
      <div className="h-80 w-full sm:h-96 lg:h-[28rem] lg:w-1/2">
        <NoctisRepoCard repoCard={content.repoCard} />
      </div>
    </section>
  );
}

import type { AiWorkflowContent } from "@/lib/api";

interface AIWorkflowSectionProps {
  content: AiWorkflowContent;
}

export default function AIWorkflowSection({ content }: AIWorkflowSectionProps) {
  return (
    <section className="relative z-10 mx-auto flex h-full max-w-4xl flex-col justify-center px-6 py-16">
      <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
        {content.title}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
        {content.intro}
      </p>
      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
        {content.blocks.map((block) => (
          <div key={block.heading}>
            <h3 className="text-sm font-semibold text-zinc-200">
              {block.heading}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              {block.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

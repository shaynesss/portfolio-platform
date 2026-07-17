import type { Project } from "@/lib/api";
import DemoMedia from "@/components/DemoMedia";
import GithubStatCard from "@/components/GithubStatCard";

interface ProjectCardProps {
  project: Project;
  innerScrollRef?: (el: HTMLDivElement | null) => void;
  mediaWrapperRef?: (el: HTMLDivElement | null) => void;
  mediaTransform?: string;
}

export default function ProjectCard({
  project,
  innerScrollRef,
  mediaWrapperRef,
  mediaTransform,
}: ProjectCardProps) {
  return (
    <article className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
      {/* Echoes the card's own look from before the scroll — its own
          demo image, heavily blurred — instead of a flat, unrelated
          panel background. */}
      {project.demoMediaType === "image" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-30 blur-3xl"
          style={{ backgroundImage: `url(${project.demoMediaUrl})` }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-zinc-950/70" />
      <div ref={innerScrollRef} className="relative flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
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
          <p className="mt-4 leading-relaxed text-zinc-400">
            {project.writeup}
          </p>
          <div className="pointer-events-auto mt-6">
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

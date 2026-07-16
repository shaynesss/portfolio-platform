import type { Project } from "@/lib/api";
import DemoMedia from "@/components/DemoMedia";
import GithubStatCard from "@/components/GithubStatCard";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 backdrop-blur-sm">
      <DemoMedia
        type={project.demoMediaType}
        url={project.demoMediaUrl}
        videoSource={project.videoSource}
      />
      <h3 className="mt-6 text-2xl font-semibold text-zinc-50">
        {project.title}
      </h3>
      <p className="mt-3 leading-relaxed text-zinc-400">{project.writeup}</p>
      <div className="mt-6">
        <GithubStatCard
          url={project.githubUrl}
          stars={project.githubStars}
          language={project.githubLanguage}
        />
      </div>
    </article>
  );
}

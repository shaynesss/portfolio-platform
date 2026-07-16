import type { Project } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";

interface ProjectsSectionProps {
  projects: Project[];
}

export default function ProjectsSection({ projects }: ProjectsSectionProps) {
  return (
    <section className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-6">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}

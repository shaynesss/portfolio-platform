import { useEffect, useState } from "react";
import DotBackground from "@/components/DotBackground";
import AboutSection from "@/components/AboutSection";
import AIWorkflowSection from "@/components/AIWorkflowSection";
import ProjectsSection from "@/components/ProjectsSection";
import ScrollScenes from "@/components/ScrollScenes";
import { useProjects } from "@/hooks/useProjects";
import {
  getAboutContent,
  getAiWorkflowContent,
  type AboutContent,
  type AiWorkflowContent,
} from "@/lib/api";

function App() {
  const { projects } = useProjects();
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [aiWorkflow, setAiWorkflow] = useState<AiWorkflowContent | null>(null);

  useEffect(() => {
    getAboutContent().then(setAbout).catch(console.error);
    getAiWorkflowContent().then(setAiWorkflow).catch(console.error);
  }, []);

  return (
    <div className="relative text-foreground">
      <DotBackground />
      {about && aiWorkflow && (
        <ScrollScenes
          scenes={[
            () => <AboutSection content={about} />,
            (active) => <AIWorkflowSection content={aiWorkflow} active={active} />,
            () => <ProjectsSection projects={projects} />,
          ]}
        />
      )}
    </div>
  );
}

export default App;

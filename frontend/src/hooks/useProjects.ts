import { useEffect, useState } from "react";
import { getProjects, type Project } from "@/lib/api";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProjects().then((data) => {
      if (!cancelled) {
        setProjects(data);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, isLoading };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export type DemoMediaType = "image" | "video";
export type VideoSource = "youtube" | "self_hosted" | null;

export interface Project {
  id: string;
  slug: string;
  title: string;
  displayOrder: number;
  writeup: string;
  githubUrl: string;
  githubStars: number;
  githubLanguage: string | null;
  demoMediaType: DemoMediaType;
  demoMediaUrl: string;
  videoSource: VideoSource;
}

export interface AboutContent {
  body: string;
  linkedinUrl: string;
  devpostUrl: string;
  // Optional: older stored content predates this field.
  githubUrl: string | null;
}

export interface RepoCard {
  title: string;
  writeup: string;
  githubUrl: string;
  githubStars: number;
  githubLanguage: string | null;
  demoMediaUrl: string;
}

export interface AiWorkflowContent {
  title: string;
  intro: string;
  repoCard: RepoCard;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function getProjects(): Promise<Project[]> {
  return apiGet<Project[]>("/projects");
}

export async function getAboutContent(): Promise<AboutContent> {
  return apiGet<AboutContent>("/pages/about");
}

export async function getAiWorkflowContent(): Promise<AiWorkflowContent> {
  return apiGet<AiWorkflowContent>("/pages/ai-workflow");
}

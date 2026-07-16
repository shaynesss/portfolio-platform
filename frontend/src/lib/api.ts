import { MOCK_PROJECTS, MOCK_ABOUT, MOCK_AI_WORKFLOW } from "./mockData";

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
  githubLanguage: string;
  demoMediaType: DemoMediaType;
  demoMediaUrl: string;
  videoSource: VideoSource;
}

export interface AboutContent {
  body: string;
  linkedinUrl: string;
  devpostUrl: string;
}

export interface AiWorkflowBlock {
  heading: string;
  body: string;
}

export interface AiWorkflowContent {
  title: string;
  intro: string;
  blocks: AiWorkflowBlock[];
}

// Mock-backed for now (design-before-wiring) — these become real fetch
// calls to the FastAPI backend once the UI's data shape is approved.
export async function getProjects(): Promise<Project[]> {
  return MOCK_PROJECTS;
}

export async function getAboutContent(): Promise<AboutContent> {
  return MOCK_ABOUT;
}

export async function getAiWorkflowContent(): Promise<AiWorkflowContent> {
  return MOCK_AI_WORKFLOW;
}

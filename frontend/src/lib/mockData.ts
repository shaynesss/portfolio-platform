import type { AboutContent, AiWorkflowContent, Project } from "./api";

export const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    slug: "gmi-passpreview",
    title: "GMI! / PassPreview",
    displayOrder: 1,
    writeup:
      "Placeholder writeup — pending final copy on what this project does and how it was built.",
    githubUrl: "https://github.com/shaynesss/passpreview",
    githubStars: 0,
    githubLanguage: "TypeScript",
    demoMediaType: "image",
    demoMediaUrl: "/placeholder-demo.svg",
    videoSource: null,
  },
  {
    id: "2",
    slug: "ai-gmi",
    title: "AI.GMI",
    displayOrder: 2,
    writeup:
      "Placeholder writeup — pending final copy on what this project does and how it was built.",
    githubUrl: "https://github.com/shaynesss/ai-gmi",
    githubStars: 0,
    githubLanguage: "Python",
    demoMediaType: "image",
    demoMediaUrl: "/placeholder-demo.svg",
    videoSource: null,
  },
];

export const MOCK_ABOUT: AboutContent = {
  body: "Placeholder About copy — pending final bio.",
  linkedinUrl: "#",
  devpostUrl: "#",
};

// Locked copy from SPEC.md §4 — reproduced verbatim, not mock content.
export const MOCK_AI_WORKFLOW: AiWorkflowContent = {
  title: "Personal AI Workflow: Noctis",
  intro:
    "I got tired of re-teaching Claude the same process every project, and losing track of which markdown file was actually current across a dozen repos. So I built a system instead of repeating myself.",
  blocks: [
    {
      heading: "The second brain.",
      body: "An Obsidian vault, following Andrej Karpathy's pattern for LLM-maintained wikis — Claude re-reads and updates existing pages as new material lands, so it compounds instead of just growing. If it won't still be true in three months, it doesn't earn a page.",
    },
    {
      heading: "Claude Code ↔ Claude Desktop continuity.",
      body: "One process file, read live by both — no pasting the same rules into two places and watching them drift.",
    },
    {
      heading: "The build spine.",
      body: "Spec signed off before code, tasks kept small, every unstated assumption surfaced before implementation, a critic subagent that can flag correctness problems but can't fix them — so it can't rubber-stamp its own work — and an eight-step ship gate that stops at the first failure.",
    },
    {
      heading: "The connectors.",
      body: "An MCP connector (istefox) bridges Claude straight into the Obsidian vault as real tool calls mid-conversation — not something I copy-paste between windows. Planning and the knowledge base stay one system, not two I sync by hand.",
    },
    {
      heading: "Design before wiring.",
      body: "Screens get built against fake data first. Only once that's approved does the UI's data shape become the actual backend contract — never the other way round, so a rough first draft never quietly calcifies into the API.",
    },
    {
      heading: "The maintenance loop.",
      body: "Not one-and-done — the whole setup gets periodically re-audited against how I actually work, not left to rot as a document nobody revisits.",
    },
    {
      heading: "How a project moves.",
      body: "Spec approved in the vault → built task by task against the spine → cleared through all eight ship-gate steps → decisions filed back into the second brain, so the next project starts a step ahead.",
    },
  ],
};

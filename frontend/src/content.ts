/*
 * Everything the site says lives here. Edit a project's words in this file and the
 * card, the index card and the page's noscript fallback all follow.
 */

export type Category = "Hackathon" | "Client" | "Personal" | "In progress";

export interface Project {
  id: string;
  title: string;
  category: Category;
  date: string;
  badge?: { text: string; tone: "gold" | "live" };
  /** Dewey Decimal class and cutter, printed top-left on the index card. */
  callNumber: [string, string];
  /** Subject headings, library style; technical names go in `tools`. */
  tags: string[];
  /** "What it is": plain words, first. */
  description: string;
  how: string;
  /** "What it solves": the problem it takes away, and for whom. */
  solves: string;
  tools: string[];
  links: { label: string; href: string }[];
  /** From GitHub on 29 Sep 2026; shown when Alt is held. */
  commits: number;
}

export const PROJECTS: Project[] = [
  {
    id: "gmi",
    title: "GMI!",
    category: "Hackathon",
    date: "June 2026",
    badge: { text: "Track winner", tone: "gold" },
    callNumber: ["658.85", "GMI"],
    tags: ["Web scraping", "Digital wallet passes", "Large language models"],
    description:
      "A tool we built for Romax at Hackabury. Paste in any company's website and within seconds you get a working Apple or Google Wallet card in its branding.",
    how:
      "A FastAPI backend fetches the page with httpx and reads it with BeautifulSoup, while colorthief pulls the logo's colours. Gemini 2.5 Flash must answer in fixed-shape JSON with a confidence score, shown beside the pass. That fixed shape lets React build the pass field by field as it arrives.",
    solves:
      "Romax can show a prospect their own branded pass on the first call, instead of mocking one up by hand. Sites that block bots (Cloudflare, CAPTCHAs, 403s) still get a pass, inferred from what remains.",
    tools: ["FastAPI", "httpx", "BeautifulSoup", "colorthief", "Gemini 2.5 Flash", "React", "Vite"],
    links: [{ label: "Code", href: "https://github.com/shaynesss/Hackabury-June1-2" }],
    commits: 19,
  },
  {
    id: "aigmi",
    title: "AI.GMI",
    category: "Hackathon",
    date: "May 2026",
    badge: { text: "Track winner", tone: "gold" },
    callNumber: ["650.14", "AIG"],
    tags: ["Multiagent systems", "Résumés (Employment)--Evaluation", "Speech synthesis"],
    description:
      "AI.GMI grades and roasts your CV. Upload a PDF, pick an industry, and get a score for each section and the three to five fixes that matter most. Then a synthetic voice reads out a short roast.",
    how:
      "Two Gemini 2.5 Flash agents run in turn behind a FastAPI service. The grader scores six sections and must reply in strict JSON, so the page can always read it. The roaster reads the CV and the scores, and ElevenLabs voices its three sentences. It ran live on a Vultr server through judging.",
    solves:
      "Students rarely get specific feedback on a CV. This scores it against what recruiters in their chosen industry expect, and names the few fixes worth making, in seconds.",
    tools: ["FastAPI", "pdfplumber", "Gemini 2.5 Flash", "ElevenLabs", "React", "Vite", "Vultr", "Ubuntu"],
    links: [{ label: "Code", href: "https://github.com/shaynesss/KentHackIt-May9-10" }],
    commits: 33,
  },
];

/** What the ajar drawer holds: projects still being written, deliberately unnamed. */
export const IN_PROGRESS: Project = {
  id: "wip",
  title: "Work in progress",
  category: "In progress",
  date: "2026–",
  callNumber: ["", ""],
  tags: [],
  description: "",
  how: "",
  solves: "",
  tools: [],
  links: [],
  commits: 0,
};

/** Library Bureau card stocks, one per category. */
export const STOCK: Record<Category, string> = {
  Hackathon: "#D8C39D",
  Client: "#E2B8A4",
  Personal: "#A9BCCD",
  "In progress": "#ECE5D3",
};

/** The eight hidden details, in the order the bottle's note lists them. */
export const SECRETS = [
  ["cord", "the pull cord"],
  ["ripple", "the water"],
  ["stone", "a skipped stone"],
  ["dim", "the dimmer"],
  ["moths", "the moths"],
  ["bottle", "the bottle"],
  ["noctis", "the word"],
  ["chart", "the count"],
] as const;
export type Secret = (typeof SECRETS)[number][0];

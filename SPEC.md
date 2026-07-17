# Portfolio Platform — Phase 1 Spec

Status: Definition, PRD, EDD, and Design Brief all locked (2026-07-16). Ready for Phase 2 (Setup) in Claude Code.

---

## 1. Definition

**What we're building:** A single-page, scroll-driven portfolio site presenting Shayne and his projects as an interactive experience rather than a static resume page. Content is managed through a Python TUI (dual-client architecture) so the public site stays fully read-only. Built to hold up to 6 project slots, editable at any time via the TUI — v1 ships populated with exactly 2 (GMI!/PassPreview, AI.GMI).

**Why:** Existing hackathon wins and skills have no polished, personal-feeling home recruiters can be pointed to. A generic resume PDF doesn't demonstrate actual build process or make the projects feel explorable — this does both.

**Who it's for:** Fintech and AI-agent recruiters/hiring managers evaluating Shayne for grad-scheme and internship roles, landing via CV link or direct share.

**Success criteria:**
- A recruiter can land on the page, understand who Shayne is and how he works with AI, explore both projects in depth (including live GitHub stats), and reach LinkedIn, Devpost, and GitHub — all without leaving the page or hitting a dead end.
- The experience feels distinctly personal, not a templated portfolio — the scroll/hover interaction is a deliberate part of that, not decoration.
- The two hackathon projects read as genuine proof of shipped, working software (via linked, verifiable GitHub repos), not just claims.
- Site is live at a real URL, not just running locally, before it goes on the CV.

---

## 2. PRD

### Core features (must-haves)

- **About section** (top of page), with LinkedIn, Devpost, and GitHub links at the bottom of it.
- **"Personal AI Workflow: Noctis" section** — locked copy, see Design Brief section 4 below.
- **Projects section** — schema supports up to 6 slots; 2 populated at launch.
- **Each project has two states:**
  - *Collapsed:* a suspended, reflective card showing the project's own demo media on its face, gently swaying in place (see Design Brief section 3).
  - *Expanded:* demo media, title, "about this project" writeup, GitHub stat card — fills most of the viewport but leaves a margin (not full-bleed; background stays visible at the edges).
- **Expand mechanism** (see Design Brief section 5 for full detail — hover+scroll on desktop, tap on mobile, click/tap always works as a fallback regardless of gesture support).
- **GitHub stat card** inside the expanded view (stars, primary language, etc.) — clickable, exits to the actual repo.
- **Demo media**, per project: `image` or `video` via `demo_media_type` + `demo_media_url` (+ `video_source` when type is video — starts as YouTube unlisted, swappable later without a schema change).
- **TUI is the sole write path** — add/edit/remove project slots (up to 6), edit About/AI Workflow page content, trigger GitHub stat refresh (manual, also fires automatically on "add project").

### Out of scope (explicit, v1)

- Blog/writing section
- Contact form (links only, no in-page form)
- Testimonials/recommendations
- Resume PDF download
- Dark/light mode toggle
- Analytics/visitor tracking
- Custom domain (ships on default Vercel URL)
- `pipx`-installable TUI packaging

### User flow

Landing (dot-field background fades in, dots out of sync with each other) → About section (LinkedIn, Devpost, and GitHub links at the bottom) → AI Workflow section → Projects section, reflective cards floating/swaying independently → hover + scroll a card to expand it in place; if the writeup is long, continued scroll once fully expanded scrolls the content internally rather than continuing to expand → scroll back (or move cursor off, which triggers a slow snap-back) to collapse → repeat for the next card. The whole portfolio is the shareable unit — no per-project deep link, no route changes anywhere on the page.

---

## 3. EDD

### Architecture overview

Shared FastAPI + PostgreSQL backend (Railway), serving two clients:
- **Public frontend** — React/Vite, deployed to Vercel. Read-only. Never talks to third-party APIs directly.
- **TUI** — Python Textual, local only, not deployed. Sole write path, single-user token auth, no admin surface exposed on the web side.

### Tech stack + justification

- **FastAPI + PostgreSQL (Railway)** — persistent backend, real DB connections. Matches the standing rule: Railway for anything with a real backend, Vercel for static/serverless.
- **React/Vite (Vercel)** — public site, static/serverless-shaped, no backend logic of its own.
- **Python Textual (local)** — reuses the existing write-path pattern rather than building a second admin UI.
- **Three.js** — shared background dot field + the reflective-card rendering for project cards.
- **GitHub REST API** — free, read-only, backend-authenticated via a personal access token (5,000 req/hr authenticated vs. 60/hr unauthenticated — comfortable margin for a handful of fetches).

### Data model

`projects`:
- `id`, `slug`, `title`, `display_order` (governs up to 6 slots, TUI-editable)
- `writeup` (the "about this project" text)
- `github_url`, `github_stars`, `github_language`, `github_last_fetched_at`
- `demo_media_type` (`image` / `video`), `demo_media_url`, `video_source` (nullable, `youtube` / `self_hosted`)
- `created_at`, `updated_at`

`pages`:
- Singleton content blocks — About section body, LinkedIn/Devpost/GitHub URLs, AI Workflow section body (locked copy below).

### External dependencies

- **GitHub REST API** — backend-side only, PAT stored as env var. Fetched on TUI "add project" and on manual TUI-triggered refresh. **No scheduled cron** — stats go stale between manual touches, which is acceptable since stars/language don't change fast.

### Deployment target

Railway (FastAPI + Postgres backend), Vercel (React frontend) — locked per the build spine's deployment rule, confirmed here rather than defaulted.

### Frontend implementation notes

**Background dot field.** Adapted from the `dotted-surface` pattern: Three.js particle field, `fixed inset-0` for full-page coverage. Needs: `next-themes` stripped (no dark/light toggle in scope — hardcode the dark palette), a custom per-particle opacity fade animation with a randomized phase offset per particle for the "fade in/out of sync" loading effect (the reference component only animates Y-position via sine wave, not opacity — this is new work), and `prefers-reduced-motion` handling (not present in the reference component). Also includes a cursor-repel interaction: dots within a small radius of the pointer spring away from it and ease back to their home position once the cursor moves off, giving the field a subtle reactive feel. Disabled under `prefers-reduced-motion` along with the rest of the field's motion.

**Card rendering.** One shared Three.js scene/renderer, **not** one WebGL canvas per card — running up to 6 independent WebGL contexts simultaneously is a real performance risk. Multiple mesh instances of the same rounded-box card geometry, positioned per card, each with its own resting tilt, idle-sway phase/speed, and swipe-twirl state so cards don't read as synced copies of one asset. Material: `MeshPhysicalMaterial`, polished dark metal (high metalness, low roughness, clearcoat) on the edges/back for a mirror-like reflective slab, reflecting an environment map built from the same dotted-starfield motif as the page background; the front face carries a separate, less-metallic material instance with the project's own demo media applied as a texture (image, YouTube thumbnail, or a live video texture for self-hosted video) so each card shows a live preview of the project it represents.

**Expand mechanism.** The `scroll-expansion-hero` reference component is **not used as-is** — it hijacks the whole page's wheel/touch events for a single full-viewport takeover, which doesn't repeat cleanly across up to 6 cards and has no click/tap trigger built in. Replaced with a **hover-scoped, per-card scroll capture**: scroll only drives a given card's expand progress while the cursor is over that specific card; the page scrolls normally everywhere else. Full detail in Design Brief section 5. This also needs `next/image` (Next.js-only) ported to a plain `<img>` if any of the reference component's structure is reused.

### Folder structure

```
portfolio-platform/
├── backend/                      # FastAPI, deployed to Railway
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint
│   │   ├── models.py              # SQLAlchemy models: Project, Page
│   │   ├── schemas.py             # Pydantic request/response schemas
│   │   ├── database.py            # DB session/engine setup
│   │   ├── routers/
│   │   │   ├── projects.py        # public GET endpoints (read-only)
│   │   │   ├── pages.py           # public GET endpoints (About, AI Workflow)
│   │   │   └── admin.py           # TUI-only write endpoints, token-auth gated
│   │   ├── services/
│   │   │   └── github.py          # GitHub API fetch + cache-write logic
│   │   └── auth.py                # single-user token auth for admin routes
│   ├── alembic/                   # DB migrations
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/                      # React/Vite, deployed to Vercel
│   ├── src/
│   │   ├── components/
│   │   │   ├── AboutSection.tsx
│   │   │   ├── AIWorkflowSection.tsx
│   │   │   ├── ProjectCard.tsx    # collapsed + expanded states
│   │   │   ├── GithubStatCard.tsx
│   │   │   ├── DemoMedia.tsx      # branches on demo_media_type
│   │   │   ├── ProjectCardScene.tsx # shared Three.js scene, per-project mesh instances
│   │   │   └── DotBackground.tsx  # full-page particle field
│   │   ├── hooks/
│   │   │   ├── useProjects.ts     # fetches from backend, no direct GitHub calls
│   │   │   └── useCardExpand.ts   # per-card hover-scoped scroll capture
│   │   ├── lib/api.ts              # backend API client
│   │   └── App.tsx
│   ├── .env.example
│   └── package.json
│
├── tui/                           # Python Textual, local-only, sole write path
│   ├── app.py
│   ├── screens/
│   │   ├── project_list.py
│   │   ├── project_edit.py        # add/edit/reorder/delete, up to 6 slots
│   │   └── page_edit.py           # About / AI Workflow content editing
│   ├── api_client.py               # talks to backend admin routes
│   └── .env.example
│
├── CLAUDE.md                      # project-specific overrides only
├── README.md
├── CHANGELOG.md
└── STATUS.md
```

---

## 4. Design Brief

### Palette & material

Dark charcoal-grey background throughout. Project cards updated from the original glass-shard direction to **suspended reflective cards**: polished dark metal edges/back (mirror-like, picking up the same dotted-starfield environment reflections as an accent), with the project's own demo media shown on the card's front face as a live preview. See the EDD's frontend implementation notes for the material breakdown (reflective frame material vs. the less-metallic, texture-mapped front-face material).

### Background

Full-page dot field (Three.js particle system). Landing/loading animation: dots fade in and out of sync with each other (each particle on its own opacity cycle with a randomized phase offset), not a uniform fade. Also reacts to the cursor: dots within a small radius spring away from the pointer and ease back to their home position once it moves off.

### Node / card asset

One shared rounded-box card geometry, reused across every project card — not a unique model per project. Rendered live in Three.js (not pre-rendered video/image). Each card's instance has its own fixed resting tilt and idle-sway phase/speed so the up-to-6 cards never read as copies of one synced asset. Motion is a bounded, gentle sway around that resting tilt — not a continuous tumble — so the card is always legible and reads as floating in place rather than spinning. Hovering and dragging (in any direction) imparts a small extra twirl impulse on top of the idle sway; the impulse decays quickly and the card eases back to its resting, camera-facing tilt rather than drifting or freezing at an odd angle.

### AI Workflow section copy (locked)

> **Personal AI Workflow: Noctis**
>
> I got tired of re-teaching Claude the same process every project, and losing track of which markdown file was actually current across a dozen repos. So I built a system instead of repeating myself.
>
> **The second brain.** An Obsidian vault, following Andrej Karpathy's pattern for LLM-maintained wikis — Claude re-reads and updates existing pages as new material lands, so it compounds instead of just growing. If it won't still be true in three months, it doesn't earn a page.
>
> **Claude Code ↔ Claude Desktop continuity.** One process file, read live by both — no pasting the same rules into two places and watching them drift.
>
> **The build spine.** Spec signed off before code, tasks kept small, every unstated assumption surfaced before implementation, a critic subagent that can flag correctness problems but can't fix them — so it can't rubber-stamp its own work — and an eight-step ship gate that stops at the first failure.
>
> **The connectors.** An MCP connector (istefox) bridges Claude straight into the Obsidian vault as real tool calls mid-conversation — not something I copy-paste between windows. Planning and the knowledge base stay one system, not two I sync by hand.
>
> **Design before wiring.** Screens get built against fake data first. Only once that's approved does the UI's data shape become the actual backend contract — never the other way round, so a rough first draft never quietly calcifies into the API.
>
> **The maintenance loop.** Not one-and-done — the whole setup gets periodically re-audited against how I actually work, not left to rot as a document nobody revisits.
>
> **How a project moves.** Spec approved in the vault → built task by task against the spine → cleared through all eight ship-gate steps → decisions filed back into the second brain, so the next project starts a step ahead.

### Expand mechanism — full detail

- **Trigger:** desktop — hover over a card, then scroll, drives that specific card's expand progress from 0% to 100%. Scroll only affects the hovered card; the page itself doesn't move while a card is being hovered. Mobile — no hover exists, so this becomes tap-to-expand in one step instead of a progressive hover+scroll zoom.
- **Universal fallback:** click/tap always works to expand a card, on any device, regardless of gesture or browser support.
- **Independence:** each card's expand state is self-contained. If the cursor moves directly from card A to card B mid-expand, A independently starts its slow snap-back while B independently starts its own expand from collapsed — they never interact with each other.
- **Cursor drift:** if the cursor drifts off a card mid-expand, it slowly snaps back to collapsed rather than freezing in place or resetting instantly.
- **Overflow behavior:** once a card reaches 100% expanded, continued forward scroll (while still hovering) scrolls the writeup content *inside* the expanded card rather than doing nothing. Scrolling backward from the top of that inner content is what resumes the collapse animation.
- **Expanded sizing:** fills most of the viewport but leaves a margin — not full-bleed. The dot-field background stays visible around the edges even at full expansion, so the card still reads as floating in the scene rather than becoming a fullscreen modal.

### Contact placement

LinkedIn, Devpost, and GitHub links live at the bottom of the About section — not a separate footer or contact block.

### Component evaluation notes

Two 21st.dev candidates were evaluated against the above; neither is used as a drop-in:

- **`scroll-expansion-hero`** — real reference for the expand mechanic's visual feel, but its actual event-handling (full-page wheel hijack, single-instance state, no click fallback, `next/image` dependency) doesn't fit the hover-scoped, repeatable-per-card, Vite-based design locked above. Treat as visual/interaction inspiration only.
- **`dotted-surface`** — good structural starting point for the background (already full-page, already Three.js), but needs `next-themes` removed, the fade-in/out-of-sync opacity animation built from scratch, and `prefers-reduced-motion` handling added.

---

*End of Phase 1 spec. Next: Phase 2 (Setup) in Claude Code — repo creation, `.env.example`, project-level `CLAUDE.md`, folder structure per the EDD above.*

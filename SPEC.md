# Portfolio Platform — Phase 1 Spec

Status: Definition, PRD, EDD, and Design Brief all locked (2026-07-16). Ready for Phase 2 (Setup) in Claude Code.

**Frontend Overhaul 2, "The Shallows", locked 2026-09-29 (Track: Overhaul).** Replaces the whole frontend again. The cathedral below was scrapped on 2026-08-06 and never shipped. The site is now one screen: a code-painted night scene in which a library card catalogue stands in still water, lit by a lamp. Each drawer is a project; the lamp is Noctis OS. The frontend no longer reads the backend: content is typed files in the repo. Full detail in §5 at the end of this file, which supersedes every frontend section above it (PRD user flow, EDD frontend notes and cathedral architecture, the whole Design Brief). Signed off by Shayne on 2026-09-29 ("start building it out now, replacing the old portfolio URL") after four rounds of clickable sketches.

**Frontend Overhaul, Cathedral redesign, locked 2026-07-25, scrapped 2026-08-06 (never deployed).** Ground-up rework of the frontend's narrative and visual system, replacing the independent-section/crossfade model with a single continuous scroll-driven camera flythrough of a stylized cathedral. See the addenda in PRD §2 ("Frontend narrative overhaul"), EDD §3 ("Cathedral scene architecture"), and Design Brief §4 ("Cathedral redesign") — each supersedes the sections it touches; untouched decisions (data model, backend, TUI, deployment targets) stay locked as-is.

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

- **About section**. **Redesigned 2026-07-25** (cathedral overhaul): no longer a static top-of-page block — revealed mid-swing when the entry gate is opened, see "Frontend narrative overhaul" below. Copy content and the LinkedIn/Devpost/GitHub links at its bottom are unchanged, only the staging/reveal mechanism changes.
- **"How I Work" section** — locked copy, see Design Brief section 4 below. Two-column layout — left column is the locked writeup paragraph; right column is a single "repo showcase card" reusing the exact same 3D card mechanic as a Projects-section card (reflective shard, hover+scroll expand, GitHub stat card), pointing at the Noctis OS repo instead of a portfolio project. Expand is **contained to its own column** (writeup never gets covered), not a full-viewport takeover like a project card's expand — a deliberate scoping choice, not a missing feature. **Staged inside the cathedral nave as of the 2026-07-25 cathedral overhaul** (see below) — content, copy, and the showcase card's own reflective-slab shape are unchanged; only its environment changes.
- **Projects section** — schema supports up to 6 slots; 2 populated at launch. **Redesigned 2026-07-25** (cathedral overhaul): the 6 slots are now the 6 stained-glass panes of the cathedral's rose window, revealed at the end of the flythrough — see "Frontend narrative overhaul" below.
- **Each project has two states:**
  - *Collapsed:* **redesigned 2026-07-25** — a stained-glass rose-window pane (wedge shape) showing the project's own demo media as its backlit "glass," instead of a suspended reflective card slab (see Design Brief section 4, "Cathedral redesign").
  - *Expanded:* demo media, title, "about this project" writeup, GitHub stat card — fills most of the viewport but leaves a margin (not full-bleed; background stays visible at the edges). Unchanged by the cathedral overhaul.
- **Expand mechanism** (see Design Brief section 5 for full detail — hover+scroll on desktop, tap on mobile, click/tap always works as a fallback regardless of gesture support). Unchanged by the cathedral overhaul — only the collapsed-state shape changes (above), the interaction mechanic itself carries over 1:1 onto the new pane shape.
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

### User flow (superseded 2026-07-25 — see "Frontend narrative overhaul" below)

**Kept for history, not reproduced on the live site.** Landing (dot-field background fades in, dots out of sync with each other) → About section (LinkedIn, Devpost, and GitHub links at the bottom) → AI Workflow section → Projects section, reflective cards floating/swaying independently → hover + scroll a card to expand it in place; if the writeup is long, continued scroll once fully expanded scrolls the content internally rather than continuing to expand → scroll back (or move cursor off, which triggers a slow snap-back) to collapse → repeat for the next card. The whole portfolio is the shareable unit — no per-project deep link, no route changes anywhere on the page.

### Frontend narrative overhaul (locked 2026-07-25, Track: Overhaul)

Replaces the User flow above. A single continuous scroll-driven camera flythrough of a stylized, dark cathedral (Notre-Dame de Reims gate + rose window as the visual reference — two user-supplied photos analyzed into the Design Brief, section 4). Four beats:

1. **Gate, closed.** Landing state — cathedral exterior, carved stone archway, statue-lined jambs, double wood doors, framed head-on. Idle hover interaction: the doors crack open slightly and a shaft of light spills through the gap, then eases shut again on hover-out.
2. **Gate opens.** The one **click**-driven beat on the page (tap on mobile) — everything else is scroll. Clicking/tapping the gate swings both doors open on their hinges; the About Me copy (bio + LinkedIn/Devpost/GitHub links, content unchanged from the old About section) fades in mid-swing, over the widening gap. **Scroll is inert until this click happens** — it's the one deliberate "enter" gesture. Once opened, the gate stays open for the rest of the session (scrolling back up does not require re-clicking it).
3. **Interior pan-up.** Continued scroll glides the camera forward through the now-open doorway into a dark, deliberately vague nave, tilting upward but holding short of the rose window. "How I Work" (locked copy + the Noctis OS showcase card, both unchanged in content and the card's own shape) appears while the camera holds this framing.
4. **Rose window reveal.** Further scroll completes the pan to frame the stained-glass rose window head-on. Its 6 wedge-shaped panes are the Projects section (1:1 with the existing up-to-6-slot schema) — same expand mechanism as today (hover+scroll on desktop, tap on mobile, click/tap fallback always available, independent per-pane state, GitHub stat card, inner-scroll overflow on long writeups), only the collapsed shape changes from card-slab to glass pane.

Scrolling back up from the rose window reverses the camera path symmetrically back through the nave to the open gate. No audio (evaluated, explicitly declined — see Design Brief). The whole portfolio remains the single shareable unit — no per-project deep link, no route changes anywhere on the page.

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
- **AI Workflow content, updated 2026-07-22:** `title`, `intro` (the left-column writeup), `repoCard` (`title`, `writeup` — shown inside the card's expanded panel, `githubUrl`, `githubStars`, `githubLanguage` — both fetched server-side same as a project's, `demoMediaUrl`). Replaces the earlier `blocks: [{heading, body}]` shape entirely — no back-compat kept, the TUI/API always write the new shape.

### External dependencies

- **GitHub REST API** — backend-side only, PAT stored as env var. Fetched on TUI "add project" and on manual TUI-triggered refresh. **No scheduled cron** — stats go stale between manual touches, which is acceptable since stars/language don't change fast.

### Deployment target

Railway (FastAPI + Postgres backend), Vercel (React frontend) — locked per the build spine's deployment rule, confirmed here rather than defaulted.

### Frontend implementation notes

**Background dot field.** Adapted from the `dotted-surface` pattern: Three.js particle field, `fixed inset-0` for full-page coverage. Needs: `next-themes` stripped (no dark/light toggle in scope — hardcode the dark palette), a custom per-particle opacity fade animation with a randomized phase offset per particle for the "fade in/out of sync" loading effect (the reference component only animates Y-position via sine wave, not opacity — this is new work), and `prefers-reduced-motion` handling (not present in the reference component). Also includes a cursor-repel interaction: dots within a small radius of the pointer spring away from it and ease back to their home position once the cursor moves off, giving the field a subtle reactive feel. Disabled under `prefers-reduced-motion` along with the rest of the field's motion.

**Card rendering.** One shared Three.js scene/renderer, **not** one WebGL canvas per card — running up to 6 independent WebGL contexts simultaneously is a real performance risk. Multiple mesh instances of the same rounded-box card geometry, positioned per card, each with its own resting tilt, idle-sway phase/speed, and swipe-twirl state so cards don't read as synced copies of one asset. Material: `MeshPhysicalMaterial`, polished dark metal (high metalness, low roughness, clearcoat) on the edges/back for a mirror-like reflective slab, reflecting an environment map built from the same dotted-starfield motif as the page background; the front face carries a separate, less-metallic material instance with the project's own demo media applied as a texture (image, YouTube thumbnail, or a live video texture for self-hosted video) so each card shows a live preview of the project it represents.

**Expand mechanism.** The `scroll-expansion-hero` reference component is **not used as-is** — it hijacks the whole page's wheel/touch events for a single full-viewport takeover, which doesn't repeat cleanly across up to 6 cards and has no click/tap trigger built in. Replaced with a **hover-scoped, per-card scroll capture**: scroll only drives a given card's expand progress while the cursor is over that specific card; the page scrolls normally everywhere else. Full detail in Design Brief section 5. This also needs `next/image` (Next.js-only) ported to a plain `<img>` if any of the reference component's structure is reused.

### Cathedral scene architecture (2026-07-25, Track: Overhaul)

Supersedes the "Background dot field," "Card rendering," and "Expand mechanism" notes above for the collapsed-state visuals and scene structure; the expand *interaction* mechanic (hover+scroll capture, click/tap fallback, per-card independence) is unchanged and still governed by those notes plus Design Brief section 5.

- **Single continuous scene, not per-section canvases.** The current per-section lazy-mount/crossfade model (`ScrollScenes` mounting an independent Three.js canvas per section) is replaced by **one shared Three.js scene/renderer spanning the whole page**. A single camera rig's position/rotation is driven by overall scroll progress through named waypoints (gate-closed → gate-open → interior-pan → rose-window), rather than crossfading between separate section canvases. This is a bigger architectural change than the card-rendering rule it replaces, but keeps the same underlying constraint that motivated it: at most one live WebGL context for the whole page, never one per element.
- **Gate asset.** Stylized, low-poly/procedural geometry (arch shape, statue-lined jambs suggested with simple repeated forms rather than modeled individually, two door meshes) — not photoreal, matching the "vague, dark, let contents shine" direction from both reference photos. Hover state: a small Y-axis rotation crack on each door mesh plus an emissive plane/spotlight simulating light through the gap. Click/tap: doors rotate open on their hinge (Y-axis), synced with the About copy's fade-in.
- **Rose window / project panes.** Six wedge/petal-shaped plane meshes arranged radially (real rose-window tracery layout, referencing the supplied interior photo), each carrying the project's `demo_media_type` texture as before — reusing the existing texture-mapping approach from today's cards, just remapped onto a wedge instead of a rounded-box slab. Treated as backlit "glass": an emissive/rim-lit material rather than the current polished-metal card material. The expanded-state panel (writeup + GitHub stat card) is unchanged — it was already a flat UI overlay, not shaped like the collapsed card.
- **Nave environment.** A simple, dark, low-detail extruded arch/tunnel geometry for the "How I Work" beat — enough to read as cathedral interior without being a modeled space. The Noctis OS showcase card keeps its current reflective-slab geometry/material (per Shayne's call, 2026-07-25), just repositioned inside this nave instead of on the flat charcoal background.
- **Atmosphere.** The dot-field background becomes dust motes drifting in implied light shafts — a direct evolution of the existing `DotBackground` component's cursor-repel and `prefers-reduced-motion` logic (same interaction rules, restyled particles), not a new system. Persists across all three interior beats as ambient atmosphere.
- **No audio** — evaluated (hashgraphvc.com reference had a sound toggle), explicitly declined by Shayne. Not in scope.

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

### Cathedral redesign (locked 2026-07-25, Track: Overhaul)

Ground-up rework of the palette, environment, and collapsed-card asset. Supersedes "Palette & material," "Background," and parts of "Node / card asset" above for anything not explicitly carried over. Reference: two user-supplied photos of Notre-Dame de Reims — (1) the portal/gate, carved stone archivolt with statue-lined jambs, wood double doors, stained glass visible at the edge; (2) the interior rose window above the doors, radial jewel-tone stained-glass tracery in deep blues, reds, and gold against dark stone. Both analyzed directly into this brief (no Design Lodge entries existed for this direction — a real gap, worth saving these back to the Lodge once the build lands).

**Palette & material.** Overall darkness carries over from the current dark-charcoal direction — stone grey and near-black shadow dominate every beat, with the stained glass as the only strong, saturated color in the whole piece (deep blues, reds, gold), deliberately so it reads as the payoff. Wood tone (warm, dark-stained) for the gate doors, muted stone grey for all carved/architectural surfaces. No metallic "polished slab" material anywhere except the Noctis OS card, which keeps its current material treatment unchanged.

**Gate asset.** Modeled loosely on reference photo (1): pointed stone archway, a suggestion of statue-lined jambs (repeated simple forms, not individually sculpted), two large wood-plank doors meeting at a center seam. Kept deliberately vague/low-detail — texture and lighting carry the read, not geometric fidelity. Idle: doors ajar a few degrees on hover, warm light bleeding through the gap. Open: both doors rotate outward on their hinges.

**Rose window / project panes.** Modeled loosely on reference photo (2): a radial wheel of wedge-shaped stained-glass panes around a center point, stone tracery separating them. Each of the 6 panes is one project slot, its demo media rendered as if backlit glass (emissive/rim-lit, not the current metallic card face). Vague/dark stone surround, same as the gate — the panes themselves are the only bright, colorful thing on screen at that beat.

**Camera choreography:**

| Beat | Shot | Trigger |
|---|---|---|
| 1 | Static, head-on framing on the closed gate | Landing / idle |
| 1a | Doors crack open a few degrees, light shaft through the gap, eases back on hover-out | Hover (desktop only) |
| 2 | Doors swing fully open on their hinges; About copy fades in mid-swing | Click / tap |
| 3 | Camera glides forward through the doorway into the nave, tilts upward, holds short of the window; "How I Work" content appears | Scroll (post-click only) |
| 4 | Camera completes the pan/tilt to frame the rose window head-on; panes become interactive | Continued scroll |
| — | Camera path reverses symmetrically back to beat 1 (gate stays open) | Scroll back up |

**Atmosphere.** Dust motes drifting through implied light shafts replace the dot field — same cursor-repel and `prefers-reduced-motion` behavior, restyled. See EDD for the component-level detail.

**Audio.** Evaluated against the hashgraphvc.com reference (which has a sound toggle) and explicitly declined by Shayne, 2026-07-25. Not in scope.

### Architectural density pass (locked 2026-07-27, Track: Overhaul — reverses the low-detail call above)

Shayne reviewed the built block-out plus a first material/lighting pass against the two reference photos directly (re-shared this session, from his Photos library — the originals were never saved anywhere on disk after the first pass, a real gap now closed by saving both into Design Lodge once this lands) and rejected the "vague/low-detail, texture and lighting carry the read" call from the Gate asset/Rose window sections above as too sparse. **That call is superseded — full replica density is the target now, not a stylized suggestion.** What the reference photos actually show, that the block-out didn't: tiered rows of carved statue niches running the full height of both jambs and continuing around the arch itself, bundled/clustered slender columns (not a single flat pillar), a blind-arcade band of narrow arched window openings between the door lintel and the rose window (on the same interior wall, visible once the camera turns to face the window), visible ribbed vault ceiling overhead, and a rose window with 16-20+ petals across two rings — not 6 large wedges.

**Gate.** Bundled colonnettes per jamb (several thin columns of varying radius grouped together, not one box). Tiered niche figures — many rows × 2-3 figures per row up each jamb, continuing as small arched niches following the curve of the arch itself — instanced (`THREE.InstancedMesh`), still simple repeated forms per figure (not individually sculpted), but dense/tiled rather than 4 sparse capsules. Arch itself becomes a real curved pointed-Gothic shape (not two flat angled slabs) so concentric voussoir bands can layer around it. Doors gain iron strap-hinge details (raised bands + stud rows) rather than reading as plain planks. Two larger flanking statues at ground level beside the doors, bigger scale than the niche figures, matching photo 2.

**Nave.** No longer an empty textured box. Engaged half-columns run along both side walls at a regular rhythm as the camera travels through: The gate-facing interior wall (visible on the turn-to-the-window beat) gets the blind-arcade band of narrow arched openings between the door and the rose window. Ceiling gets a ribbed-vault look — cheapest correct approach is a dedicated ceiling texture with painted converging ribs rather than modeling real ribs, since the camera only ever glimpses it from below/at an angle.

**Rose window.** The 6 project panes stay exactly as-is (locked functional requirement, one per project slot) — real fidelity comes from surrounding them with additional non-interactive decorative petals (smaller, interleaved between and around the 6 real ones) so the window reads as visually dense as the reference's two-ring window, without touching the interaction model at all.

**Brightness.** The reference photos are not actually bright in real exposure — photo 1 especially is quite dark — but carved depth and highlight catch light even in that darkness, which is what made the block-out's flat geometry look wrong, not the darkness level itself. Lighting gets a moderate intensity bump for safety margin, but the primary fix is the added geometric detail above actually having something for the key/rim lights to catch.

**General atmosphere.** Beyond the two beats above, the whole scene should feel like there's more going on throughout, not just two isolated set-pieces — more dust-mote coverage, more small lit accents (e.g. warm glow catching the arcade window openings), not concentrated only at the gate and the window.

### Post-density-pass fixes (locked 2026-07-27, same session)

Shayne tested the density pass live and flagged five real issues, all fixed:

- **Too dark.** Not just weak lights — `WebGLRenderer` had no tone mapping at all, which reads muddy/underexposed on `MeshStandardMaterial` regardless of light intensity. Added `ACESFilmicToneMapping` (exposure 1.5), pushed fog's near distance from 6 to 14 (was dimming the gate itself, not just the deep nave), and roughly doubled every light's intensity.
- **Columns visible from outside the gate.** A real bug, not a framing issue: `naveAsset.ts`'s side-column loop started at `COLUMN_Z_FRONT = 6`, literally in front of the gate (which sits at z=0) — in the exterior space the closed-gate camera occupies. Moved to z=-0.6, safely behind the gate.
- **Rose window visible from outside.** Root cause was twofold — no solid facade wall existed around the gate at all (so anything past the gate's own ~4.25-unit-wide footprint showed straight through to the nave interior/window), and the decorative petal ring added earlier widened the window's footprint enough that `GATE_WAYPOINT`'s existing field of view caught its bottom edge. Fixed with a new `facadeAsset.ts` — opaque stone side/top/plinth panels filling everything outside the gate+window's own footprint — plus retuning `GATE_WAYPOINT` tighter (z 8.4→7.6, lookAt.y 1.3→0.85) so it frames only the gate.
- **Dust motes bleeding through the closed door.** The gate-doorway light shaft's origin sits at z=1, genuinely in front of the closed doors — those motes weren't a rendering bug, they were correctly positioned between the camera and the door. Since they represent light spilling through an open doorway, they now just don't exist until `gateOpened` is true (`dustMotes.points.visible`).
- **Gate arch/arcade/rose-window vertical overlap.** A latent bug the fixes above surfaced: the decorative petal ring's wider footprint pushed the window's bottom edge down far enough to nearly collide with the arch peak beneath it. Shrunk the decorative ring (`DECORATIVE_OUTER_RADIUS` +0.5→+0.2) and the arch peak height (0.28×span→0.2×span), and made the arcade band's own position/height compute dynamically from the actual gate/window geometry (`naveAsset.ts` now imports both) instead of hardcoded guesses, so this can't silently drift out of sync again.

### AI Workflow section copy (locked, superseded 2026-07-22)

**Retired** in favor of the redesign below — kept here for history, not reproduced anywhere in the live site.

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

### AI Workflow section copy (locked, current — updated 2026-07-22)

Two-column layout. Left column — section title changed to **"How I Work"** (was "Personal AI Workflow: Noctis"), writeup unchanged from the first redesign pass:

> **How I Work**
>
> Noctis OS — a harness that shapes how Claude works for me: five modes (build, learn, research, maintain, and an auditor), all reading and writing into one compounding knowledge graph — inspired by Karpathy's pattern for LLM-maintained wikis. Deliberately never a finished system, built to keep absorbing new modes, tools, and models as the space moves. I use it daily, and it improves itself over time through proposals I review, never silent changes.

Right column — a single repo showcase card, sized much larger and vertically centered in its column (was a small, top-aligned box). Its own expanded-panel writeup is now **distinct** from the left column — a summary of the repo's own README "What this is" intro, not a reuse of the left copy:

> A persistent pixel-art "world" where five characters — Faber (build), Noctua (learn), Vesper (research), Custos (maintain), and Echo (the overnight auditor) — each represent a mode with its own methodology, subagents, and working context, all reading and writing one shared knowledge graph. Click a character to see its live state and launch a real Claude Code session with that mode's context already loaded. Single-user, single-machine by design, and it improves itself over time through proposals reviewed by hand — never silent changes.

- **Repo:** `https://github.com/shaynesss/noctis-os` (public — GitHub stats fetched server-side, same as a project card)
- **Demo media:** the repo's own README hero screenshot, hotlinked from `https://raw.githubusercontent.com/shaynesss/noctis-os/main/assets/readme/realhero.jpg` (not re-uploaded — GitHub's raw CDN serves permissive CORS headers, same as any other image `src`, and stays in sync with the repo's own README asset without a separate upload step)
- **Interaction:** identical 3D card mechanic to a project card (reflective shard, hover-tilt, swipe-twirl, hover+scroll expand, click/tap fallback, GitHub stat card inside), but the expand is contained to the right column only — the left writeup stays visible and uncovered throughout, unlike a project card's near-fullscreen expand.
- **Camera framing:** the shared row camera math (`cardLayout.ts`) has a `MIN_CAMERA_Z` floor tuned for a row of up to 6 project cards sharing the full page width — applied as-is, it left this lone card looking small regardless of its container size. `computeCameraZ`/`expandTargetScale`/`cardExpandedScreenRect` and `ProjectCardScene` now take an optional `minCameraZ` override (defaults to the original `MIN_CAMERA_Z`, so `ProjectsSection`'s framing is unchanged); the Noctis card passes a lower value so it fills its own container properly.
- **Lazy mount (updated 2026-07-22 — now covers every section):** no section's Three.js scene initializes at page load — `ScrollScenes` tracks, per scene, whether it has ever started fading into view (sticky once true) and passes that down as an `active` flag; `AIWorkflowSection` and `ProjectsSection` both defer their canvas mount on it. `ProjectsSection` returns an empty placeholder section until active, called after all its hooks (hooks can't be conditional) so the early return is safe.
- **Longer wind-up into/out of Workflow:** `ScrollScenes`'s `transitionVh` (the scroll distance a cross-fade spans) raised from the default 45vh to 90vh for this page. Since Workflow is the middle of exactly three sections, both of the page's two transitions touch it, so this single prop change lengthens both its entrance and its exit — there's no "third" transition to leave alone.
- **Scroll-snap fix (found during this work, not scoped to Workflow specifically):** the settle-snap effect used to finish an overshot scroll into the nearer section via `window.scrollTo({behavior:"smooth"})`. A native smooth-scroll animation keeps running for its own fixed duration once started and doesn't reliably yield to fresh wheel input arriving mid-animation — with a wider transition zone (or just a slower/discrete scroll-wheel user), a mistimed snap could re-fire and fight the user's next several scroll ticks for hundreds of ms, reading as the page refusing to scroll forward. Confirmed via a stress test (continuous synthetic wheel input) that reliably got stuck at the old 45vh transition once raised to 90vh, and did **not** reproduce at the original 45vh — a real regression, not just a slower page. Fixed by driving the settle-snap manually via `requestAnimationFrame` instead of the native smooth-scroll, cancelled instantly on any new `wheel`/`touchmove` event so it can never fight live input. Same stress test now reaches the bottom of the page reliably at 90vh.
- **Bigger content:** About section (`max-w-2xl`→`max-w-3xl`, heading/body/link text sizes up a step) and the AI Workflow section (writeup column `max-w-md`→`max-w-lg`, card column `max-w-4xl`→`max-w-5xl`, text sizes up a step) both sized up to fill more of the page — the Workflow card in particular is now noticeably larger and vertically centered, not just "slightly bigger" in isolation.

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
- **hashgraphvc.com** (evaluated 2026-07-25 via text-level fetch — browser automation wasn't connected this session, so this wasn't visually inspected) — three-act scroll-revealed structure with sparse click-driven CTAs and an ambient sound toggle; used as directional confirmation of the cinematic-reveal pacing (matches the gate → nave → rose-window beats independently arrived at), not copied structurally. Its sound toggle specifically evaluated and declined — see "Audio" above. Worth a real visual pass later if the extension gets connected — nothing here depends on it.

---

*End of Phase 1 spec. Next: Phase 2 (Setup) in Claude Code — repo creation, `.env.example`, project-level `CLAUDE.md`, folder structure per the EDD above.*

---

## 5. Overhaul 2: The Shallows (locked 2026-09-29)

Supersedes every frontend decision above. Data model, backend and TUI sections stay as a record of v1 but no longer feed the live site (see EDD below). Reached through four rounds of clickable sketches and eight research passes, all in the session of 2026-09-29; the reasoning and references are in the vault at `wiki/Portfolio Platform/Overview.md`.

### PRD

- **One screen.** The page is a single night scene: Shayne's name, one line ("Final-year Data Science student", no university named), "UK" and four links (GitHub, LinkedIn, Devpost, email) sit in the sky; a card catalogue stands in still water to the right, with a lamp on top.
- **Projects are drawers.** v1 ships two: GMI! (June 2026, Romax Digital track winner, CCCU Hackabury) and AI.GMI (May 2026, MLH Vultr track winner, KentHackIt). A client project is held back until it can be shown publicly (Shayne, 2026-09-30); its approved write-up is kept outside this repository. The Real-Time Anomaly Detection Dashboard is also held back for now. Empty drawers stay blank; the first one after the projects stands ajar with an "In progress" guide tab, which opens a lone "Work in progress" card.
- **Opening a drawer** slides it out; an index card (a guide card with a tab) rises and settles on the left, and the project card opens on the right.
- **Project card: one column, read like a museum label beside its object** (revised twice on 2026-09-29; the two-by-two grid had inconsistent sizes and a title that was not read first). Order: title; a meta row (badge, "Track winner" lit gold or "Live", then category and date); the description with no label; "How it works"; "What it solves"; then, under a hairline, the tools as outlined tags and the links. Three sizes on a 1.25 scale: title 40/44 Instrument Serif, all reading text 16/24 Instrument Sans (the sections one shade dimmer than the lead), labels, meta, tools and links 12/16 IBM Plex Mono. Spacing on an 8 px grid. The column is `min(30em, 34vw)` wide (about 66 characters, 480 px at 1440) and centred in the right half, level with the index card centred in the left half. On a phone, the same order under the card. Based on the V&A, Getty and Smithsonian label guides, Apple's split-view guidance, NN/g on scanning and visual hierarchy, and Butterick on line length.
- **Write-ups are short:** about 100 to 120 words per card, no sentence much over 20 words. The description is one or two sentences, "How it works" names the architecture and one decision with its payoff, "What it solves" says what the project is for. Plain words, real terms (NN/g: concise web text tested 58% more usable; GOV.UK: 25-word sentence limit).
- **Index card:** category tab, call number, title and date. No tags. The in-progress card says only "Work in progress".
- **The lamp is Noctis OS, "Workflow System: the harness that drives daily development"** (not the harness every project was built with: the hackathon projects were not). Clicking the shade tilts it and projects the panel onto the mist: What it is, How it works, What it solves (from the Noctis README; "What it solves" tells how one methodology file for every kind of work became five modes with their own methods, with the vault and the SQLite FTS5 history as the store behind every action), and an architecture diagram redrawn from the README's system diagram (body: Tauri shell, PTY host, claude; brain: MCP server, vault; SQLite FTS5 history; any MCP client). No fact row under it; the code link sits beside the kicker.
- **Arrival:** the page opens dark and the lamp flickers on. Then a one-time "lantern test" (the beam climbs to where the panel appears and withdraws) shows that the lamp does something; hovering the shade tilts it, with no beam. The only visible hint text reads "interact with the lamp".
- **Hidden details (eight):** the pull cord (switches the lamp), ripples when the water is clicked, a skipped stone on a fast flick, a dimmer on the left and right arrow keys, moths after 45 seconds of lamplight, a drifting bottle whose note shows how many of the eight have been found, typing "noctis", and holding Alt to show each drawer's commit count. None is needed to read the portfolio.
- **Out of scope for this overhaul:** a new editing tool or data layer (deferred; content is edited in code for now), the bookcase variant, alternative scenes, a phone-specific design beyond "works and reads".
- **Launch (2026-09-30):** the address is `shayneyong.vercel.app` (free; a paid domain such as `shayneyong.com`, about $10.46 a year at Cloudflare, can follow). Link previews use a 1200 x 630 capture of the scene (`frontend/public/og.jpg`) with Open Graph and Twitter tags and a canonical URL. Visit counting uses Umami Cloud's free plan: no cookies, only on the live host, counting page views plus drawer opens, the Noctis projection, hidden details found and outbound links. Under the UK's 2026 statistics exception it carries a small notice and an opt-out on the page instead of a consent banner. Session recordings and heatmaps were considered and left out, because UK visitors would have to consent to them first.

### EDD

- **Frontend:** Vite and TypeScript with no framework and no runtime dependencies. React, Three.js, Tailwind and shadcn are removed. Hand-built CSS; this Design Brief declares a hand-built system, so the spine's Tailwind and shadcn setup steps do not apply.
- **Content:** typed modules in `frontend/src/content/`. The frontend makes no network calls except Google Fonts. The FastAPI backend and Textual TUI stay in the repo untouched but dormant (their Railway deployment was already removed); whether content returns to a backend is a later decision.
- **Scene:** sky and cabinet in CSS. The water is a canvas: a wave-equation height grid at a quarter of screen resolution (Hugo Elias's method) refracts, at half resolution, a reflection that is redrawn upside down from the cabinet's own layout into a hidden canvas. The lamp is one value from 0 to 1 that drives the glow, the shade, the water and a 2,700 K to 1,800 K colour temperature. The cord is a seven-point Verlet rope. The projection cone is the convex hull of the shade and the panel, used as a clip path.
- **Performance budget:** about 1 ms of water per frame on a laptop; everything pauses when the tab is hidden, the scene is off screen or a card is open. Reduced motion shows a static, lit scene.
- **Accessibility:** every drawer, the shade, the cord and the bottle are real buttons with labels; Esc closes anything open; focus returns to what opened it; the diagram has a text description; a `<noscript>` list carries the projects.
- **Deployment:** the same Vercel project (root `frontend/`), static output, security headers in `frontend/vercel.json`.

### Design Brief

- **Scene, "Nocturne, stars":** sky `#10161d` to `#384d5f` at a horizon exactly half way down, water below it a step darker (`#090d12` at the bottom), horizontal ribbons in the water after Whistler, about seventy stars that twinkle and reflect faintly, a haze along the horizon. One impossible thing: furniture standing in the sea.
- **The one warm light is the lamp.** The only other warm colour is the gold "Track winner" badge, at Shayne's request. Metal is silver, not gold: label holders, drawer pulls, the lamp's stem and foot.
- **Type:** Instrument Serif (display, italic accents), Instrument Sans (body), IBM Plex Mono (labels, call numbers, tags).
- **Card catalogue:** dark wood, three columns of drawers, silver label holders with paper labels, half-round silver pulls.
- **Index card, the guide-card design:** card stock by category (Hackathon buff `#D8C39D`, Client salmon `#E2B8A4`, Personal blue `#A9BCCD`, In progress ivory `#ECE5D3`), a tab one third wide carrying the category, the Dewey call number top-left (GMI! 658.85, AI.GMI 650.14), the title in Instrument Serif, the date under it, two or three subject-style tags, and the rod hole. Content is centred between the tab and the hole.
- **Project card:** as the PRD lists, on the blurred scene, silver-white type, badge colours green for Live and gold for Track winner.
- **Noctis projection:** warm light on the mist with a faint grid, a six-node architecture diagram that draws itself, and one dot that travels the approval loop once.
- **Motion:** arrival flicker under three flashes a second; the cord sways at most three times; everything with movement has a reduced-motion state.
- **Research behind these choices** (all fetched 2026-09-29): Magritte, Whistler's Nocturnes, Sugimoto, Kawase Hasui and Yoshida Hiroshi for the scene; library trade manuals, ODLIS and the Library of Congress for the cards; Norman on signifiers and NN/g on one-time hints for the lamp; Hugo Elias for the water; Fabian et al. 2024 for the moths.

# Changelog

## 2026-09-30

- Launch preparation: the canonical address is `shayneyong.vercel.app`; link previews use a 1200 x 630 capture of the scene with Open Graph and Twitter tags; Umami Cloud visit counting (cookie-free, live host only, with drawer, projection, hidden-detail and outbound-link events) is switched on, with a notice and opt-out on the page. The Content Security Policy allows Umami's script and collection endpoint.
- Noctis's "What it solves" now tells where it came from: one methodology file for every kind of work, split into five modes, with the vault and the SQLite FTS5 history as the store behind every action.
- Removed the fact row under the Noctis panel (it also named the search index differently from the diagram); the code link moved up beside the panel's heading.

## 2026-09-29: Overhaul 2, "The Shallows"

- Replaced the whole frontend. The site is now one night scene: a card catalogue standing in still water, lit by a lamp. Drawers are projects; the lamp is Noctis OS and projects its panel onto the mist.
- Rewrote the frontend in Vite and TypeScript with no framework and no runtime dependencies. Removed React, Three.js, Tailwind and shadcn. The built page is about 23 KB gzipped.
- The water is a 2D wave-equation simulation that refracts a reflection redrawn from the cabinet's layout; the lamp is a single 0-to-1 value with a real colour temperature; the pull cord is a Verlet rope.
- Content moved into `frontend/src/content.ts`. The frontend no longer calls the backend, whose Railway deployment had been removed.
- New write-ups for GMI! and AI.GMI: a plain description, how it works, the hard part and the tools. Stats and "my part" removed.
- Eight hidden details, a one-time hint that the lamp is interactive, full keyboard and reduced-motion support, a `<noscript>` fallback and a strict Content Security Policy.
- The cathedral redesign (July 2026) was scrapped and never deployed.
- Revised the same day after the first look: project cards became four modules of one shape (What it is beside the title and tools; How it works beside What it solves), centred in the right half of the screen; "The hard part" became "What it solves"; index cards lost their tags; the in-progress card says only "Work in progress"; the lamp's hover beam was removed, leaving the tilt; the hint reads "interact with the lamp"; the Noctis panel became "Workflow System: the harness that drives daily development", rewritten from its README with the diagram redrawn from the README's system diagram; the intro no longer names the university; tighter type on smaller laptops so every card fits at 1280 x 800 without scrolling.
- Rebuilt the project card from research the same evening: one column read like a museum label (title, facts, description, How it works, What it solves, then tools and links), three type sizes on a 1.25 scale, an 8 px spacing grid, and a 66-character column centred in the right half, level with the index card. Write-ups cut from about 250 words per card to about 110, with no sentence much over 20 words. Every card fits at 1280 x 800, 1440 x 900 and 1536 x 864 without the smaller-laptop shrink.

## 2026-07-18 — Deployed live

- Backend deployed to Railway (FastAPI + Postgres), migrated, GitHub-connected for auto-deploy on push to `main`.
- Frontend deployed to Vercel, wired to the live backend, GitHub-connected for auto-deploy on push to `main`.
- Both launch projects (GMI!/PassPreview, AI.GMI) added via the admin API with real writeups, real GitHub repos, and real uploaded demo images.
- About page updated with real bio, LinkedIn, Devpost, and GitHub links.
- TUI repointed from local dev to the production backend.
- Added `POST /admin/upload` (multipart file upload, validated, static-served) and a `github_url` field on the About page — both real scope additions made mid-build, not in the original Phase 1 spec.
- Fixed: GitHub stat card no longer shows a dangling separator when a repo has no detected language (a valid GitHub API response, not a fetch failure).
- Fixed: 3D card face texture silently failing to load for uploaded images — three different components were fetching the same image URL in different CORS modes, and whichever fetched first (no-cors) left a cached response the WebGL texture loader's CORS-mode fetch couldn't reuse. All three now request consistently.
- Fixed: images with a mismatched aspect ratio were cropped; now composited (blurred cover-fit background + sharp contain-fit foreground) so nothing gets cut off.
- Fixed: card writeup text is left-aligned (block still centered) and split into real paragraphs instead of one run-on block.
- Fixed several TUI interaction bugs found via real headless testing: `q` (quit) and `Enter` (edit) were silently swallowed by Textual's key-dispatch model and `DataTable`'s own bindings respectively; Add/Edit screens opened with focus on the wrong element; drag-and-drop file paths weren't being shell-unescaped.

## 2026-07-17 — Backend, TUI, and frontend built

- Backend built: SQLAlchemy models, camelCase-aliased Pydantic schemas matching the frontend's contract, token-gated admin routes, GitHub stats service, Alembic migration seeding the locked About/AI Workflow copy.
- TUI built: project list, add/edit, page edit, reorder, GitHub refresh — the sole write path per the locked architecture.
- Frontend wired to the real backend API; mock-data layer deleted.
- Design pivoted from the originally-locked glass-shard card concept to suspended reflective cards showing each project's own demo media as a live texture.

## 2026-07-16 — Phase 1 spec locked

- Definition, PRD, EDD, and Design Brief all locked. See `SPEC.md`.

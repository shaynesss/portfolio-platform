# Portfolio Platform — Project CLAUDE.md

Process is owned by the global build spine (`~/.claude/CLAUDE.md`). This file holds only what's specific to this project: the relevant spine phases to keep front-of-mind here, plus locked decisions from `SPEC.md` that override defaults or guesswork.

See `SPEC.md` for the full Phase 1 spec (Definition, PRD, EDD, Design Brief) — that document is the source of truth for scope and design. Do not re-derive product decisions from this file; check `SPEC.md` first.

---

## Spine phases relevant to this project

- **Plan before code.** `SPEC.md` is locked. Any change to scope, data model, or the design brief needs an explicit update to `SPEC.md`, not a silent deviation in code.
- **Design-before-wiring.** Frontend screens get built against fake/mocked data first, matching the locked Design Brief. Only once approved does the UI's data shape become the API contract — never the reverse.
- **Small tasks over big ones.** Break backend routes, frontend components, and TUI screens into ~5-10 min tasks with explicit What/Where/How/Verify.
- **Confusion Protocol.** Any assumption not spelled out in `SPEC.md` gets surfaced before implementing — don't silently pick an interpretation, especially around the shard expand mechanic and the Three.js scene setup, both of which have real ambiguity in a real-time render.
- **Ship gate (`/ship`).** Stops at first failure. For this project that includes: TUI write path smoke-tested end-to-end, GitHub stat refresh verified against a real repo, `prefers-reduced-motion` respected on both the dot field and shard rotation, and both Railway (backend) and Vercel (frontend) deploys smoke-tested live before the link goes on the CV.

---

## Project-specific overrides

### Architecture (locked, do not default elsewhere)
- **Backend:** FastAPI + PostgreSQL, deployed to **Railway**. Persistent backend, real DB connections.
- **Frontend:** React/Vite, deployed to **Vercel**. Read-only — never calls GitHub or any third party directly, always goes through the backend.
- **TUI:** Python Textual, **local only, never deployed**. Sole write path for all content (projects, About, AI Workflow copy). No admin surface exists on the web side — don't add one.
- **GitHub stats:** fetched backend-side only, PAT lives in `backend/.env` (`GITHUB_TOKEN`). Fetched on TUI "add project" and on manual TUI-triggered refresh. **No cron / scheduled refresh** — staleness between manual touches is accepted by spec, don't add a scheduler to "fix" this.

### Data model (locked — see `SPEC.md` §3 for full field list)
- `projects`: up to 6 slots, ordered by `display_order`, TUI-editable. Includes `demo_media_type` (`image`/`video`) + `demo_media_url` (+ `video_source`: `youtube`/`self_hosted`).
- `pages`: singleton content blocks for About body, LinkedIn/Devpost URLs, and the locked AI Workflow copy (do not paraphrase or regenerate that copy — it's final, reproduce verbatim from `SPEC.md` §4).

### Frontend rendering constraints
- **One shared Three.js scene**, not one canvas per project card — up to 6 simultaneous WebGL contexts is out. All shard instances share a single renderer/scene, each with independent rotation phase/speed/axis.
- **Shard expand mechanic** is a custom hover-scoped scroll capture — the `scroll-expansion-hero` reference is inspiration only, not a drop-in (it hijacks page-level wheel events and has no click fallback). Full behavior spec in `SPEC.md` §4 "Expand mechanism — full detail"; each shard's expand state must be fully independent of the others.
- **Dot background** is adapted from `dotted-surface` but needs `next-themes` stripped, a from-scratch randomized-phase opacity fade (the reference only animates Y-position), and `prefers-reduced-motion` handling added — none of that exists in the reference component.
- No dark/light theme toggle in scope. Hardcode the dark palette.

### Out of scope (do not build, even if it seems natural)
Blog/writing section, in-page contact form, testimonials, resume PDF download, theme toggle, analytics/tracking, custom domain, `pipx` packaging for the TUI.

### Deployment
Railway (backend) + Vercel (frontend), confirmed in `SPEC.md` §3 — do not deploy the backend to Vercel or vice versa, and do not deploy the TUI anywhere.

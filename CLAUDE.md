# Portfolio Platform: project CLAUDE.md

Process comes from the session prompt (`~/.claude/CLAUDE.md`) and the build methodology in the vault. This file holds only what is specific to this project. `SPEC.md` is the source of truth for scope and design: §5 is the live site (Overhaul 2, "The Shallows"); §1 to §4 are the record of version 1 and the scrapped cathedral redesign. Check `SPEC.md` before deciding anything this file does not cover.

The site is live at `shayneyong.vercel.app` (since 2026-09-30).

---

## Working rules for this project

- **Plan before code.** Any change to scope, content structure or design goes into `SPEC.md` §5 first, not as a silent change in code.
- **Small tasks.** Break work into steps of about 5 to 10 minutes, each with what, where, how and how to verify it.
- **Confusion Protocol.** Surface any assumption `SPEC.md` does not settle before implementing. The usual places: layout at small laptop sizes, anything a write-up claims about a project (check it against the project's repo and dates), and the frame loop (water, lamp, projection), where a change can quietly cost frames.
- **Check a claim before it ships.** A sentence with "every" or "all" about Shayne's own work is a factual claim. Noctis is "the harness that drives daily development", never "the harness every project was built with": the hackathon projects predate it.
- **The repository is public.** A project held back from the site is not kept here in any form, including history and commit messages, until it can be shown. Held-back material lives in the private vault.
- **Ship gate for this project** (stop at the first failure):
  1. `npm run build` in `frontend/` (it type-checks first) is clean.
  2. On the production build, served with the headers from `frontend/vercel.json`: no console errors and no Content Security Policy violations.
  3. Every drawer, the Noctis projection, the hidden details, keyboard focus and Esc all work.
  4. Every card and the Noctis panel fit without scrolling at 1280x800, 1440x900 and 1536x864; a phone viewport reads; reduced motion shows a still, lit scene.
  5. After the push, Vercel's deploy is Ready and the live site passes a smoke test. Catch Umami's sends in tests, so test visits are never counted.

---

## Architecture (locked)

- **Frontend:** Vite and TypeScript, static, deployed to **Vercel** (project `frontend`, Root Directory `frontend`). No framework and no runtime dependencies. React, Three.js, Tailwind and shadcn were removed on purpose; do not bring them back, and do not add WebGL. Shayne rejected Three.js-style 3D, so all depth is CSS and canvas 2D.
- **Content:** the projects, the in-progress card and the hidden details are typed data in `frontend/src/content.ts`. The intro, the Noctis panel and the `<noscript>` fallback are HTML in `frontend/index.html`, so a change to a project's words belongs in both places.
- **Network:** the page calls nothing except Google Fonts and, on the live address only, Umami. The CSP in `frontend/vercel.json` allows `cloud.umami.is` for the script and `gateway.umami.is` for sending, and nothing else outside the site.
- **Analytics:** Umami Cloud, set up in `frontend/src/analytics.ts`. No cookies, live address only, with a notice and an opt-out on the page, as the UK's 2026 statistics exception requires. No session recordings or heatmaps: UK visitors would have to consent to them first.
- **Backend and TUI (version 1, July 2026): dormant.** A FastAPI and PostgreSQL backend edited through a Python Textual terminal app. Its Railway deployment was removed, and the site does not use it. Both are kept as a record. Do not redeploy or extend them unless a data-layer decision in `SPEC.md` brings them back. If it does, v1's rules still hold: the TUI stays local and is never deployed; the GitHub token stays backend-side in `backend/.env`; there is no scheduled refresh. v1's data model is in `SPEC.md` §3.

## Design and content (locked in `SPEC.md` §5)

- **One screen:** the night scene is the whole page. The card catalogue, the lamp (Noctis) and the eight hidden details are specified in §5; change them there first.
- **Project card:** one column. Title; a meta row (badge, then category and date); the lead with no label; "How it works"; "What it solves"; then tools and links under a hairline. Type sizes 40, 16 and 12.
- **Write-ups:** about 110 words per card. Plain words, real terms, technical substance. No stats, no "my part", no "hard part".
- **Colour:** metal is silver, not gold. The one warm light is the lamp, and the only other warm colour is the gold "Track winner" badge.
- **No theme toggle.** The dark palette is hardcoded.

## Out of scope (do not build, even if it seems natural)

Blog or writing section, in-page contact form, testimonials, résumé PDF download, theme toggle, session recordings or heatmaps, a new editing tool or data layer (deferred; decide it in `SPEC.md` first), alternative scenes, `pipx` packaging for the TUI. A custom domain can come later; the address is `shayneyong.vercel.app` for now.

## Deployment

Vercel only. A push to `main` deploys the site. A manual `vercel` deploy has to run from the repository root, not from `frontend/`, because of the Root Directory setting. Do not deploy the TUI anywhere, and do not put the backend back on Railway without the data-layer decision.

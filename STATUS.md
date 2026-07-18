# Status

**Phase:** 4 — Finish. Backend, TUI, and frontend are built and deployed live.

**Live:**
- Frontend: https://frontend-eight-pi-44xatf0ts0.vercel.app (Vercel, GitHub-connected — pushes to `main` auto-deploy)
- Backend: https://portfolio-backend-production-4bfe.up.railway.app (Railway, GitHub-connected — pushes to `main` auto-deploy)
- Both launch projects (GMI!/PassPreview, AI.GMI) are populated with real content and real GitHub repos, added through the TUI/admin API, not seed data.

**Current state:**
- Backend: FastAPI + Postgres on Railway, migrated (`alembic upgrade head` run against production), file uploads working (`POST /admin/upload` + static `/uploads` serving).
- Frontend: React/Vite on Vercel, wired to the live backend (`VITE_API_BASE_URL` set as a Vercel env var), mock-data layer removed.
- TUI: points at production (`tui/.env`) — this is now the live write path for real edits.

**Known gaps:**
- Uploaded files on Railway are **not yet on a persistent Volume** — `railway volume add` hit a reproducible CLI crash (`volume.rs:836`, `Option::unwrap()` on `None`) across multiple attempts; worth retrying via the Railway dashboard or filing with Railway support. Until fixed, a Railway redeploy would wipe `/data/uploads` and any project images would need re-uploading through the TUI.
- No formal automated test suite (backend/frontend/TUI were all verified through real end-to-end interaction — headless Textual `run_test()`, Playwright against the live site, real API calls — not unit tests).
- `prefers-reduced-motion` is implemented on the dot field and card scene; not re-verified against the live production build specifically (was verified pre-deploy).
- TUI `pipx` packaging still punted, per the locked spec.

**Next up:** attach the Railway Volume for upload persistence (dashboard, once the CLI bug is worked around), then this is fully shippable.

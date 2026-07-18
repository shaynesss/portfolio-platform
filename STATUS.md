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
- No formal automated test suite (backend/frontend/TUI were all verified through real end-to-end interaction — headless Textual `run_test()`, Playwright against the live site, real API calls — not unit tests).
- `prefers-reduced-motion` is implemented on the dot field and card scene; not re-verified against the live production build specifically (was verified pre-deploy).
- TUI `pipx` packaging still punted, per the locked spec.

**Resolved 2026-07-18:** Railway Volume for upload persistence is attached (`/data/uploads`, via the dashboard — `railway volume add` still crashes on the CLI, unresolved upstream). Verified by forcing a real redeploy and confirming both project images survived it.

This is fully shippable.

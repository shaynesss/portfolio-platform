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

**Resolved 2026-07-18:** Mobile verified against production with Playwright's iPhone 13 emulation. Found and fixed a real bug — project cards overflowed off both edges of narrow/portrait viewports because `computeCameraZ` was fed only the center-to-center card spacing, not the full row span (each outer card's own half-width was missing). Desktop always hit the `MIN_CAMERA_Z` floor so this never surfaced there. Fixed in `frontend/src/lib/cardLayout.ts` (`rowSpan` helper) and redeployed; both cards now sit fully within frame on mobile. About-section fade-in was checked too and is not a bug — it just takes ~10s to complete, confirmed via `getComputedStyle` (opacity reaches 1, correct color/size) rather than assumed from an early screenshot. Mobile is in scope for v1 and now verified working.

This is fully shippable.

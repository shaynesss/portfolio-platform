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

**Resolved 2026-07-18:** Three mobile touch interaction bugs reported by Shayne after hands-on testing, all fixed and verified live via CDP-level touch simulation (real browser scroll physics, not just synthetic DOM events): (1) a fast swipe blew past several sections in one native momentum-scroll flick — replaced with a touch-only handler that takes the gesture over at the window level and drives one-section-per-swipe navigation programmatically; (2) swiping back up out of the Projects section did nothing, because the WebGL canvas's `touch-action:none` (needed to stop card-drag gestures triggering the browser's own pan/zoom) left nothing to turn a touch swipe there into a page scroll — the new handler doesn't depend on native scrolling at all, so it works the same over the canvas or anywhere else; (3) tapping a card expanded it then it immediately collapsed before it could be read, because the tap-driven expand was only held open by a short animation-target flag that released into generic hover-based snap-back once the animation finished, and touch has no lasting hover after the finger lifts — a tap-opened card is now pinned open until explicitly tapped shut. The expanded panel's writeup text was also touch-scrollable for the first time (it relied entirely on a desktop-only wheel hijack before), gated to touch devices only so desktop's interaction model is untouched.

This is fully shippable.

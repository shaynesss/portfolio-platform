# Status

**Phase:** Overhaul 2, "The Shallows", built, revised and verified locally. Ready to launch at `shayneyong.vercel.app`.

**To launch:**
1. Done 2026-09-30: the Vercel project's Root Directory is `frontend` (it was the repository root, so the one GitHub-triggered build, `f795727`, failed; every earlier working deploy came from the CLI). A push to `main` now builds the site. Note: with this setting, a manual `vercel` deploy has to run from the repository root, not from `frontend/`.
2. Done 2026-09-30: `shayneyong.vercel.app` is on the project and verified. The old `frontend-eight-pi-44xatf0ts0.vercel.app` still works.
3. Done 2026-09-30: the Umami Cloud site exists (Shayne's account, signed in with GitHub) and its website ID is in `frontend/src/analytics.ts`. Tested on the live host name with the production headers and nothing delivered: the script loads with no CSP violation, a pageview and the drawer-open and noctis-projected events go out tagged `shayneyong.vercel.app`, and the opt-out stops loading and sending.
4. Push `main`; Vercel builds and deploys it.
5. Smoke-test the live site, check the link preview (for example LinkedIn's Post Inspector), and try it on a real phone, Safari and Firefox.
6. Optional: delete the unused `VITE_API_BASE_URL` variable (Vercel, Settings, Environment Variables; it has a Preview and a Production entry).

**Current state:**
- Frontend: Vite and TypeScript, static, no runtime dependencies. Content in `frontend/src/content.ts`. Security headers in `frontend/vercel.json`.
- Backend and TUI: dormant. Their Railway deployment shows REMOVED; the site does not use them. The Vercel project still carries an unused `VITE_API_BASE_URL` variable.

**Verified 2026-09-30 (headless Chromium, production build served with the production headers):** no console errors and no Content Security Policy violations; every drawer, the projection and the hidden details; focus return; every card and the Noctis panel fit at 1280x800, 1440x900 and 1536x864; a phone viewport; reduced motion; the preview image is served.

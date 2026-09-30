# Status

**Phase:** Live. Overhaul 2, "The Shallows", launched on 2026-09-30 at [shayneyong.vercel.app](https://shayneyong.vercel.app).

**How it went live:** a push to `main` on 2026-09-30 built and deployed through Vercel's GitHub connection, the first push deploy that has worked (the Vercel project had been building from the repository root; its Root Directory is now `frontend`). The older address, `frontend-eight-pi-44xatf0ts0.vercel.app`, serves the same site.

**Verified live, 2026-09-30** (headless Chromium on `shayneyong.vercel.app`, with Umami's sends caught so no test visit was counted): the page and its security headers load, including a Content Security Policy that allows Umami; both project drawers and the in-progress drawer; a project card opens; Umami's script loads and a page view and a drawer-open event go out tagged with the live address; the privacy notice and opt-out show; the link-preview image (`og.jpg`, 1200 x 630) and its Open Graph tags are served; no console errors.

**Verified before launch** (production build served with the production headers): no Content Security Policy violations; every drawer, the projection and the hidden details; focus return; every card and the Noctis panel fit at 1280x800, 1440x900 and 1536x864; a phone viewport; reduced motion; the opt-out stops Umami loading.

**Still to do:**
1. Check the link preview where it will be shared, for example LinkedIn's Post Inspector (it needs a LinkedIn sign-in).
2. Try the site on a real phone, in Safari and in Firefox.
3. Optional: delete the unused `VITE_API_BASE_URL` variable in Vercel (Settings, Environment Variables; it has a Preview and a Production entry). Nothing reads it.

**Later, not scheduled:**
- The data-layer decision: content is edited in `frontend/src/content.ts` for now; the v1 backend and TUI stay dormant until this is decided in `SPEC.md`.
- Projects held back until they can be shown, including the Real-Time Anomaly Detection Dashboard.
- A paid domain such as `shayneyong.com`.

**Current state:**
- Frontend: Vite and TypeScript, static, no runtime dependencies, about 23 KB gzipped. Projects in `frontend/src/content.ts`; the intro, the Noctis panel and the `<noscript>` fallback in `frontend/index.html`. Security headers in `frontend/vercel.json`. Analytics in `frontend/src/analytics.ts`.
- Backend and TUI: version 1, dormant. Their Railway deployment shows REMOVED; the site does not use them.

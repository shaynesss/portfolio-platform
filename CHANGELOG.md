# Changelog

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

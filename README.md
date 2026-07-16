# Portfolio Platform

Scroll-driven portfolio site for Shayne — a single-page, interactive presentation of projects and AI workflow, backed by a Python TUI as the sole content-write path.

See `SPEC.md` for the full spec (definition, PRD, technical design, design brief) and `CLAUDE.md` for project-specific build constraints.

## Stack

- **Backend:** FastAPI + PostgreSQL, deployed to Railway
- **Frontend:** React/Vite + Three.js, deployed to Vercel
- **TUI:** Python Textual, local-only, sole write path

## Status

Phase 2 (Setup) in progress. See `STATUS.md`.

## Setup

Not yet runnable — dependency manifests and environment setup are still pending. Once available:

```bash
# backend
cd backend && cp .env.example .env && pip install -r requirements.txt

# frontend
cd frontend && cp .env.example .env

# tui
cd tui && cp .env.example .env
```

# Portfolio Platform

Scroll-driven portfolio site for Shayne — a single-page, interactive presentation of projects and AI workflow, backed by a Python TUI as the sole content-write path.

**Live:** https://frontend-eight-pi-44xatf0ts0.vercel.app

See `SPEC.md` for the full spec (definition, PRD, technical design, design brief) and `CLAUDE.md` for project-specific build constraints.

## Stack

- **Backend:** FastAPI + PostgreSQL, deployed to Railway
- **Frontend:** React/Vite + Three.js, deployed to Vercel
- **TUI:** Python Textual, local-only, sole write path

Both Railway and Vercel are connected to this repo's GitHub — pushing to `main` auto-deploys.

## Status

Deployed and live. See `STATUS.md` for current state and known gaps.

## Setup

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, ADMIN_API_TOKEN, etc.
alembic upgrade head
uvicorn app.main:app --reload --port 8017

# frontend
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev

# tui — the only write path; run against local or production per its .env
cd tui
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set API_BASE_URL + ADMIN_API_TOKEN
python app.py
```

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import admin, pages, projects

load_dotenv()

app = FastAPI(title="Portfolio Platform API")

# Wildcard, GET-only: every route this covers is a public read (the
# project/page content endpoints) or public static media — nothing
# needs credentials, and the 3D card face loads demo images as WebGL
# textures, which requires a clean CORS response on every request. A
# second, narrower CORSMiddleware nested around just the uploads mount
# doesn't work here — Starlette adds both middlewares' headers to the
# same response, and two Access-Control-Allow-Origin values makes the
# browser treat it as if neither were present. Admin (write) routes
# stay protected by the separate bearer-token auth, unrelated to CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

upload_dir = Path(os.environ.get("UPLOAD_DIR", "uploads"))
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(projects.router)
app.include_router(pages.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}

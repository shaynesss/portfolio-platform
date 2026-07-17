import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, pages, projects

load_dotenv()

app = FastAPI(title="Portfolio Platform API")

cors_origins = [origin for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(pages.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}

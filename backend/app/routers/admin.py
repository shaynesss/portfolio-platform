from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Page, Project
from app.schemas import (
    AboutContent,
    AiWorkflowContent,
    ProjectCreate,
    ProjectOut,
    ProjectReorderRequest,
    ProjectUpdate,
)
from app.services.github import GithubFetchError, fetch_repo_stats

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

MAX_PROJECTS = 6


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return project


@router.post("/projects", response_model=ProjectOut, status_code=201)
async def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(Project))
    if count >= MAX_PROJECTS:
        raise HTTPException(
            status_code=400, detail=f"Already at the {MAX_PROJECTS}-project limit"
        )

    next_order = db.scalar(select(func.max(Project.display_order))) or 0

    project = Project(**payload.model_dump(), display_order=next_order + 1)

    try:
        stats = await fetch_repo_stats(payload.github_url)
        project.github_stars = stats["stars"]
        project.github_language = stats["language"]
        project.github_last_fetched_at = datetime.now(timezone.utc)
    except GithubFetchError:
        pass

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.put("/projects/reorder", response_model=list[ProjectOut])
def reorder_projects(payload: ProjectReorderRequest, db: Session = Depends(get_db)):
    projects = {p.id: p for p in db.scalars(select(Project))}
    missing = [pid for pid in payload.ordered_ids if pid not in projects]
    if missing:
        raise HTTPException(status_code=404, detail=f"Unknown project ids: {missing}")

    for index, project_id in enumerate(payload.ordered_ids):
        projects[project_id].display_order = index + 1

    db.commit()
    return db.scalars(select(Project).order_by(Project.display_order)).all()


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()


@router.post("/projects/{project_id}/refresh-github", response_model=ProjectOut)
async def refresh_github(project_id: int, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    try:
        stats = await fetch_repo_stats(project.github_url)
    except GithubFetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    project.github_stars = stats["stars"]
    project.github_language = stats["language"]
    project.github_last_fetched_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return project


def _upsert_page(db: Session, key: str, content: dict) -> Page:
    page = db.get(Page, key)
    if page is None:
        page = Page(key=key, content=content)
        db.add(page)
    else:
        page.content = content
    db.commit()
    return page


@router.put("/pages/about", response_model=AboutContent)
def update_about(payload: AboutContent, db: Session = Depends(get_db)):
    page = _upsert_page(db, "about", payload.model_dump(by_alias=True))
    return page.content


@router.put("/pages/ai-workflow", response_model=AiWorkflowContent)
def update_ai_workflow(payload: AiWorkflowContent, db: Session = Depends(get_db)):
    page = _upsert_page(db, "ai_workflow", payload.model_dump(by_alias=True))
    return page.content

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Page
from app.schemas import AboutContent, AiWorkflowContent

router = APIRouter(prefix="/pages", tags=["pages"])


def _get_page_content(db: Session, key: str) -> dict:
    page = db.get(Page, key)
    if page is None:
        raise HTTPException(status_code=404, detail=f"Page '{key}' not found")
    return page.content


@router.get("/about", response_model=AboutContent)
def get_about(db: Session = Depends(get_db)):
    return _get_page_content(db, "about")


@router.get("/ai-workflow", response_model=AiWorkflowContent)
def get_ai_workflow(db: Session = Depends(get_db)):
    return _get_page_content(db, "ai_workflow")

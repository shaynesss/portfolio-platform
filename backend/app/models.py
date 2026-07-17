from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    display_order: Mapped[int] = mapped_column(Integer)
    writeup: Mapped[str] = mapped_column(Text)

    github_url: Mapped[str] = mapped_column(String)
    github_stars: Mapped[int] = mapped_column(Integer, default=0)
    github_language: Mapped[str | None] = mapped_column(String, nullable=True)
    github_last_fetched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    demo_media_type: Mapped[str] = mapped_column(String)
    demo_media_url: Mapped[str] = mapped_column(String)
    video_source: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Page(Base):
    __tablename__ = "pages"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    content: Mapped[dict] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

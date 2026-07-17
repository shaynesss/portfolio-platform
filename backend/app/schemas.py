from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


DemoMediaType = Literal["image", "video"]
VideoSource = Literal["youtube", "self_hosted"] | None


class ProjectOut(CamelModel):
    id: str
    slug: str
    title: str
    display_order: int
    writeup: str
    github_url: str
    github_stars: int
    github_language: str | None
    demo_media_type: DemoMediaType
    demo_media_url: str
    video_source: VideoSource

    @field_validator("id", mode="before")
    @classmethod
    def stringify_id(cls, v: object) -> str:
        return str(v)


class ProjectCreate(CamelModel):
    slug: str
    title: str
    writeup: str
    github_url: str
    demo_media_type: DemoMediaType
    demo_media_url: str
    video_source: VideoSource = None


class ProjectUpdate(CamelModel):
    slug: str | None = None
    title: str | None = None
    writeup: str | None = None
    github_url: str | None = None
    demo_media_type: DemoMediaType | None = None
    demo_media_url: str | None = None
    video_source: VideoSource = None


class ProjectReorderRequest(CamelModel):
    ordered_ids: list[int]


class AboutContent(CamelModel):
    body: str
    linkedin_url: str
    devpost_url: str


class AiWorkflowBlock(CamelModel):
    heading: str
    body: str


class AiWorkflowContent(CamelModel):
    title: str
    intro: str
    blocks: list[AiWorkflowBlock]

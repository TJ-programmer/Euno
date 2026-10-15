from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FeedItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_id: str
    slug: str
    label: str
    title: str
    summary: str
    payload: dict[str, Any] = Field(default_factory=dict)
    content_type: str
    difficulty: str
    estimated_minutes: int
    topics: list[str]
    published_at: str | None


class HomeFeedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[FeedItemResponse]
    limit: int
    offset: int


class FlowFeedItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_id: str
    slug: str
    title: str
    content_type: str
    difficulty: str
    estimated_minutes: int
    topics: list[str]
    published_at: str | None
    flow: dict[str, Any]


class FlowFeedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[FlowFeedItemResponse]
    limit: int
    offset: int


class ContentDetailResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: dict
    home: dict | None
    flow: dict | None


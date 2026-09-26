from datetime import datetime
from typing import Literal,Optional
from pydantic import BaseModel, ConfigDict, Field


class Claim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    statement: str
    importance: Literal[
        "core",
        "supporting",
        "interesting",
    ]
    source_ids: list[str]
    source_quote: str | None 

    confidence: float | None = Field(
        ge=0,
        le=1,
    )


class Explanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    what: str
    why: str
    how: str | None


class Connection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    concept: str
    explanation: str


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    url: str
    name: str

    source_type: Literal[
        "research_paper",
        "study",
        "news",
        "official",
        "reference",
        "book",
        "other",
    ]

    title: str | None
    author: str | None
    published_at: datetime | None
    retrieved_at: datetime


class CanonicalContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str

    content_type: Literal[
        "evergreen",
        "news",
        "research",
        "explainer",
        "concept",
    ]

    topics: list[str]

    title: str
    core_question: str
    core_idea: str

    context: str | None

    claims: list[Claim]

    explanation: Explanation

    deeper_insight: str | None

    connections: list[Connection]

    takeaway: str

    sources: list[Source]

    difficulty: Literal[
        "quick",
        "balanced",
        "deep",
    ]

    estimated_minutes: int = Field(
        gt=0,
        le=60,
    )

    published_at: datetime | None
    source_published_at: datetime | None

    generated_at: datetime

    generator_version: str

class SourceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    url: str
    name: str

    source_type: Literal[
        "research_paper",
        "study",
        "news",
        "official",
        "reference",
        "book",
        "other",
    ]

    title: str | None = None
    author: str | None = None
    published_at: datetime | None = None

    content: str

class GroundingRepair(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claims: list[Claim] | None

    title: str | None
    core_question: str | None
    core_idea: str | None
    context: str | None

    explanation_what: str | None
    explanation_why: str | None
    explanation_how: str | None

    deeper_insight: str | None
    connections: list[Connection] | None
    remove_connection_indexes: list[int] | None

    takeaway: str | None

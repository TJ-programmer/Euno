
from datetime import datetime
from typing import Literal

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

    # How this content was produced.
    #
    # sourced:
    #   Content was generated from supplied SourceInput objects
    #   and can be source-grounded.
    #
    # model_knowledge:
    #   Content was generated without external source material.
    provenance: Literal[
        "sourced",
        "model_knowledge",
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

    # Empty for model-knowledge content.
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


class EmptyPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HomePresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_id: str
    label: str
    display_title: str
    display_summary: str
    payload: EmptyPayload


class FlowSection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    body: str
    source_claim_ids: list[str]


class FlowPresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_id: str

    hook: FlowSection
    tension: FlowSection
    reveal: FlowSection
    why: FlowSection
    surprise: FlowSection
    connection: FlowSection
    takeaway: FlowSection
    next_curiosity: FlowSection

    payload: EmptyPayload


class FlowGroundingResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    claim: str
    claim_id: str
    noul: float
    decision: Literal[
        "accept",
        "review",
        "reject",
    ]


class FlowGroundingReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    results: list[FlowGroundingResult]

    @property
    def all_accepted(self) -> bool:
        return all(
            result.decision == "accept"
            for result in self.results
        )

    @property
    def needs_review(self) -> bool:
        return any(
            result.decision == "review"
            for result in self.results
        )

    @property
    def has_rejections(self) -> bool:
        return any(
            result.decision == "reject"
            for result in self.results
        )


class FlowGroundingRepair(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hook: FlowSection | None
    tension: FlowSection | None
    reveal: FlowSection | None
    why: FlowSection | None
    surprise: FlowSection | None
    connection: FlowSection | None
    takeaway: FlowSection | None
    next_curiosity: FlowSection | None


class ContentPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str
    direction: str
    content_type: str
    difficulty: str


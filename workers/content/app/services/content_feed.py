from dataclasses import dataclass
from typing import Any

from app.supabase import supabase


@dataclass
class FeedItem:
    content_id: str
    slug: str

    label: str
    title: str
    summary: str

    content_type: str
    difficulty: str
    estimated_minutes: int

    topics: list[str]

    published_at: str | None


class ContentFeed:
    """
    Read-only service for retrieving persisted content for app feeds.

    Responsibilities:
    - Fetch persisted Home presentations.
    - Attach canonical content metadata.
    - Return application-level FeedItem objects.

    Not responsible for:
    - Content generation.
    - Content planning.
    - Source collection.
    - Personalization.
    - Ranking.
    """

    def get_home_feed(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> list[FeedItem]:

        if limit < 1:
            raise ValueError(
                "Feed limit must be at least 1."
            )

        if offset < 0:
            raise ValueError(
                "Feed offset cannot be negative."
            )

        result = (
            supabase
            .table("content_presentations")
            .select(
                """
                id,
                content_id,
                label,
                display_title,
                display_summary,
                content_items!inner(
                    id,
                    slug,
                    content_type,
                    difficulty,
                    estimated_minutes,
                    published_at
                )
                """
            )
            .eq("surface", "home")
            .order(
                "created_at",
                desc=True,
            )
            .range(
                offset,
                offset + limit - 1,
            )
            .execute()
        )

        if not result.data:
            return []

        content_ids = [
            row["content_id"]
            for row in result.data
        ]

        topics_by_content = (
            self._get_topics(content_ids)
        )

        feed: list[FeedItem] = []

        for row in result.data:
            canonical = row["content_items"]

            content_id = row["content_id"]

            feed.append(
                FeedItem(
                    content_id=content_id,
                    slug=canonical["slug"],
                    label=row["label"],
                    title=row["display_title"],
                    summary=row["display_summary"],
                    content_type=canonical["content_type"],
                    difficulty=canonical["difficulty"],
                    estimated_minutes=canonical[
                        "estimated_minutes"
                    ],
                    topics=topics_by_content.get(
                        content_id,
                        [],
                    ),
                    published_at=canonical[
                        "published_at"
                    ],
                )
            )

        return feed

    def get_content(
        self,
        content_id: str,
    ) -> dict[str, Any] | None:

        result = (
            supabase
            .table("content_items")
            .select("*")
            .eq("id", content_id)
            .maybe_single()
            .execute()
        )

        return result.data

    def get_home_item(
        self,
        content_id: str,
    ) -> FeedItem | None:

        result = (
            supabase
            .table("content_presentations")
            .select(
                """
                id,
                content_id,
                label,
                display_title,
                display_summary,
                content_items!inner(
                    id,
                    slug,
                    content_type,
                    difficulty,
                    estimated_minutes,
                    published_at
                )
                """
            )
            .eq("content_id", content_id)
            .eq("surface", "home")
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data
        canonical = row["content_items"]

        topics_by_content = self._get_topics(
            [content_id]
        )

        return FeedItem(
            content_id=content_id,
            slug=canonical["slug"],
            label=row["label"],
            title=row["display_title"],
            summary=row["display_summary"],
            content_type=canonical["content_type"],
            difficulty=canonical["difficulty"],
            estimated_minutes=canonical[
                "estimated_minutes"
            ],
            topics=topics_by_content.get(
                content_id,
                [],
            ),
            published_at=canonical[
                "published_at"
            ],
        )

    def _get_topics(
        self,
        content_ids: list[str],
    ) -> dict[str, list[str]]:

        if not content_ids:
            return {}

        result = (
            supabase
            .table("content_topics")
            .select(
                "content_id, topic_id"
            )
            .in_(
                "content_id",
                content_ids,
            )
            .execute()
        )

        topics: dict[str, list[str]] = {}

        for row in result.data or []:
            content_id = row["content_id"]
            topic_id = row["topic_id"]

            topics.setdefault(
                content_id,
                [],
            ).append(topic_id)

        return topics

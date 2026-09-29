
from app.models import CanonicalContent, HomePresentation
from app.supabase import supabase


class ContentRepository:
    def save(
        self,
        content: CanonicalContent,
    ) -> str:
        row = {
            "slug": content.slug,
            "content_type": content.content_type,
            "title": content.title,
            "body": content.model_dump(mode="json"),
            "source_url": (
                content.sources[0].url
                if content.sources
                else None
            ),
            "source_name": (
                content.sources[0].name
                if content.sources
                else None
            ),
            "source_published_at": (
                content.source_published_at.isoformat()
                if content.source_published_at
                else None
            ),
            "estimated_minutes": content.estimated_minutes,
            "difficulty": content.difficulty,
            "published_at": (
                content.published_at.isoformat()
                if content.published_at
                else None
            ),
            "metadata": {
                "generated_at": content.generated_at.isoformat(),
                "generator_version": content.generator_version,
            },
        }

        result = (
            supabase
            .table("content_items")
            .upsert(
                row,
                on_conflict="slug",
            )
            .execute()
        )

        if not result.data:
            raise RuntimeError(
                "Failed to persist canonical content."
            )

        content_id = result.data[0]["id"]

        if content.topics:
            topic_rows = [
                {
                    "content_id": content_id,
                    "topic_id": topic_id,
                    "relevance_score": 1.0,
                }
                for topic_id in content.topics
            ]

            topic_result = (
                supabase
                .table("content_topics")
                .upsert(
                    topic_rows,
                    on_conflict="content_id,topic_id",
                )
                .execute()
            )

            if len(topic_result.data) != len(topic_rows):
                raise RuntimeError(
                    "Failed to persist all content topics."
                )

        return content_id

    def get_content_database_id(
        self,
        content: CanonicalContent,
    ) -> str:
        result = (
            supabase
            .table("content_items")
            .select("id")
            .eq("slug", content.slug)
            .single()
            .execute()
        )

        if not result.data:
            raise RuntimeError(
                f"Persisted canonical content not found: "
                f"{content.slug}"
            )

        return result.data["id"]

    def save_home_presentation(
        self,
        content: CanonicalContent,
        presentation: HomePresentation,
    ) -> str:
        database_content_id = self.get_content_database_id(
            content
        )

        row = {
            "content_id": database_content_id,
            "surface": "home",
            "label": presentation.label,
            "display_title": presentation.display_title,
            "display_summary": presentation.display_summary,
           "payload": presentation.payload.model_dump(mode="json"),
           }

        result = (
            supabase
            .table("content_presentations")
            .upsert(
                row,
                on_conflict="content_id,surface",
            )
            .execute()
        )

        if not result.data:
            raise RuntimeError(
                "Failed to persist Home presentation."
            )

        return result.data[0]["id"]


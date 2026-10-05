
from app.models import (
    CanonicalContent,
    FlowPresentation,
    HomePresentation,
)
from app.supabase import supabase


class ContentRepository:

    # ------------------------------------------------------------------
    # CANONICAL CONTENT
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # GET CANONICAL CONTENT
    # ------------------------------------------------------------------

    def get_content(
        self,
        content_id: str,
    ) -> CanonicalContent:

        result = (
            supabase
            .table("content_items")
            .select("*")
            .eq("id", content_id)
            .single()
            .execute()
        )

        if not result.data:
            raise RuntimeError(
                f"Content not found: {content_id}"
            )

        body = result.data.get("body")

        if not body:
            raise RuntimeError(
                f"Content body missing: {content_id}"
            )

        return CanonicalContent.model_validate(body)

    # ------------------------------------------------------------------
    # GET CONTENT BY SLUG
    # ------------------------------------------------------------------

    def get_content_by_slug(
        self,
        slug: str,
    ) -> CanonicalContent:

        result = (
            supabase
            .table("content_items")
            .select("*")
            .eq("slug", slug)
            .single()
            .execute()
        )

        if not result.data:
            raise RuntimeError(
                f"Content not found for slug: {slug}"
            )

        body = result.data.get("body")

        if not body:
            raise RuntimeError(
                f"Content body missing for slug: {slug}"
            )

        return CanonicalContent.model_validate(body)

    # ------------------------------------------------------------------
    # DATABASE ID BOUNDARY
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # HOME PRESENTATION
    # ------------------------------------------------------------------

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
            "payload": presentation.payload.model_dump(
                mode="json"
            ),
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

    def get_home_presentation(
        self,
        content_id: str,
    ) -> HomePresentation | None:

        result = (
            supabase
            .table("content_presentations")
            .select(
                "content_id,label,display_title,"
                "display_summary,payload"
            )
            .eq("content_id", content_id)
            .eq("surface", "home")
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        row = result.data

        return HomePresentation.model_validate(
            {
                "content_id": row["content_id"],
                "label": row["label"],
                "display_title": row["display_title"],
                "display_summary": row["display_summary"],
                "payload": row["payload"],
            }
        )

    # ------------------------------------------------------------------
    # FLOW PRESENTATION
    # ------------------------------------------------------------------

    def save_flow_presentation(
        self,
        content: CanonicalContent,
        presentation: FlowPresentation,
    ) -> str:

        database_content_id = self.get_content_database_id(
            content
        )

        row = {
            "content_id": database_content_id,
            "surface": "flow",
            "label": None,
            "display_title": None,
            "display_summary": None,
            "payload": presentation.model_dump(
                mode="json"
            ),
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
                "Failed to persist Flow presentation."
            )

        return result.data[0]["id"]

    def get_flow_presentation(
        self,
        content_id: str,
    ) -> FlowPresentation | None:

        result = (
            supabase
            .table("content_presentations")
            .select("payload")
            .eq("content_id", content_id)
            .eq("surface", "flow")
            .maybe_single()
            .execute()
        )

        if not result.data:
            return None

        payload = result.data.get("payload")

        if not payload:
            raise RuntimeError(
                f"Flow presentation payload missing: "
                f"{content_id}"
            )

        return FlowPresentation.model_validate(
            payload
        )


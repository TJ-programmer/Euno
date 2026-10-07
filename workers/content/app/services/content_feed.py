from app.models import (
    CanonicalContent,
    FlowPresentation,
    HomePresentation,
)
from app.repositories.content import ContentRepository


class ContentFeed:
    """
    Read-only service for retrieving feed content.

    Responsibilities:
    - Retrieve paginated Home feed items.

    Not responsible for:
    - Database queries.
    - Content generation.
    - Presentation generation.
    - Personalization.
    """

    def __init__(
        self,
        repository: ContentRepository | None = None,
    ):
        self.repository = repository or ContentRepository()

    # ------------------------------------------------------------------
    # HOME FEED
    # ------------------------------------------------------------------

    def get_home_feed(
        self,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:

        return self.repository.get_home_feed(
            limit=limit,
            offset=offset,
        )


class ContentDetailService:
    """
    Read-only service for retrieving the complete content detail.

    Responsibilities:
    - Retrieve canonical content.
    - Retrieve Home presentation.
    - Retrieve Flow presentation.

    Not responsible for:
    - Database queries.
    - Content generation.
    - Presentation generation.
    - Personalization.
    """

    def __init__(
        self,
        repository: ContentRepository | None = None,
    ):
        self.repository = repository or ContentRepository()

    # ------------------------------------------------------------------
    # CANONICAL CONTENT
    # ------------------------------------------------------------------

    def get_content(
        self,
        content_id: str,
    ) -> CanonicalContent:

        return self.repository.get_content(
            content_id
        )

    # ------------------------------------------------------------------
    # HOME PRESENTATION
    # ------------------------------------------------------------------

    def get_home_presentation(
        self,
        content_id: str,
    ) -> HomePresentation | None:

        return self.repository.get_home_presentation(
            content_id
        )

    # ------------------------------------------------------------------
    # FLOW PRESENTATION
    # ------------------------------------------------------------------

    def get_flow_presentation(
        self,
        content_id: str,
    ) -> FlowPresentation | None:

        return self.repository.get_flow_presentation(
            content_id
        )

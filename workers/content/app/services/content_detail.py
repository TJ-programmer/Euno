from app.models import (
    CanonicalContent,
    FlowPresentation,
    HomePresentation,
)
from app.repositories.content import ContentRepository


class ContentDetailService:
    def __init__(
        self,
        repository: ContentRepository | None = None,
    ):
        self.repository = (
            repository or ContentRepository()
        )

    def get_content(
        self,
        content_id: str,
    ) -> CanonicalContent:
        # Repository already fetches the row, checks the body,
        # and returns a validated CanonicalContent.
        return self.repository.get_content(
            content_id=content_id,
        )

    def get_home_presentation(
        self,
        content_id: str,
    ) -> HomePresentation | None:
        # Repository returns a validated HomePresentation or None.
        return self.repository.get_home_presentation(
            content_id=content_id,
        )

    def get_flow_presentation(
        self,
        content_id: str,
    ) -> FlowPresentation | None:
        # Repository returns a validated FlowPresentation or None,
        # and raises if the payload is missing.
        return self.repository.get_flow_presentation(
            content_id=content_id,
        )

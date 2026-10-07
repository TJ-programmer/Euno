from fastapi import APIRouter, HTTPException

from app.api.models import ContentDetailResponse
from app.services.content_detail import ContentDetailService


router = APIRouter(
    prefix="/api/v1/content",
    tags=["content"],
)

content_detail = ContentDetailService()


@router.get(
    "/{content_id}",
    response_model=ContentDetailResponse,
)
def get_content_detail(
    content_id: str,
) -> ContentDetailResponse:

    try:
        content = content_detail.get_content(
            content_id
        )

        home = content_detail.get_home_presentation(
            content_id
        )

        flow = content_detail.get_flow_presentation(
            content_id
        )

        return ContentDetailResponse(
            content=content.model_dump(
                mode="json"
            ),
            home=(
                home.model_dump(mode="json")
                if home
                else None
            ),
            flow=(
                flow.model_dump(mode="json")
                if flow
                else None
            ),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail="Content not found.",
        ) from exc

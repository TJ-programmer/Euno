from fastapi import FastAPI, HTTPException, Query

from app.api.models import (
    FeedItemResponse,
    HomeFeedResponse,
)
from app.api.routes.content import router as content_router
from app.services.content_feed import ContentFeed


app = FastAPI(
    title="Euno Content API",
    version="1.0.0",
    description="API for retrieving Euno learning content.",
)

app.include_router(content_router)

content_feed = ContentFeed()


# ------------------------------------------------------------------
# HEALTH CHECK
# ------------------------------------------------------------------

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


# ------------------------------------------------------------------
# HOME FEED
# ------------------------------------------------------------------

@app.get(
    "/api/v1/home",
    response_model=HomeFeedResponse,
)
def get_home_feed(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
) -> HomeFeedResponse:

    try:
        items = content_feed.get_home_feed(
            limit=limit,
            offset=offset,
        )

        return HomeFeedResponse(
            items=[
                FeedItemResponse.model_validate(item)
                for item in items
            ],
            limit=limit,
            offset=offset,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve the Home feed.",
        ) from exc

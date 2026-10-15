import logging
import time
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.models import (
    FeedItemResponse,
    HomeFeedResponse,
    FlowFeedItemResponse,
    FlowFeedResponse,
)
from app.api.routes.content import router as content_router
from app.services.content_feed import ContentFeed


# ------------------------------------------------------------------
# LOGGING
# ------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | %(levelname)s | "
        "%(name)s | %(message)s"
    ),
    force=True,
)

logger = logging.getLogger("euno.api")


# ------------------------------------------------------------------
# APP
# ------------------------------------------------------------------

app = FastAPI(
    title="Euno Content API",
    version="1.0.0",
    description="API for retrieving Euno learning content.",
)

app.include_router(content_router)

content_feed = ContentFeed()


# ------------------------------------------------------------------
# REQUEST LOGGING
# ------------------------------------------------------------------

@app.middleware("http")
async def log_requests(
    request: Request,
    call_next,
):
    request_id = request.headers.get(
        "X-Request-ID",
        str(uuid.uuid4())[:8],
    )

    request.state.request_id = request_id
    start_time = time.perf_counter()

    logger.info(
        "REQUEST START | request_id=%s | method=%s | path=%s",
        request_id,
        request.method,
        request.url.path,
    )

    try:
        response = await call_next(request)

        duration_ms = round(
            (time.perf_counter() - start_time) * 1000,
            2,
        )

        response.headers["X-Request-ID"] = request_id

        logger.info(
            "REQUEST END | request_id=%s | method=%s | "
            "path=%s | status=%s | duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        return response

    except Exception:
        duration_ms = round(
            (time.perf_counter() - start_time) * 1000,
            2,
        )

        logger.exception(
            "REQUEST CRASHED | request_id=%s | "
            "method=%s | path=%s | duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise


# ------------------------------------------------------------------
# REQUEST VALIDATION ERRORS
# ------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    request_id = getattr(
        request.state,
        "request_id",
        "unknown",
    )

    logger.warning(
        "REQUEST VALIDATION FAILED | request_id=%s | "
        "path=%s | errors=%r",
        request_id,
        request.url.path,
        exc.errors(),
    )

    return JSONResponse(
        status_code=422,
        headers={"X-Request-ID": request_id},
        content={
            "detail": {
                "message": "Request validation failed.",
                "request_id": request_id,
                "errors": exc.errors(),
            }
        },
    )


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
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> HomeFeedResponse:

    request_id = getattr(
        request.state,
        "request_id",
        "unknown",
    )

    logger.info(
        "HOME FEED START | request_id=%s | limit=%s | offset=%s",
        request_id,
        limit,
        offset,
    )

    # --------------------------------------------------------------
    # STAGE 1: FETCH HOME FEED ITEMS
    # --------------------------------------------------------------

    try:
        items = content_feed.get_home_feed(
            limit=limit,
            offset=offset,
        )

        logger.info(
            "HOME FEED FETCH SUCCESS | request_id=%s | count=%s",
            request_id,
            len(items),
        )

    except Exception as exc:
        logger.exception(
            "HOME FEED FETCH FAILED | request_id=%s",
            request_id,
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to retrieve Home feed items.",
                "request_id": request_id,
                "stage": "service",
                "error_type": type(exc).__name__,
                "error": str(exc),
            },
        ) from exc

    # --------------------------------------------------------------
    # STAGE 2: VALIDATE EACH ITEM
    # --------------------------------------------------------------

    validated_items: list[FeedItemResponse] = []

    for index, item in enumerate(items):
        content_id = (
            item.get("content_id")
            if isinstance(item, dict)
            else None
        )

        try:
            if not isinstance(item, dict):
                raise TypeError(
                    "Expected a dictionary for a Home feed item; "
                    f"received {type(item).__name__}."
                )

            # ------------------------------------------------------
            # MODEL DIAGNOSTICS
            # ------------------------------------------------------

            model_module = FeedItemResponse.__module__
            imported_model_module = __import__(
                model_module,
                fromlist=["__file__"],
            )

            logger.error(
                "MODEL DIAGNOSTIC | request_id=%s | "
                "model_module=%s | model_file=%s | "
                "model_fields=%s | payload_in_item=%s",
                request_id,
                model_module,
                getattr(imported_model_module, "__file__", None),
                list(FeedItemResponse.model_fields.keys()),
                "payload" in item,
            )

            logger.error(
                "MODEL CONFIG | request_id=%s | config=%r",
                request_id,
                FeedItemResponse.model_config,
            )

            logger.error(
                "ITEM DIAGNOSTIC | request_id=%s | index=%s | "
                "content_id=%s | item_keys=%s | payload=%r",
                request_id,
                index,
                content_id,
                list(item.keys()),
                item.get("payload"),
            )

            # ------------------------------------------------------
            # VALIDATE ITEM
            # ------------------------------------------------------

            validated_item = FeedItemResponse.model_validate(item)
            validated_items.append(validated_item)

        except Exception as exc:
            if hasattr(exc, "errors") and callable(exc.errors):
                validation_errors: Any = exc.errors()
            else:
                validation_errors = [
                    {
                        "type": type(exc).__name__,
                        "message": str(exc),
                    }
                ]

            logger.exception(
                "HOME FEED ITEM VALIDATION FAILED | "
                "request_id=%s | index=%s | content_id=%s | "
                "item_keys=%s | validation_errors=%r | item=%r",
                request_id,
                index,
                content_id,
                list(item.keys()) if isinstance(item, dict) else None,
                validation_errors,
                item,
            )

            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Home feed item validation failed.",
                    "request_id": request_id,
                    "stage": "item_validation",
                    "item_index": index,
                    "content_id": content_id,
                    "validation_errors": validation_errors,
                    "item_keys": (
                        list(item.keys())
                        if isinstance(item, dict)
                        else None
                    ),
                },
            ) from exc

    # --------------------------------------------------------------
    # STAGE 3: BUILD RESPONSE
    # --------------------------------------------------------------

    try:
        response = HomeFeedResponse(
            items=validated_items,
            limit=limit,
            offset=offset,
        )

    except Exception as exc:
        if hasattr(exc, "errors") and callable(exc.errors):
            validation_errors = exc.errors()
        else:
            validation_errors = [
                {
                    "type": type(exc).__name__,
                    "message": str(exc),
                }
            ]

        logger.exception(
            "HOME FEED RESPONSE CONSTRUCTION FAILED | "
            "request_id=%s | errors=%r",
            request_id,
            validation_errors,
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to construct Home feed response.",
                "request_id": request_id,
                "stage": "response_construction",
                "validation_errors": validation_errors,
            },
        ) from exc

    logger.info(
        "HOME FEED SUCCESS | request_id=%s | item_count=%s",
        request_id,
        len(validated_items),
    )

    return response


# ------------------------------------------------------------------
# FLOW FEED
# ------------------------------------------------------------------

@app.get(
    "/api/v1/flow",
    response_model=FlowFeedResponse,
)
def get_flow_feed(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> FlowFeedResponse:

    try:
        items = content_feed.get_flow_feed(
            limit=limit,
            offset=offset,
        )

        return FlowFeedResponse(
            items=[
                FlowFeedItemResponse.model_validate(item)
                for item in items
            ],
            limit=limit,
            offset=offset,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve the Flow feed.",
        ) from exc


# ------------------------------------------------------------------
# UNHANDLED EXCEPTIONS
# ------------------------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    request_id = getattr(
        request.state,
        "request_id",
        "unknown",
    )

    logger.exception(
        "UNHANDLED API EXCEPTION | request_id=%s | "
        "method=%s | path=%s",
        request_id,
        request.method,
        request.url.path,
    )

    return JSONResponse(
        status_code=500,
        headers={"X-Request-ID": request_id},
        content={
            "detail": {
                "message": "Internal server error.",
                "request_id": request_id,
            }
        },
    )

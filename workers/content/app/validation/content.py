import re
from urllib.parse import urlparse

from app.models import CanonicalContent, SourceInput


def normalize_text(text: str) -> str:
    """
    Normalize whitespace and casing so source quotes can be
    compared deterministically while allowing line wrapping
    differences.
    """
    return re.sub(r"\s+", " ", text).strip().lower()


def validate_non_empty_text(
    value: str | None,
    field_name: str,
) -> None:
    if value is None or not value.strip():
        raise ValueError(
            f"Canonical content field '{field_name}' cannot be empty."
        )


def validate_unique_ids(
    ids: list[str],
    field_name: str,
) -> None:
    if len(ids) != len(set(ids)):
        duplicates = sorted(
            {
                item
                for item in ids
                if ids.count(item) > 1
            }
        )

        raise ValueError(
            f"Duplicate {field_name} IDs found: {duplicates}"
        )


def validate_source_urls(
    sources: list[SourceInput],
) -> None:
    for source in sources:
        parsed = urlparse(source.url)

        if parsed.scheme not in {"http", "https"}:
            raise ValueError(
                f"Source '{source.id}' has an invalid URL: "
                f"{source.url}"
            )

        if not parsed.netloc:
            raise ValueError(
                f"Source '{source.id}' has an invalid URL: "
                f"{source.url}"
            )


def validate_claim_evidence(
    content: CanonicalContent,
    sources: list[SourceInput],
) -> None:
    source_map = {
        source.id: source.content
        for source in sources
    }

    for claim in content.claims:

        if not claim.source_ids:
            raise ValueError(
                f"Claim '{claim.id}' must reference at least one source."
            )

        if not claim.source_quote:
            raise ValueError(
                f"Claim '{claim.id}' is missing source evidence."
            )

        normalized_quote = normalize_text(
            claim.source_quote
        )

        supported = False

        for source_id in claim.source_ids:
            source_content = source_map.get(source_id)

            if not source_content:
                continue

            normalized_source = normalize_text(
                source_content
            )

            if normalized_quote in normalized_source:
                supported = True
                break

        if not supported:
            raise ValueError(
                f"Claim '{claim.id}' has source evidence that "
                "does not appear in the supplied source material."
            )


def validate_source_traceability(
    content: CanonicalContent,
    sources: list[SourceInput],
) -> None:

    # ---------------------------------------------------------
    # Source-level validation
    # ---------------------------------------------------------

    if not sources:
        raise ValueError(
            "Canonical content cannot be generated without sources."
        )

    validate_unique_ids(
        [source.id for source in sources],
        "source",
    )

    validate_source_urls(sources)

    for source in sources:
        validate_non_empty_text(
            source.content,
            f"source[{source.id}].content",
        )

        validate_non_empty_text(
            source.name,
            f"source[{source.id}].name",
        )

    # ---------------------------------------------------------
    # Canonical identity / required fields
    # ---------------------------------------------------------

    validate_non_empty_text(
        content.id,
        "id",
    )

    validate_non_empty_text(
        content.slug,
        "slug",
    )

    validate_non_empty_text(
        content.title,
        "title",
    )

    validate_non_empty_text(
        content.core_question,
        "core_question",
    )

    validate_non_empty_text(
        content.core_idea,
        "core_idea",
    )

    validate_non_empty_text(
        content.takeaway,
        "takeaway",
    )

    if not content.topics:
        raise ValueError(
            "Canonical content must contain at least one topic."
        )

    # ---------------------------------------------------------
    # Topic validation
    # ---------------------------------------------------------

    if any(
        not topic.strip()
        for topic in content.topics
    ):
        raise ValueError(
            "Canonical content contains an empty topic."
        )

    validate_unique_ids(
        content.topics,
        "topic",
    )

    # ---------------------------------------------------------
    # Claim validation
    # ---------------------------------------------------------

    if not content.claims:
        raise ValueError(
            "Canonical content must contain at least one claim."
        )

    validate_unique_ids(
        [claim.id for claim in content.claims],
        "claim",
    )

    valid_source_ids = {
        source.id
        for source in sources
    }

    for claim in content.claims:

        validate_non_empty_text(
            claim.id,
            f"claim.id",
        )

        validate_non_empty_text(
            claim.statement,
            f"claim[{claim.id}].statement",
        )

        unknown_claim_sources = (
            set(claim.source_ids) - valid_source_ids
        )

        if unknown_claim_sources:
            raise ValueError(
                f"Claim '{claim.id}' references unknown sources: "
                f"{sorted(unknown_claim_sources)}"
            )

    # ---------------------------------------------------------
    # Canonical source references
    # ---------------------------------------------------------

    if not content.sources:
        raise ValueError(
            "Canonical content must reference at least one source."
        )

    validate_unique_ids(
        [source.id for source in content.sources],
        "canonical source",
    )

    unknown_content_sources = (
        {
            source.id
            for source in content.sources
        }
        - valid_source_ids
    )

    if unknown_content_sources:
        raise ValueError(
            "Canonical content references unknown sources: "
            f"{sorted(unknown_content_sources)}"
        )

    # ---------------------------------------------------------
    # Explanation validation
    # ---------------------------------------------------------

    validate_non_empty_text(
        content.explanation.what,
        "explanation.what",
    )

    validate_non_empty_text(
        content.explanation.why,
        "explanation.why",
    )

    if content.explanation.how is not None:
        validate_non_empty_text(
            content.explanation.how,
            "explanation.how",
        )

    # ---------------------------------------------------------
    # Deeper insight
    # ---------------------------------------------------------

    if content.deeper_insight is not None:
        validate_non_empty_text(
            content.deeper_insight,
            "deeper_insight",
        )

    # ---------------------------------------------------------
    # Connections
    # ---------------------------------------------------------

    if content.connections is not None:

        for index, connection in enumerate(
            content.connections
        ):
            validate_non_empty_text(
                connection.concept,
                f"connections[{index}].concept",
            )

            validate_non_empty_text(
                connection.explanation,
                f"connections[{index}].explanation",
            )

    # ---------------------------------------------------------
    # Evidence validation
    # ---------------------------------------------------------

    validate_claim_evidence(
        content,
        sources,
    )

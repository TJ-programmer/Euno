import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import (
    CanonicalContent,
    Claim,
    Explanation,
    Connection,
    Source,
    FlowPresentation,
    FlowSection,
)

from app.validation.flow import validate_flow_presentation


def build_canonical() -> CanonicalContent:
    return CanonicalContent(
        id="cf1",
        slug="test-flow",
        content_type="evergreen",
        topics=["science"],
        title="Test",
        core_question="Why?",
        core_idea="Because.",
        context=None,
        claims=[
            Claim(
                id="c1",
                statement="Test claim.",
                importance="core",
                source_ids=["src1"],
                source_quote="Test claim.",
                confidence=None,
            )
        ],
        explanation=Explanation(
            what="Test.",
            why="Test.",
            how=None,
        ),
        deeper_insight=None,
        connections=[],
        takeaway="Test takeaway.",
        sources=[
            Source(
                id="src1",
                url="https://example.com",
                name="Example",
                source_type="reference",
                title="Example",
                author=None,
                published_at=None,
                retrieved_at="2026-09-29T00:00:00Z",
            )
        ],
        difficulty="quick",
        estimated_minutes=1,
        published_at=None,
        source_published_at=None,
        generated_at="2026-09-29T00:00:00Z",
        generator_version="test",
    )


def build_section() -> FlowSection:
    return FlowSection(
        title="Test",
        body="Test body.",
        source_claim_ids=["c1"],
    )


def build_flow() -> FlowPresentation:
    section = build_section()

    return FlowPresentation(
        content_id="cf1",
        hook=section,
        tension=section,
        reveal=section,
        why=section,
        surprise=section,
        connection=section,
        takeaway=section,
        next_curiosity=section,
        payload={},
    )


def main():
    content = build_canonical()
    presentation = build_flow()

    # --------------------------------------------------------------
    # Valid presentation
    # --------------------------------------------------------------

    validate_flow_presentation(
        presentation,
        content,
    )

    print("Valid Flow presentation: PASS")

    # --------------------------------------------------------------
    # Invalid content ID
    # --------------------------------------------------------------

    presentation.content_id = "wrong-id"

    try:
        validate_flow_presentation(
            presentation,
            content,
        )
    except ValueError:
        print("Invalid content_id: PASS")
    else:
        raise AssertionError(
            "Invalid content_id was not rejected."
        )

    presentation.content_id = content.id

    # --------------------------------------------------------------
    # Invalid claim ID
    # --------------------------------------------------------------

    presentation.hook.source_claim_ids = [
        "unknown-claim"
    ]

    try:
        validate_flow_presentation(
            presentation,
            content,
        )
    except ValueError:
        print("Unknown claim ID: PASS")
    else:
        raise AssertionError(
            "Unknown claim ID was not rejected."
        )

    presentation.hook.source_claim_ids = ["c1"]

    # --------------------------------------------------------------
    # Empty payload
    # --------------------------------------------------------------

    presentation.payload = {
        "something": "not allowed"
    }

    try:
        validate_flow_presentation(
            presentation,
            content,
        )
    except ValueError:
        print("Non-empty payload: PASS")
    else:
        raise AssertionError(
            "Non-empty payload was not rejected."
        )

    print()
    print("=" * 60)
    print("FLOW VALIDATION TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()

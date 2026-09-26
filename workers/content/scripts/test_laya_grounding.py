from datetime import datetime, timezone

from app.models import SourceInput, CanonicalContent
from app.validation.laya_grounding import LayaGroundingJudge


def main():
    print("Initializing Laya...")

    judge = LayaGroundingJudge()

    sources = [
        SourceInput(
            id="src1",
            url="https://example.com/earth",
            name="Example Source",
            source_type="reference",
            title="Earth's Orbit",
            content="""
The Earth completes one orbit around the Sun approximately
every 365.25 days.

The Earth rotates once approximately every 24 hours.
""",
        )
    ]

    content = CanonicalContent(
        id="test-content",
        slug="earth-orbit",
        content_type="evergreen",
        topics=["science"],
        title="How long does Earth take to orbit the Sun?",
        core_question="How long does Earth take to orbit the Sun?",
        core_idea=(
            "Earth takes approximately 365.25 days to complete "
            "one orbit around the Sun."
        ),
        context=(
            "This is a test of whether factual claims are directly "
            "supported by the supplied source."
        ),
        claims=[
            {
                "id": "cl1",
                "statement": (
                    "Earth takes approximately 365.25 days "
                    "to orbit the Sun."
                ),
                "importance": "core",
                "source_ids": ["src1"],
                "source_quote": (
                    "The Earth completes one orbit around the Sun "
                    "approximately every 365.25 days."
                ),
                "confidence": 1.0,
            },
            {
                "id": "cl2",
                "statement": (
                    "Earth rotates approximately once every "
                    "24 hours."
                ),
                "importance": "supporting",
                "source_ids": ["src1"],
                "source_quote": (
                    "The Earth rotates once approximately every "
                    "24 hours."
                ),
                "confidence": 1.0,
            },
        ],
        explanation={
            "what": "Earth orbits the Sun.",
            "how": (
                "Earth remains in orbit because its motion and "
                "the Sun's gravitational attraction interact."
            ),
            "why": "Gravity keeps Earth in orbit around the Sun.",
        },
        deeper_insight=(
            "The approximately 365.25-day orbital period is the "
            "basis of the length of an Earth year."
        ),
        connections=[
            {
                "concept": "Earth's orbit",
                "explanation": (
                    "Earth completes one orbit around the Sun "
                    "approximately every 365.25 days."
                ),
            },
            {
                "concept": "Earth's rotation",
                "explanation": (
                    "Earth rotates approximately once every 24 hours."
                ),
            },
            {
                "concept": "Length of a year",
                "explanation": (
                    "An Earth year corresponds approximately to "
                    "one complete orbit around the Sun."
                ),
            },
        ],
        takeaway=(
            "One Earth year corresponds to approximately "
            "one complete orbit around the Sun."
        ),
        sources=[],
        difficulty="balanced",
        estimated_minutes=3,
        generated_at=datetime(
            2026,
            1,
            1,
            tzinfo=timezone.utc,
        ),
        generator_version="test",
        published_at=None,
        source_published_at=None,
    )

    print("Laya initialized.")
    print("Running grounding test...\n")

    grounding = judge.judge_content(
        content=content,
        sources=sources,
    )

    print("=" * 60)
    print("CONTENT GROUNDING RESULT")
    print("=" * 60)

    all_accepted = all(
        result.decision == "accept"
        for result in grounding
    )

    has_rejections = any(
        result.decision == "reject"
        for result in grounding
    )

    needs_review = any(
        result.decision == "review"
        for result in grounding
    )

    print(f"\nAll accepted: {all_accepted}")
    print(f"Has rejections: {has_rejections}")
    print(f"Needs review: {needs_review}")

    print("\nIndividual claims:")

    for result in grounding:
        print("\n" + "-" * 40)
        print(f"Claim ID:    {result.claim_id}")
        print(f"NOUL:        {result.noul:.6f}")
        print(f"Confidence:  {result.confidence:.6f}")
        print(f"Decision:    {result.decision}")

    print("\n" + "=" * 60)
    print("GROUNDING TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()

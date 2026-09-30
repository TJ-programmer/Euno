
import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import asyncio

from app.generators.flow import FlowPresentationGenerator
from app.models import CanonicalContent, SourceInput
from app.repositories.content import ContentRepository
from app.supabase import supabase


SLUG = "does-coffee-dehydrate-you"


async def main():
    # ------------------------------------------------------------------
    # LOAD CANONICAL CONTENT
    # ------------------------------------------------------------------

    result = (
        supabase
        .table("content_items")
        .select("id,body")
        .eq("slug", SLUG)
        .single()
        .execute()
    )

    if not result.data:
        raise RuntimeError(
            f"Canonical content not found: {SLUG}"
        )

    content = CanonicalContent.model_validate(
        result.data["body"]
    )

    print("\n")
    print("=" * 70)
    print("CANONICAL CONTENT LOADED")
    print("=" * 70)

    print(f"Canonical ID: {content.id}")
    print(f"Slug: {content.slug}")

    # ------------------------------------------------------------------
    # ORIGINAL SOURCE MATERIAL
    # ------------------------------------------------------------------

    sources = [
        SourceInput(
            id="src1",
            url="https://example.com/source-a",
            name="Source A",
            source_type="reference",
            title="Coffee and Hydration",
            content=(
                "Coffee contains caffeine, and caffeine has "
                "a mild diuretic effect. "
                "Drinking coffee can therefore increase "
                "urine production."
            ),
        ),
        SourceInput(
            id="src2",
            url="https://example.com/source-b",
            name="Source B",
            source_type="reference",
            title="Coffee and Hydration",
            content=(
                "Coffee contains caffeine, but moderate coffee "
                "consumption does not necessarily cause dehydration. "
                "The fluid in a normal serving of coffee can "
                "contribute to overall fluid intake."
            ),
        ),
    ]

    # ------------------------------------------------------------------
    # GENERATE FLOW
    # ------------------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("GENERATING FLOW")
    print("=" * 70)

    generator = FlowPresentationGenerator()

    presentation = await generator.generate(
        content=content,
        sources=sources,
    )

    # ------------------------------------------------------------------
    # PERSIST FLOW
    # ------------------------------------------------------------------

    repository = ContentRepository()

    presentation_id = repository.save_flow_presentation(
        content=content,
        presentation=presentation,
    )

    # ------------------------------------------------------------------
    # FETCH PERSISTED ROW
    # ------------------------------------------------------------------

    stored_result = (
        supabase
        .table("content_presentations")
        .select("*")
        .eq("id", presentation_id)
        .single()
        .execute()
    )

    if not stored_result.data:
        raise RuntimeError(
            "Persisted Flow presentation could not be found."
        )

    stored = stored_result.data

    # ------------------------------------------------------------------
    # BASIC DATABASE VALIDATION
    # ------------------------------------------------------------------

    if stored["surface"] != "flow":
        raise AssertionError(
            f"Expected surface='flow', "
            f"got {stored['surface']!r}"
        )

    if stored["content_id"] != content_database_id(content):
        raise AssertionError(
            "Persisted Flow content_id does not match "
            "the canonical database content ID."
        )

    payload = stored["payload"]

    if not isinstance(payload, dict):
        raise AssertionError(
            "Flow payload is not a JSON object."
        )

    # ------------------------------------------------------------------
    # VERIFY ALL EIGHT FLOW SECTIONS
    # ------------------------------------------------------------------

    required_sections = [
        "hook",
        "tension",
        "reveal",
        "why",
        "surprise",
        "connection",
        "takeaway",
        "next_curiosity",
    ]

    for section in required_sections:
        if section not in payload:
            raise AssertionError(
                f"Missing Flow section: {section}"
            )

        section_data = payload[section]

        if not isinstance(section_data, dict):
            raise AssertionError(
                f"Flow section '{section}' "
                "is not a JSON object."
            )

        if not section_data.get("title"):
            raise AssertionError(
                f"Flow section '{section}' "
                "is missing title."
            )

        if not section_data.get("body"):
            raise AssertionError(
                f"Flow section '{section}' "
                "is missing body."
            )

        if "source_claim_ids" not in section_data:
            raise AssertionError(
                f"Flow section '{section}' "
                "is missing source_claim_ids."
            )

    # ------------------------------------------------------------------
    # VERIFY CONTENT ID
    # ------------------------------------------------------------------

    if payload["content_id"] != content.id:
        raise AssertionError(
            "Flow payload content_id does not match "
            "canonical content.id."
        )

    # ------------------------------------------------------------------
    # PRINT STORED ROW
    # ------------------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("FLOW PRESENTATION PERSISTED")
    print("=" * 70)

    print(f"Presentation ID: {presentation_id}")

    print("\nStored row:")
    print(stored)

    # ------------------------------------------------------------------
    # SUCCESS
    # ------------------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("FLOW PERSISTENCE TEST PASSED")
    print("=" * 70)


def content_database_id(
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


if __name__ == "__main__":
    asyncio.run(main())



import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import asyncio

from app.generators.flow import FlowPresentationGenerator
from app.models import CanonicalContent, SourceInput
from app.supabase import supabase


SLUG = "does-coffee-dehydrate-you"


async def main():
    print("\nLoading canonical content...")

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

    print(
        f"Canonical content loaded: {content.id}"
    )

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
    # VERIFY SOURCE CONTENT BEFORE GENERATION
    # ------------------------------------------------------------------

    print("\nSources:")

    for source in sources:
        print(
            f"- {source.id}: "
            f"{len(source.content.strip())} characters"
        )

    if any(
        not source.content.strip()
        for source in sources
    ):
        raise RuntimeError(
            "Test setup error: one or more SourceInput objects "
            "have empty content."
        )

    # ------------------------------------------------------------------
    # GENERATE FLOW
    # ------------------------------------------------------------------

    print("\nGenerating Flow presentation...")

    generator = FlowPresentationGenerator()

    presentation = await generator.generate(
        content=content,
        sources=sources,
    )

    # ------------------------------------------------------------------
    # PRINT FLOW
    # ------------------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("FLOW PRESENTATION")
    print("=" * 70)

    print(
        presentation.model_dump_json(
            indent=2
        )
    )

    # ------------------------------------------------------------------
    # SUCCESS
    # ------------------------------------------------------------------

    print("\n")
    print("=" * 70)
    print("FLOW GENERATION TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())


import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio

from app.generators.home import HomePresentationGenerator
from app.models import CanonicalContent
from app.supabase import supabase


SLUG = "does-coffee-dehydrate-you"


async def main():
    # ------------------------------------------------------------------
    # Load canonical content from Supabase
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

    database_content_id = result.data["id"]

    content = CanonicalContent.model_validate(
        result.data["body"]
    )

    # ------------------------------------------------------------------
    # Generate + persist Home presentation
    # ------------------------------------------------------------------

    generator = HomePresentationGenerator()

    presentation = await generator.generate(
        content
    )

    print("\n")
    print("=" * 70)
    print("HOME PRESENTATION")
    print("=" * 70)

    print(
        presentation.model_dump_json(
            indent=2
        )
    )

    # ------------------------------------------------------------------
    # Verify persistence
    # ------------------------------------------------------------------

    stored = (
        supabase
        .table("content_presentations")
        .select(
            "id,content_id,surface,label,"
            "display_title,display_summary,payload"
        )
        .eq(
            "content_id",
            database_content_id,
        )
        .eq(
            "surface",
            "home",
        )
        .execute()
    )

    if not stored.data:
        raise RuntimeError(
            "Home presentation was not persisted."
        )

    print("\n")
    print("=" * 70)
    print("PERSISTED HOME PRESENTATION")
    print("=" * 70)

    for row in stored.data:
        print(row)

    # ------------------------------------------------------------------
    # Verify exactly one Home presentation exists
    # ------------------------------------------------------------------

    if len(stored.data) != 1:
        raise RuntimeError(
            "Expected exactly one Home presentation, "
            f"found {len(stored.data)}."
        )

    persisted = stored.data[0]

    if persisted["content_id"] != database_content_id:
        raise RuntimeError(
            "Persisted Home presentation references "
            "the wrong content ID."
        )

    if persisted["surface"] != "home":
        raise RuntimeError(
            "Persisted presentation surface is not 'home'."
        )

    print("\n")
    print("=" * 70)
    print("HOME PRESENTATION TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())


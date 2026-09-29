import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import HomePresentation
from app.repositories.content import ContentRepository
from app.supabase import supabase


CONTENT_ID = "e051f530-0531-47da-aebf-7f650ff0ed8c"


def main():
    repository = ContentRepository()

    presentation = HomePresentation(
        content_id=CONTENT_ID,
        label="Worth knowing",
        display_title="Does coffee dehydrate you?",
        display_summary=(
            "Caffeine has a mild diuretic effect and can increase "
            "urine production, yet the water in a typical cup "
            "contributes to fluid intake, so moderate coffee "
            "consumption does not necessarily cause dehydration."
        ),
        payload={},
    )

    presentation_id = repository.save_home_presentation(
        presentation
    )

    print("\n")
    print("=" * 70)
    print("HOME PRESENTATION PERSISTED")
    print("=" * 70)
    print(f"Presentation ID: {presentation_id}")

    result = (
        supabase
        .table("content_presentations")
        .select(
            "id,content_id,surface,label,"
            "display_title,display_summary,payload"
        )
        .eq("content_id", CONTENT_ID)
        .eq("surface", "home")
        .single()
        .execute()
    )

    print("\nStored row:")
    print(result.data)

    count_result = (
        supabase
        .table("content_presentations")
        .select(
            "id",
            count="exact",
        )
        .eq("content_id", CONTENT_ID)
        .eq("surface", "home")
        .execute()
    )

    print(
        f"\nHome presentation count: "
        f"{count_result.count}"
    )


if __name__ == "__main__":
    main()


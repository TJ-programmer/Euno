import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from app.services.content_detail import (
    ContentDetailService,
)


def main() -> None:
    print("=" * 70)
    print("EUNO CONTENT DETAIL TEST")
    print("=" * 70)

    content_id = input(
        "\nEnter content ID: "
    ).strip()

    if not content_id:
        raise ValueError(
            "Content ID is required."
        )

    # --------------------------------------------------------------
    # CANONICAL
    # --------------------------------------------------------------

    print()
    print("CANONICAL CONTENT")
    print("-" * 70)

    service = ContentDetailService()

    content = service.get_content(
        content_id
    )

    print(
        f"ID: {content.id}"
    )
    print(
        f"Slug: {content.slug}"
    )
    print(
        f"Title: {content.title}"
    )
    print(
        f"Type: {content.content_type}"
    )
    print(
        f"Difficulty: {content.difficulty}"
    )
    print(
        f"Estimated minutes: "
        f"{content.estimated_minutes}"
    )

    # --------------------------------------------------------------
    # HOME
    # --------------------------------------------------------------

    print()
    print("HOME PRESENTATION")
    print("-" * 70)

    home = service.get_home_presentation(
        content_id
    )

    if home is None:
        print(
            "Home presentation: NOT FOUND"
        )
    else:
        print(
            f"Content ID: {home.content_id}"
        )
        print(
            f"Label: {home.label}"
        )
        print(
            f"Display title: "
            f"{home.display_title}"
        )
        print(
            f"Display summary: "
            f"{home.display_summary}"
        )

    # --------------------------------------------------------------
    # FLOW
    # --------------------------------------------------------------

    print()
    print("FLOW PRESENTATION")
    print("-" * 70)

    flow = service.get_flow_presentation(
        content_id
    )

    if flow is None:
        print(
            "Flow presentation: NOT FOUND"
        )
    else:
        print(
            f"Content ID: {flow.content_id}"
        )
        print(
            f"Label: {flow.label}"
        )
        print()

        payload = flow.payload

        sections = [
            ("Hook", payload.hook),
            ("Tension", payload.tension),
            ("Reveal", payload.reveal),
            ("Why", payload.why),
            ("Surprise", payload.surprise),
            ("Connection", payload.connection),
            ("Takeaway", payload.takeaway),
            ("Next curiosity", payload.next_curiosity),
        ]

        for name, section in sections:
            print(
                f"{name}: {section.title}"
            )
            print(
                f"  Body: {section.body}"
            )
            print(
                f"  Claims: "
                f"{', '.join(section.source_claim_ids)}"
            )
            print()

    print()
    print("=" * 70)
    print("CONTENT DETAIL TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    main()

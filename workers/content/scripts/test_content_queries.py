
import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from app.repositories.content import ContentRepository


def print_separator():
    print()
    print("=" * 70)


def main():
    repository = ContentRepository()

    print_separator()
    print("EUNO CONTENT QUERY TEST")
    print_separator()

    # ------------------------------------------------------------------
    # HOME FEED
    # ------------------------------------------------------------------

    print()
    print("HOME FEED")
    print("-" * 70)

    home_feed = repository.get_home_feed(
        limit=10,
    )

    print(
        f"Home presentations found: {len(home_feed)}"
    )

    if not home_feed:
        print("No Home presentations found.")
    else:
        for index, item in enumerate(
            home_feed,
            start=1,
        ):
            content = item.get(
                "content_items",
                {},
            )

            print()
            print(
                f"[{index}] "
                f"{item.get('display_title')}"
            )

            print(
                f"Content ID: "
                f"{item.get('content_id')}"
            )

            print(
                f"Slug: "
                f"{content.get('slug')}"
            )

            print(
                f"Type: "
                f"{content.get('content_type')}"
            )

            print(
                f"Difficulty: "
                f"{content.get('difficulty')}"
            )

    # ------------------------------------------------------------------
    # CANONICAL CONTENT LOOKUP
    # ------------------------------------------------------------------

    if home_feed:
        first_content_id = home_feed[0]["content_id"]

        print_separator()
        print("CANONICAL CONTENT LOOKUP")
        print("-" * 70)

        content = repository.get_content(
            content_id=first_content_id,
        )

        if content is None:
            raise RuntimeError(
                "Canonical content lookup returned no result."
            )

        print(
            f"ID: {content['id']}"
        )

        print(
            f"Slug: {content['slug']}"
        )

        print(
            f"Title: {content['title']}"
        )

        print(
            f"Type: {content['content_type']}"
        )

        print(
            f"Difficulty: {content['difficulty']}"
        )

        print(
            f"Estimated minutes: "
            f"{content['estimated_minutes']}"
        )

    # ------------------------------------------------------------------
    # SLUG LOOKUP
    # ------------------------------------------------------------------

    if home_feed:
        first_slug = home_feed[0][
            "content_items"
        ]["slug"]

        print_separator()
        print("SLUG LOOKUP")
        print("-" * 70)

        content_by_slug = (
            repository.get_content_by_slug(
                slug=first_slug,
            )
        )

        if content_by_slug is None:
            raise RuntimeError(
                "Slug lookup returned no result."
            )

        print(
            f"ID: {content_by_slug['id']}"
        )

        print(
            f"Slug: {content_by_slug['slug']}"
        )

        print(
            f"Title: {content_by_slug['title']}"
        )

    # ------------------------------------------------------------------
    # FLOW LOOKUP
    # ------------------------------------------------------------------

    print_separator()
    print("FLOW PRESENTATION LOOKUP")
    print("-" * 70)

    flow_found = False

    for item in home_feed:
        content_id = item["content_id"]

        flow = repository.get_flow_presentation(
            content_id=content_id,
        )

        if flow is None:
            continue

        flow_found = True

        payload = flow.get(
            "payload",
            {},
        )

        print(
            f"Flow presentation ID: "
            f"{flow['id']}"
        )

        print(
            f"Content ID: "
            f"{flow['content_id']}"
        )

        print(
            f"Surface: "
            f"{flow['surface']}"
        )

        print(
            f"Payload keys: "
            f"{list(payload.keys())}"
        )

        break

    if not flow_found:
        print(
            "No Flow presentation found for "
            "the Home feed content."
        )

    # ------------------------------------------------------------------
    # FINAL RESULT
    # ------------------------------------------------------------------

    print_separator()
    print("CONTENT QUERY TEST PASSED")
    print_separator()


if __name__ == "__main__":
    main()


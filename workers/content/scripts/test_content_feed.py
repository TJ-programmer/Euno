import asyncio
import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from app.services.content_feed import ContentFeed


def main() -> None:
    print("=" * 70)
    print("EUNO CONTENT FEED TEST")
    print("=" * 70)

    feed_service = ContentFeed()

    print()
    print("HOME FEED")
    print("-" * 70)

    feed = feed_service.get_home_feed(
        limit=10,
    )

    print(
        f"Items returned: {len(feed)}"
    )

    for index, item in enumerate(
        feed,
        start=1,
    ):
        print()
        print(
            f"[{index}] {item.title}"
        )
        print(
            f"Content ID: {item.content_id}"
        )
        print(
            f"Slug: {item.slug}"
        )
        print(
            f"Label: {item.label}"
        )
        print(
            f"Type: {item.content_type}"
        )
        print(
            f"Difficulty: {item.difficulty}"
        )
        print(
            f"Minutes: {item.estimated_minutes}"
        )
        print(
            f"Topics: {item.topics}"
        )
        print(
            f"Summary: {item.summary}"
        )

    print()
    print("=" * 70)
    print("CONTENT FEED TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    main()

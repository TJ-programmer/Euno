import asyncio
import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from app.supply.content_supply import ContentSupplyRunner


TOPICS = [
    "artificial-intelligence",
    "psychology",
    "science",
    "technology",
    "history",
    "nature",
]


async def main():

    count = 5

    if len(sys.argv) > 1:
        count = int(sys.argv[1])

    runner = ContentSupplyRunner()

    result = await runner.run(
        topics=TOPICS,
        count=count,
        difficulty="balanced",
    )

    if result.failed:
        print()
        print(
            f"Supply finished with "
            f"{result.failed} failure(s)."
        )

    if result.persisted == 0:
        raise RuntimeError(
            "Content supply produced no persisted content."
        )


if __name__ == "__main__":
    asyncio.run(main())

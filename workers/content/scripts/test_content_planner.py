import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import asyncio

from app.planners.content_planner import ContentPlanner


TOPICS = [
    "artificial-intelligence",
    "psychology",
    "science",
    "technology",
    "history",
    "nature",
]


async def main():

    print("=" * 70)
    print("EUNO CONTENT PLANNER TEST")
    print("=" * 70)

    planner = ContentPlanner()

    plans = await planner.generate(
        topics=TOPICS,
        count=5,
        difficulty="balanced",
    )

    print()
    print("=" * 70)
    print("CONTENT PLANS")
    print("=" * 70)

    for index, plan in enumerate(plans, start=1):

        print()
        print(f"[{index}]")
        print(f"Topic:       {plan.topic}")
        print(f"Direction:   {plan.direction}")
        print(f"Type:        {plan.content_type}")
        print(f"Difficulty:  {plan.difficulty}")

    print()
    print("=" * 70)
    print("CONTENT PLANNER TEST PASSED")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())

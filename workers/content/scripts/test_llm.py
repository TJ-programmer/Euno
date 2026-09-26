import asyncio

from app.generators.canonical import CanonicalGenerator
from app.models import SourceInput


async def main():
    sources = [
        SourceInput(
            id="src1",
            url="https://example.com/source-a",
            name="Source A",
            source_type="reference",
            title="Coffee and Hydration",
            content="""
Coffee contains caffeine, and caffeine has a mild diuretic effect.
Drinking coffee can therefore increase urine production.
""",
        ),
        SourceInput(
            id="src2",
            url="https://example.com/source-b",
            name="Source B",
            source_type="reference",
            title="Coffee and Hydration",
            content="""
Coffee contains caffeine, but moderate coffee consumption does not
necessarily cause dehydration. The fluid in a normal serving of coffee
can contribute to overall fluid intake.
""",
        ),
    ]

    generator = CanonicalGenerator()

    content = await generator.generate(
        topic="Does coffee dehydrate you?",
        sources=sources,
        content_type="evergreen",
        difficulty="balanced",
        allowed_topics=[
            "health",
            "food",
            "science",
        ],
    )

    print("\n")
    print("=" * 70)
    print("CANONICAL CONTENT")
    print("=" * 70)

    print(
        content.model_dump_json(
            indent=2
        )
    )


if __name__ == "__main__":
    asyncio.run(main())

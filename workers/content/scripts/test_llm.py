import asyncio

from app.generators.canonical import CanonicalGenerator


async def main():

    generator = CanonicalGenerator()

    content = await generator.generate(
        topic="Why unfinished tasks stay in our minds",
        content_type="evergreen",
        difficulty="balanced",
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

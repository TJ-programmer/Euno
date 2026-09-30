from dataclasses import dataclass

from app.models import (
    ContentPlan,
    CanonicalContent,
    HomePresentation,
    FlowPresentation,
)
from app.planners.content_planner import ContentPlanner
from app.generators.canonical import CanonicalGenerator
from app.generators.home import HomePresentationGenerator
from app.generators.flow import FlowPresentationGenerator


@dataclass
class SupplyResult:
    planned: int
    generated: int
    persisted: int
    failed: int


class ContentSupplyRunner:
    def __init__(
        self,
        planner: ContentPlanner | None = None,
        generator: CanonicalGenerator | None = None,
        home_generator: HomePresentationGenerator | None = None,
        flow_generator: FlowPresentationGenerator | None = None,
    ):
        self.planner = planner or ContentPlanner()

        self.generator = (
            generator
            or CanonicalGenerator()
        )

        self.home_generator = (
            home_generator
            or HomePresentationGenerator()
        )

        self.flow_generator = (
            flow_generator
            or FlowPresentationGenerator()
        )

    # ------------------------------------------------------------------
    # RUN SUPPLY
    # ------------------------------------------------------------------

    async def run(
        self,
        *,
        topics: list[str],
        count: int = 5,
        difficulty: str = "balanced",
    ) -> SupplyResult:

        if not topics:
            raise ValueError(
                "Content supply requires at least one topic."
            )

        if count < 1:
            raise ValueError(
                "Content supply count must be at least 1."
            )

        print("=" * 70)
        print("EUNO CONTENT SUPPLY")
        print("=" * 70)

        # --------------------------------------------------------------
        # PLAN
        # --------------------------------------------------------------

        print()
        print(
            f"Planning {count} content items..."
        )

        plans = await self.planner.generate(
            topics=topics,
            count=count,
            difficulty=difficulty,
        )

        print(
            f"Planner returned {len(plans)} plans."
        )

        generated = 0
        persisted = 0
        failed = 0

        # --------------------------------------------------------------
        # PROCESS EACH PLAN
        # --------------------------------------------------------------

        for index, plan in enumerate(
            plans,
            start=1,
        ):
            print()
            print("-" * 70)
            print(
                f"[{index}/{len(plans)}] "
                f"{plan.direction}"
            )
            print("-" * 70)

            try:
                # ------------------------------------------------------
                # CANONICAL
                # ------------------------------------------------------

                print()
                print("CANONICAL")
                print("---------")

                content = await self._generate_content(
                    plan,
                    allowed_topics=topics,
                )

                generated += 1

                print(
                    "STATUS: GENERATED"
                )

                # ------------------------------------------------------
                # PERSIST CANONICAL
                # ------------------------------------------------------

                content_id = (
                    self.generator.repository.save(
                        content
                    )
                )

                print(
                    "STATUS: CANONICAL PERSISTED"
                )

                print(
                    f"Content ID: {content_id}"
                )

                # ------------------------------------------------------
                # HOME PRESENTATION
                # ------------------------------------------------------

                print()
                print("HOME PRESENTATION")
                print("-----------------")

                home = await self._generate_home(
                    content
                )

                home_id = (
                    self.generator.repository
                    .save_home_presentation(
                        content=content,
                        presentation=home,
                    )
                )

                print(
                    "STATUS: HOME PERSISTED"
                )

                print(
                    f"Home Presentation ID: {home_id}"
                )

                # ------------------------------------------------------
                # FLOW PRESENTATION
                # ------------------------------------------------------

                print()
                print("FLOW PRESENTATION")
                print("-----------------")

                flow = await self._generate_flow(
                    content
                )

                flow_id = (
                    self.generator.repository
                    .save_flow_presentation(
                        content=content,
                        presentation=flow,
                    )
                )

                print(
                    "STATUS: FLOW PERSISTED"
                )

                print(
                    f"Flow Presentation ID: {flow_id}"
                )

                # ------------------------------------------------------
                # COMPLETE
                # ------------------------------------------------------

                persisted += 1

                print()
                print(
                    "STATUS: SUPPLY COMPLETE"
                )

            except Exception as exc:
                failed += 1

                print()
                print(
                    "STATUS: FAILED"
                )

                print(
                    f"Error: {exc}"
                )

                # One bad item should not kill
                # the entire supply batch.
                continue

        # --------------------------------------------------------------
        # SUMMARY
        # --------------------------------------------------------------

        print()
        print("=" * 70)
        print("SUPPLY COMPLETE")
        print("=" * 70)

        print(
            f"Planned:    {len(plans)}"
        )

        print(
            f"Generated:  {generated}"
        )

        print(
            f"Persisted:  {persisted}"
        )

        print(
            f"Failed:     {failed}"
        )

        print("=" * 70)

        return SupplyResult(
            planned=len(plans),
            generated=generated,
            persisted=persisted,
            failed=failed,
        )

    # ------------------------------------------------------------------
    # CANONICAL GENERATION
    # ------------------------------------------------------------------

    async def _generate_content(
        self,
        plan: ContentPlan,
        *,
        allowed_topics: list[str],
    ) -> CanonicalContent:

        return await self.generator.generate_knowledge(
            topic=plan.topic,
            direction=plan.direction,
            content_type=plan.content_type,
            difficulty=plan.difficulty,
            allowed_topics=allowed_topics,
        )

    # ------------------------------------------------------------------
    # HOME PRESENTATION
    # ------------------------------------------------------------------

    async def _generate_home(
        self,
        content: CanonicalContent,
    ) -> HomePresentation:

        return await self.home_generator.generate(
            content=content,
        )

    # ------------------------------------------------------------------
    # FLOW PRESENTATION
    # ------------------------------------------------------------------

    async def _generate_flow(
        self,
        content: CanonicalContent,
    ) -> FlowPresentation:

        return await self.flow_generator.generate(
            content=content,
        )

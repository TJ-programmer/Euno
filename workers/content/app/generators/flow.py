from app.llm.orchestrator import LLMOrchestrator
from app.models import (
    CanonicalContent,
    FlowGroundingRepair,
    FlowPresentation,
    SourceInput,
)
from app.prompts.flow import FLOW_PRESENTATION_SYSTEM_PROMPT
from app.topics import build_topic_prompt_block, validate_topic_label
from app.validation.flow import validate_flow_presentation
from app.validation.laya_flow_grounding import (
    LayaFlowGroundingJudge,
)


GENERATOR_VERSION = "flow-v1"
MAX_GENERATION_ATTEMPTS = 2


class FlowPresentationGenerator:
    def __init__(
        self,
        llm: LLMOrchestrator | None = None,
        grounding_judge: LayaFlowGroundingJudge | None = None,
    ):
        self.llm = llm or LLMOrchestrator()
        self.grounding_judge = (
            grounding_judge
            or LayaFlowGroundingJudge()
        )

    # ------------------------------------------------------------------
    # SOURCE CONTEXT
    # ------------------------------------------------------------------

    @staticmethod
    def _build_source_context(
        sources: list[SourceInput],
    ) -> str:

        return "\n\n".join(
            f"""
SOURCE ID: {source.id}
TITLE: {source.title or "Unknown"}
NAME: {source.name}
URL: {source.url}
TYPE: {source.source_type}

CONTENT:
{source.content}
"""
            for source in sources
        )

    # ------------------------------------------------------------------
    # GENERATION PROMPT
    #
    # All rules live in FLOW_PRESENTATION_SYSTEM_PROMPT. This prompt
    # only carries the dynamic parts, so nothing is stated twice.
    # ------------------------------------------------------------------

    @staticmethod
    def _build_prompt(
        content: CanonicalContent,
    ) -> str:

        # No indent: pretty-printing wastes whitespace tokens.
        # If CanonicalContent has fields Flow does not need, exclude
        # them here, e.g. model_dump_json(exclude={"..."}).
        canonical = content.model_dump_json()

        return f"""
{FLOW_PRESENTATION_SYSTEM_PROMPT}

CANONICAL CONTENT
{canonical}

TASK
Produce the eight-section Euno Flow (hook, tension, reveal, why,
surprise, connection, takeaway, next_curiosity). No extra sections.
`content_id` MUST exactly equal: {content.id}

{build_topic_prompt_block()}

Every section needs source_claim_ids using only IDs that exist in the
canonical content. Follow all voice, grounding, qualifier and
no-synthesis rules above.

Return ONLY the structured FlowPresentation object.
"""

    # ------------------------------------------------------------------
    # REPAIR PROMPT
    #
    # Runs without the system prompt, so it carries its own compact
    # rule set.
    # ------------------------------------------------------------------

    def _build_repair_prompt(
        self,
        *,
        grounding,
        content: CanonicalContent,
    ) -> str:

        rejected = [
            result
            for result in grounding.results
            if result.decision == "reject"
        ]

        rejected_sections = "\n\n".join(
            f"""FIELD: {result.field}
ASSERTION: {result.claim}
CLAIM IDS: {result.claim_id}
GROUNDING SCORE: {result.noul:.4f}"""
            for result in rejected
        )

        canonical = content.model_dump_json()

        return f"""
Repair ONLY the rejected sections of an Euno Flow. Do not regenerate
the whole Flow.

CANONICAL CONTENT
{canonical}

REJECTED SECTIONS
{rejected_sections}

RULES
- Use only the canonical content. No outside knowledge, new facts,
  evidence, mechanisms, causal links, comparisons, trade-offs, offsets,
  rankings, or broader conclusions. Never strengthen claims; preserve
  qualifiers (may, can, often, some, associated with, does not
  necessarily).
- Keep the warm, vivid, conversational voice with concrete words and
  varied rhythm. Remove the unsupported assertion, not the personality:
  rebuild the section from supported facts and make THOSE interesting.
- Every repaired section needs source_claim_ids with real IDs that
  directly support it. If the original assertion cannot be supported,
  simplify; do not keep it because it sounds good.
- hook: curiosity, no new facts. tension: no unsupported contradiction.
  reveal: only the canonical central answer. why: only what claims
  support. surprise: only directly supported implications. connection:
  no outside analogy. takeaway: summarize the canonical idea.
  next_curiosity: a question, no unsupported answer.

Return ONLY the FlowGroundingRepair object. Return null for sections
that were not rejected.
"""

    # ------------------------------------------------------------------
    # REPAIR
    # ------------------------------------------------------------------

    async def _repair_grounding(
        self,
        *,
        grounding,
        content: CanonicalContent,
    ) -> FlowGroundingRepair:

        if not grounding.has_rejections:
            raise ValueError(
                "Flow grounding repair requested but there are "
                "no rejected sections."
            )

        prompt = self._build_repair_prompt(
            grounding=grounding,
            content=content,
        )

        return await self.llm.generate(
            prompt=prompt,
            response_model=FlowGroundingRepair,
        )

    # ------------------------------------------------------------------
    # APPLY REPAIR
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_grounding_repair(
        *,
        presentation: FlowPresentation,
        grounding,
        repair: FlowGroundingRepair,
    ) -> FlowPresentation:

        rejected_fields = {
            result.field
            for result in grounding.results
            if result.decision == "reject"
        }

        updates = {}

        for field in rejected_fields:

            repaired_section = getattr(
                repair,
                field,
                None,
            )

            if repaired_section is None:
                raise ValueError(
                    f"Flow grounding repair returned null for "
                    f"required rejected field '{field}'."
                )

            updates[field] = repaired_section

        return presentation.model_copy(
            update=updates
        )

    # ------------------------------------------------------------------
    # GROUNDING REPORT
    # ------------------------------------------------------------------

    @staticmethod
    def _print_grounding_report(
        grounding,
        *,
        attempt: int,
    ) -> None:

        print("\n")
        print("=" * 70)
        print(f"LAYA FLOW GROUNDING — ATTEMPT {attempt}")
        print("=" * 70)

        for result in grounding.results:
            print(
                f"{result.field}: "
                f"{result.claim_id}: "
                f"noul={result.noul:.4f} "
                f"decision={result.decision}"
            )

        print("-" * 70)
        print(
            f"All accepted:   "
            f"{grounding.all_accepted}"
        )
        print(
            f"Needs review:   "
            f"{grounding.needs_review}"
        )
        print(
            f"Has rejections: "
            f"{grounding.has_rejections}"
        )
        print("=" * 70)

    # ------------------------------------------------------------------
    # GENERATE
    # ------------------------------------------------------------------

    async def generate(
        self,
        *,
        content: CanonicalContent,
        sources: list[SourceInput] | None = None,
    ) -> FlowPresentation:

        # --------------------------------------------------------------
        # SOURCES ARE OPTIONAL
        #
        # - Knowledge-mode canonical content has no external sources.
        #   Flow is generated from the canonical claims only, and
        #   Laya source grounding is skipped (there is nothing to
        #   ground against).
        #
        # - Grounded canonical content has external sources. The
        #   original SourceInput objects (with bodies) must be
        #   supplied so Laya can verify the Flow sections.
        # --------------------------------------------------------------

        sources = sources or []

        grounded = bool(content.sources) or bool(sources)

        if grounded:
            if not sources:
                raise ValueError(
                    "This canonical content references external "
                    "sources. Pass the original SourceInput "
                    "objects to FlowPresentationGenerator."
                    "generate() so Flow can be source-grounded."
                )

            if any(
                not source.content.strip()
                for source in sources
            ):
                raise ValueError(
                    "Flow grounding requires source content. "
                    "Pass the original SourceInput objects with "
                    "non-empty content."
                )

        # --------------------------------------------------------------
        # GENERATION
        # --------------------------------------------------------------

        prompt = self._build_prompt(content)

        presentation = await self.llm.generate(
            prompt=prompt,
            response_model=FlowPresentation,
        )

        # --------------------------------------------------------------
        # DETERMINISTIC VALIDATION
        # --------------------------------------------------------------

        validate_flow_presentation(
            presentation=presentation,
            content=content,
        )

        # The label is never touched by grounding repair (repair only
        # replaces rejected sections), so validating it once is enough.
        validate_topic_label(presentation.label)

        # --------------------------------------------------------------
        # KNOWLEDGE MODE — NO SOURCE GROUNDING
        # --------------------------------------------------------------

        if not grounded:
            print("\n")
            print("=" * 70)
            print(
                "FLOW: knowledge mode — no sources, "
                "skipping Laya grounding"
            )
            print("=" * 70)

            return presentation

        # --------------------------------------------------------------
        # LAYA GROUNDING — ATTEMPT 1
        # --------------------------------------------------------------

        grounding = self.grounding_judge.judge_flow(
            presentation=presentation,
            content=content,
            sources=sources,
        )

        self._print_grounding_report(
            grounding,
            attempt=1,
        )

        # --------------------------------------------------------------
        # SUCCESS
        # --------------------------------------------------------------

        if not grounding.has_rejections:
            return presentation

        # --------------------------------------------------------------
        # REPAIR
        # --------------------------------------------------------------

        print("\n")
        print("=" * 70)
        print("FLOW GROUNDING REPAIR")
        print("=" * 70)

        repair = await self._repair_grounding(
            grounding=grounding,
            content=content,
        )

        # --------------------------------------------------------------
        # APPLY REPAIR
        # --------------------------------------------------------------

        repaired_presentation = (
            self._apply_grounding_repair(
                presentation=presentation,
                grounding=grounding,
                repair=repair,
            )
        )

        # --------------------------------------------------------------
        # DETERMINISTIC VALIDATION AFTER REPAIR
        # --------------------------------------------------------------

        validate_flow_presentation(
            presentation=repaired_presentation,
            content=content,
        )

        # --------------------------------------------------------------
        # LAYA GROUNDING — ATTEMPT 2
        # --------------------------------------------------------------

        repaired_grounding = (
            self.grounding_judge.judge_flow(
                presentation=repaired_presentation,
                content=content,
                sources=sources,
            )
        )

        self._print_grounding_report(
            repaired_grounding,
            attempt=2,
        )

        # --------------------------------------------------------------
        # SUCCESS AFTER REPAIR
        # --------------------------------------------------------------

        if not repaired_grounding.has_rejections:
            return repaired_presentation

        # --------------------------------------------------------------
        # FAILURE
        # --------------------------------------------------------------

        rejected = [
            result
            for result in repaired_grounding.results
            if result.decision == "reject"
        ]

        rejection_summary = "\n".join(
            f"- {result.field} / {result.claim_id}: "
            f"noul={result.noul:.4f} — {result.claim}"
            for result in rejected
        )

        raise RuntimeError(
            "Flow presentation failed Laya grounding "
            f"after {MAX_GENERATION_ATTEMPTS} attempts.\n\n"
            f"{rejection_summary}"
        )

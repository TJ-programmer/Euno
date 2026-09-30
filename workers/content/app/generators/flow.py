from app.llm.orchestrator import LLMOrchestrator
from app.models import (
    CanonicalContent,
    FlowGroundingRepair,
    FlowPresentation,
    SourceInput,
)
from app.prompts.flow import FLOW_PRESENTATION_SYSTEM_PROMPT
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
    # ------------------------------------------------------------------

    @staticmethod
    def _build_prompt(
        content: CanonicalContent,
    ) -> str:

        canonical = content.model_dump_json(
            indent=2
        )

        return f"""
{FLOW_PRESENTATION_SYSTEM_PROMPT}

CANONICAL CONTENT
-----------------

{canonical}

TASK
----

Transform this canonical content into the Euno Flow sequence.

The Flow sequence MUST contain exactly these eight sections:

1. hook
2. tension
3. reveal
4. why
5. surprise
6. connection
7. takeaway
8. next_curiosity

Do not add sections.

The `content_id` MUST exactly match:

{content.id}

GROUNDING REQUIREMENTS
----------------------

The canonical content is the ONLY knowledge source.

Do not introduce facts from general knowledge.

Every factual assertion in every Flow section must be
supported by one or more canonical claims.

Every section MUST include the IDs of the canonical claims
that support its body.

Use only claim IDs that actually exist in the canonical
content.

Do not use a claim ID merely because it is thematically
related.

The referenced claim must actually support the substantive
content of the section.

Do not strengthen the canonical claims.

Preserve qualifiers such as:

- may
- can
- often
- some
- associated with
- does not necessarily

Do not turn them into stronger statements such as:

- will
- always
- all
- causes
- does not

MULTI-CLAIM SECTIONS
--------------------

When a section depends on multiple claims, reference all
relevant claim IDs.

However, referencing multiple claims does NOT authorize
creating a new causal relationship between them.

Do not combine independently stated claims into a new:

- mechanism
- causal explanation
- comparison
- trade-off
- offset
- ranking
- net effect
- broader conclusion

unless the canonical content explicitly supports that
relationship.

SECTION RULES
-------------

HOOK
----

Create the initial curiosity.

Do not reveal the complete answer immediately.

The hook may use a canonical fact, but must remain faithful
to the canonical content.

TENSION
-------

Create the central intellectual tension.

The tension must arise from the canonical content.

Do not invent a contradiction that does not exist.

REVEAL
------

Reveal the central answer supported by the canonical content.

WHY
---

Explain why the reveal is true using only canonical claims.

Do not invent mechanisms.

SURPRISE
--------

Provide a genuinely supported unexpected implication,
contrast, or realization.

Do not manufacture a surprise merely for engagement.

CONNECTION
----------

Connect the idea to another concept only when that connection
is explicitly supported by the canonical content.

Do not introduce outside examples or general knowledge.

If no meaningful supported connection exists, keep the
connection section simple and grounded in the canonical idea.

TAKEAWAY
--------

Compress the central understanding.

Do not introduce advice or a new claim.

NEXT CURIOSITY
--------------

Create the natural next question that follows from the
canonical content.

The question must remain within the knowledge boundary of
the canonical content.

Do not imply an answer that is not supported.

SOURCE CLAIM IDS
----------------

Each section MUST contain source_claim_ids.

source_claim_ids must contain only canonical claim IDs.

Return ONLY the structured FlowPresentation object.
"""

    # ------------------------------------------------------------------
    # REPAIR PROMPT
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
            f"""
FIELD:
{result.field}

ASSERTION:
{result.claim}

CLAIM IDS:
{result.claim_id}

GROUNDING SCORE:
{result.noul:.4f}

REPAIR REQUIREMENT:
Rewrite this Flow section so that every substantive
assertion is directly supported by the canonical content.
"""
            for result in rejected
        )

        canonical = content.model_dump_json(
            indent=2
        )

        return f"""
You are repairing rejected sections of an Euno Flow
presentation.

The Flow presentation has already been generated.

DO NOT regenerate the entire Flow.

Repair ONLY the rejected sections listed below.

CANONICAL CONTENT
-----------------

{canonical}

REJECTED SECTIONS
-----------------

{rejected_sections}

REPAIR RULES
------------

- Use only the supplied canonical content.
- Do not use outside knowledge.
- Do not introduce new facts.
- Do not introduce new evidence.
- Do not invent mechanisms.
- Do not invent causal relationships.
- Do not invent comparisons.
- Do not invent trade-offs.
- Do not invent offsets.
- Do not invent rankings.
- Do not invent broader conclusions.
- Do not strengthen canonical claims.

Preserve qualifiers such as:

- may
- can
- often
- some
- associated with
- does not necessarily

Never strengthen them.

SOURCE CLAIM IDS
----------------

Every repaired section MUST contain source_claim_ids.

Every source_claim_id must correspond to an actual claim
in the canonical content.

Only reference claims that directly support the repaired
section.

If a section cannot safely make its original assertion,
simplify it.

Do not preserve a rejected assertion merely because it
sounds interesting.

SECTION-SPECIFIC RULES
----------------------

HOOK
----

Preserve curiosity without adding unsupported facts.

TENSION
-------

Do not create a contradiction that is not supported.

REVEAL
------

State only the canonical central answer.

WHY
---

Explain only what the canonical claims support.

SURPRISE
--------

Only include an additional implication if it is directly
supported.

CONNECTION
----------

Do not introduce an outside analogy or factual comparison.

TAKEAWAY
--------

Summarize the canonical understanding.

NEXT CURIOSITY
--------------

Ask a natural next question without asserting an unsupported
answer.

Return ONLY the structured FlowGroundingRepair object.

For sections that were not rejected, return null.
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

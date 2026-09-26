from datetime import datetime, timezone

from app.llm.orchestrator import LLMOrchestrator
from app.models import (
    CanonicalContent,
    GroundingRepair,
    SourceInput,
)
from app.prompts.canonical import CANONICAL_SYSTEM_PROMPT
from app.repositories.content import ContentRepository
from app.validation.content import validate_source_traceability
from app.validation.laya_grounding import LayaGroundingJudge


GENERATOR_VERSION = "canonical-v1"
MAX_GENERATION_ATTEMPTS = 2


class CanonicalGenerator:
    def __init__(
        self,
        llm: LLMOrchestrator | None = None,
        grounding_judge: LayaGroundingJudge | None = None,
        repository: ContentRepository | None = None,
    ):
        self.llm = llm or LLMOrchestrator()
        self.grounding_judge = (
            grounding_judge or LayaGroundingJudge()
        )
        self.repository = repository or ContentRepository()

    # ------------------------------------------------------------------
    # SOURCE CONTEXT
    # ------------------------------------------------------------------

    def _build_source_context(
        self,
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
    # TOPIC VALIDATION
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_topics(
        content: CanonicalContent,
        allowed_topics: list[str],
    ) -> None:
        allowed_topic_set = set(allowed_topics)

        unknown_topics = (
            set(content.topics) - allowed_topic_set
        )

        if unknown_topics:
            raise ValueError(
                "Canonical content contains unknown topic IDs: "
                f"{sorted(unknown_topics)}. "
                f"Allowed topic IDs: {sorted(allowed_topic_set)}"
            )

    # ------------------------------------------------------------------
    # INITIAL GENERATION PROMPT
    # ------------------------------------------------------------------

    def _build_generation_prompt(
        self,
        *,
        topic: str,
        content_type: str,
        difficulty: str,
        source_context: str,
        allowed_topics: list[str],
    ) -> str:

        topic_list = "\n".join(
            f"- {topic_id}"
            for topic_id in allowed_topics
        )

        return f"""
{CANONICAL_SYSTEM_PROMPT}

Generate one canonical Euno knowledge object.

TOPIC:
{topic}

CONTENT TYPE:
{content_type}

DIFFICULTY:
{difficulty}

VALID EUNO TOPIC IDS
--------------------

The `topics` field must contain ONLY topic IDs from this list:

{topic_list}

STRICT TOPIC RULES
------------------

- `topics` must contain only IDs from the VALID EUNO TOPIC IDS list.
- Do not invent new topic IDs.
- Do not create a topic from the user's natural-language topic.
- Do not use arbitrary concepts as topic IDs.
- Do not use source names as topic IDs.
- Do not use article categories as topic IDs.
- If multiple topic IDs are relevant, select only the relevant IDs
  from the provided list.
- Never output a topic ID that is not in the provided list.

SOURCE MATERIAL
---------------

{source_context}

ADDITIONAL REQUIREMENTS
-----------------------

- Focus tightly on the supplied topic.
- Choose one central idea.
- Do not turn this into a list of unrelated facts.
- The title should describe the actual subject.
- The core question should create curiosity without revealing
  the entire answer.
- The core idea should express the central understanding.
- Keep claims concise and traceable.
- Connections should be genuinely useful.
- The final takeaway should express the idea worth remembering.

SOURCE GROUNDING
----------------

- Only use information supported by the supplied sources.
- Only reference source IDs that appear in the SOURCE MATERIAL.
- Every claim must include a verbatim source_quote copied from
  the supplied source material.
- source_quote must contain the exact wording from the source,
  allowing only whitespace differences.
- Do not paraphrase source_quote.
- Do not invent evidence.
- Do not introduce scientific mechanisms, causal explanation,
  statistics, or conclusions that are not supported by the
  supplied sources.
- Every factual assertion in the canonical object must be
  supportable by the supplied source material.

MULTI-SOURCE SYNTHESIS
----------------------

When multiple sources are supplied, do not combine facts from
different sources to create a new causal relationship,
explanation, comparison, trade-off, offset, mechanism, ranking,
net effect, or conclusion unless that relationship is explicitly
supported by the supplied sources.

A statement can be individually compatible with multiple sources
while still being unsupported as a combined claim.

If a conclusion is explicitly stated by one source, you may use
that conclusion.

However, do not construct a new causal explanation connecting
independently sourced facts.

Example:

Source A:
"Caffeine has a mild diuretic effect."

Source B:
"Coffee contributes to overall fluid intake."

If Source B explicitly states:
"Moderate coffee consumption does not necessarily cause dehydration."

you may use that conclusion.

But do NOT rewrite the evidence as:

"Caffeine increases urine output, while the water in coffee offsets
that effect, therefore coffee does not cause dehydration."

unless a supplied source explicitly establishes that mechanism.

Do not infer:
- causality
- trade-offs
- offsets
- mechanisms
- rankings
- comparisons
- net effects
- broader conclusions

from independently sourced facts.

STRENGTH OF LANGUAGE
--------------------

Do not strengthen the certainty, scope, or meaning of source
statements.

Preserve meaningful qualifiers from the source.

Examples:

- "can" must not become "will"
- "may" must not become "does"
- "can contribute" must not become "counts"
- "associated with" must not become "causes"
- "does not necessarily" must not become "does not"
- "often" must not become "always"
- "some" must not become "all"

Do not remove meaningful uncertainty from the source.

If the source says something is possible, do not present it as
certain.

If the source says something is associated with something else,
do not present the relationship as causal.

EXPLANATION
-----------

Every factual assertion in core_idea, explanation.what,
explanation.why, and explanation.how must be directly supported
by the supplied source material.

If the supplied sources do not explain WHY something happens,
do not invent a reason.

If the supplied sources do not explain HOW something happens,
return null for explanation.how.

Do not introduce a scientific mechanism merely because it is
generally known or plausible.

DEEPER INSIGHT
--------------

- deeper_insight is optional.
- Only provide it when the supplied sources explicitly present
  a distinct additional insight or implication.
- Do not create deeper_insight merely by paraphrasing a supporting
  claim.
- Do not infer effects on attention, behavior, emotions,
  motivation, productivity, cognition, memory, or
  decision-making unless explicitly supported.
- Do not turn a plausible interpretation into a factual statement.
- Do not derive a practical application from the source unless
  the source explicitly supports it.
- Do not strengthen source language.

Do not upgrade:

- "can contribute" -> "counts"
- "may" -> "does"
- "associated with" -> "causes"
- "does not necessarily" -> "does not"
- "can" -> "will"

If the source does not contain a clearly distinct deeper insight,
return null.

CONNECTIONS
-----------

Connections are optional.

Only include a connection when both the concept and its explanation
are directly supported by the supplied sources.

Do not create connections from general knowledge.

Do not use a connection to introduce:
- a new mechanism
- a new causal relationship
- an unsupported comparison
- an analogy presented as fact
- a broader conclusion

If a connection is not clearly supported, omit it.

TAKEAWAY
--------

- The takeaway must summarize the source-supported central idea.
- Preserve the strength and uncertainty of the source.
- Do not turn the takeaway into advice unless the source
  explicitly supports that advice.
- Do not introduce a new claim.
- Do not strengthen the source's wording.

Return ONLY the requested structured object.
"""

    # ------------------------------------------------------------------
    # GROUNDING REPAIR PROMPT
    # ------------------------------------------------------------------

    def _build_repair_prompt(
        self,
        *,
        grounding,
        source_context: str,
    ) -> str:

        rejected = [
            result
            for result in grounding.results
            if result.decision == "reject"
        ]

        rejected_assertions = "\n\n".join(
            f"""
FIELD:
{result.field}

ASSERTION ID:
{result.claim_id}

CURRENT ASSERTION:
{result.claim}

GROUNDING SCORE:
{result.noul:.4f}

REPAIR REQUIREMENT:
Rewrite this assertion so that every substantive part is
directly supported by the supplied source material.
"""
            for result in rejected
        )

        return f"""
You are repairing rejected factual assertions in an Euno
knowledge object.

The original canonical object has already been generated.

DO NOT REGENERATE THE CANONICAL OBJECT.

Repair ONLY the rejected fields listed below.

REJECTED ASSERTIONS
-------------------

{rejected_assertions}

SOURCE MATERIAL
---------------

{source_context}

GENERAL REPAIR RULES
--------------------

- Use only the supplied source material.
- Do not introduce outside knowledge.
- Do not introduce new evidence.
- Do not introduce unsupported causal explanations.
- Do not introduce unsupported mechanisms.
- Do not introduce unsupported statistics.
- Do not introduce unsupported generalizations.
- Do not make a claim stronger than the source supports.
- Do not preserve an assertion merely because it sounds plausible.
- Prefer a simpler statement when the stronger statement is
  not supported.

MULTI-SOURCE SYNTHESIS
----------------------

A conclusion explicitly stated by a source may be retained.

Do not create a new causal relationship by combining facts from
different sources.

Do not use one source as an unstated bridge between facts from
another source.

Do not infer:
- causality
- trade-offs
- offsets
- mechanisms
- rankings
- comparisons
- net effects
- broader conclusions

unless explicitly supported by the supplied sources.

STRENGTH OF LANGUAGE
--------------------

Preserve the exact strength and uncertainty of the source.

Never strengthen:

- "can" -> "will"
- "may" -> "does"
- "can contribute" -> "counts"
- "associated with" -> "causes"
- "does not necessarily" -> "does not"
- "often" -> "always"
- "some" -> "all"

Do not remove meaningful uncertainty.

FIELD-SPECIFIC RULES
--------------------

CORE_IDEA
---------

Rewrite only what is necessary to make the core idea directly
supported by the sources.

Do not construct a new causal explanation from independently
sourced facts.

If a conclusion is explicitly stated by a source, that conclusion
may be retained.

EXPLANATION.WHAT
----------------

Describe only what the sources directly establish.

EXPLANATION.WHY
---------------

Explain only what the source supports.

Do not invent a mechanism to explain why something happens.

If the source only establishes an association or observation,
do not turn it into a causal explanation.

EXPLANATION.HOW
---------------

Only provide a how explanation if the source explicitly supports
the mechanism or process.

Otherwise return null.

DEEPER_INSIGHT
--------------

- This field is optional.
- Only retain or repair it when the source explicitly supports
  a distinct additional insight.
- Do not create it by paraphrasing a supporting claim.
- Do not infer behavioral, motivational, attentional,
  emotional, or cognitive effects.
- Do not derive practical applications.
- Do not introduce mechanisms that are not explicitly supported.
- Do not strengthen source language.

If there is no genuinely supported additional insight,
return null.

CONNECTIONS
-----------

Connections are optional.

Only retain connections that are directly supported by the
supplied source material.

If a connection is unsupported, remove it rather than attempting
to make it sound plausible.

Use remove_connection_indexes to identify unsupported connection
indexes.

Do not create replacement connections unless they are directly
supported by the sources.

TAKEAWAY
--------

- Summarize the source-supported central idea.
- Preserve the source's certainty and qualifiers.
- Do not turn it into advice.
- Do not introduce practical applications.
- Do not introduce a new claim.
- Do not strengthen the source.

CLAIMS
------

If a claim is rejected, rewrite only the rejected claim.

Preserve its identity when possible.

Every repaired claim must still contain:

- its claim ID
- source IDs
- a verbatim source_quote
- a statement directly supported by that quote

SOURCE EVIDENCE
---------------

Every claim source_quote must be copied verbatim from the
supplied source material, allowing only whitespace differences.

Do not invent, paraphrase, shorten, or combine quotations.

FIELDS NOT REJECTED
-------------------

Return null for fields that were not rejected.

Return ONLY the structured repair object.
"""

    # ------------------------------------------------------------------
    # GROUNDING REPORT
    # ------------------------------------------------------------------

    def _print_grounding_report(
        self,
        grounding,
        *,
        attempt: int,
    ) -> None:

        print("\n")
        print("=" * 70)
        print(f"LAYA GROUNDING — ATTEMPT {attempt}")
        print("=" * 70)

        for grounding_result in grounding.results:
            print(
                f"{grounding_result.field}: "
                f"{grounding_result.claim_id}: "
                f"noul={grounding_result.noul:.4f} "
                f"decision={grounding_result.decision}"
            )

        print("-" * 70)
        print(f"All accepted:   {grounding.all_accepted}")
        print(f"Needs review:   {grounding.needs_review}")
        print(f"Has rejections: {grounding.has_rejections}")
        print("=" * 70)

    # ------------------------------------------------------------------
    # REPAIR GENERATION
    # ------------------------------------------------------------------

    async def _repair_grounding(
        self,
        *,
        grounding,
        sources: list[SourceInput],
    ) -> GroundingRepair:

        if not grounding.has_rejections:
            raise ValueError(
                "Grounding repair requested but there are no "
                "rejected assertions."
            )

        source_context = self._build_source_context(sources)

        prompt = self._build_repair_prompt(
            grounding=grounding,
            source_context=source_context,
        )

        return await self.llm.generate(
            prompt=prompt,
            response_model=GroundingRepair,
        )

    # ------------------------------------------------------------------
    # APPLY REPAIRS
    # ------------------------------------------------------------------

    def _apply_grounding_repair(
        self,
        *,
        content: CanonicalContent,
        grounding,
        repair: GroundingRepair,
    ) -> CanonicalContent:

        rejected_fields = {
            result.field
            for result in grounding.results
            if result.decision == "reject"
        }

        updates: dict = {}

        # --------------------------------------------------------------
        # CLAIMS
        # --------------------------------------------------------------

        rejected_claim_ids = {
            result.claim_id
            for result in grounding.results
            if result.field == "claims"
            and result.decision == "reject"
        }

        if rejected_claim_ids and repair.claims is not None:
            repaired_claims_by_id = {
                claim.id: claim
                for claim in repair.claims
            }

            updated_claims = []

            for claim in content.claims:
                if (
                    claim.id in rejected_claim_ids
                    and claim.id in repaired_claims_by_id
                ):
                    updated_claims.append(
                        repaired_claims_by_id[claim.id]
                    )
                else:
                    updated_claims.append(claim)

            updates["claims"] = updated_claims

        # --------------------------------------------------------------
        # TITLE
        # --------------------------------------------------------------

        if "title" in rejected_fields:
            if repair.title is None:
                raise ValueError(
                    "Grounding repair returned null for required "
                    "field 'title'."
                )

            updates["title"] = repair.title

        # --------------------------------------------------------------
        # CORE QUESTION
        # --------------------------------------------------------------

        if "core_question" in rejected_fields:
            if repair.core_question is None:
                raise ValueError(
                    "Grounding repair returned null for required "
                    "field 'core_question'."
                )

            updates["core_question"] = repair.core_question

        # --------------------------------------------------------------
        # CORE IDEA
        # --------------------------------------------------------------

        if "core_idea" in rejected_fields:
            if repair.core_idea is None:
                raise ValueError(
                    "Grounding repair returned null for required "
                    "field 'core_idea'."
                )

            updates["core_idea"] = repair.core_idea

        # --------------------------------------------------------------
        # CONTEXT
        # --------------------------------------------------------------

        if "context" in rejected_fields:
            updates["context"] = repair.context

        # --------------------------------------------------------------
        # EXPLANATION
        # --------------------------------------------------------------

        explanation = content.explanation.model_copy()

        explanation_changed = False

        if "explanation.what" in rejected_fields:
            explanation.what = repair.explanation_what
            explanation_changed = True

        if "explanation.why" in rejected_fields:
            explanation.why = repair.explanation_why
            explanation_changed = True

        if "explanation.how" in rejected_fields:
            explanation.how = repair.explanation_how
            explanation_changed = True

        if explanation_changed:
            updates["explanation"] = explanation

        # --------------------------------------------------------------
        # DEEPER INSIGHT
        # --------------------------------------------------------------

        if "deeper_insight" in rejected_fields:
            updates["deeper_insight"] = repair.deeper_insight

        # --------------------------------------------------------------
        # CONNECTIONS
        # --------------------------------------------------------------

        connection_rejected = any(
            result.field.startswith("connections[")
            and result.decision == "reject"
            for result in grounding.results
        )

        if connection_rejected:
            connections = list(content.connections)

            if repair.remove_connection_indexes:
                indexes_to_remove = set(
                    repair.remove_connection_indexes
                )

                connections = [
                    connection
                    for index, connection in enumerate(connections)
                    if index not in indexes_to_remove
                ]

            if repair.connections is not None:
                rejected_connection_indexes = {
                    self._extract_connection_index(
                        result.field
                    )
                    for result in grounding.results
                    if result.field.startswith("connections[")
                    and result.decision == "reject"
                }

                rejected_connection_indexes.discard(None)

                repaired_connections_by_index = {
                    index: connection
                    for index, connection in zip(
                        sorted(rejected_connection_indexes),
                        repair.connections,
                    )
                }

                original_connections = list(
                    content.connections
                )

                final_connections = []

                for index, connection in enumerate(
                    original_connections
                ):
                    if index in repaired_connections_by_index:
                        final_connections.append(
                            repaired_connections_by_index[index]
                        )
                    elif (
                        repair.remove_connection_indexes
                        and index
                        in set(
                            repair.remove_connection_indexes
                        )
                    ):
                        continue
                    else:
                        final_connections.append(connection)

                connections = final_connections

            updates["connections"] = connections

        # --------------------------------------------------------------
        # TAKEAWAY
        # --------------------------------------------------------------

        if "takeaway" in rejected_fields:
            if repair.takeaway is None:
                raise ValueError(
                    "Grounding repair returned null for required "
                    "field 'takeaway'."
                )

            updates["takeaway"] = repair.takeaway

        return content.model_copy(update=updates)

    # ------------------------------------------------------------------
    # CONNECTION INDEX HELPER
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_connection_index(
        field: str,
    ) -> int | None:

        prefix = "connections["

        if not field.startswith(prefix):
            return None

        remainder = field[len(prefix):]

        closing_bracket = remainder.find("]")

        if closing_bracket == -1:
            return None

        index_text = remainder[:closing_bracket]

        try:
            return int(index_text)
        except ValueError:
            return None

    # ------------------------------------------------------------------
    # FINALIZE
    # ------------------------------------------------------------------

    @staticmethod
    def _finalize(
        content: CanonicalContent,
    ) -> CanonicalContent:

        return content.model_copy(
            update={
                "generated_at": datetime.now(timezone.utc),
                "generator_version": GENERATOR_VERSION,
            }
        )

    # ------------------------------------------------------------------
    # GENERATE
    # ------------------------------------------------------------------

    async def generate(
        self,
        *,
        topic: str,
        content_type: str,
        difficulty: str,
        sources: list[SourceInput],
        allowed_topics: list[str],
    ) -> CanonicalContent:

        if not sources:
            raise ValueError(
                "Canonical generation requires at least one source."
            )

        if not allowed_topics:
            raise ValueError(
                "Canonical generation requires at least one "
                "allowed topic ID."
            )

        # Remove duplicates while preserving order.
        allowed_topics = list(
            dict.fromkeys(allowed_topics)
        )

        source_context = self._build_source_context(
            sources
        )

        # --------------------------------------------------------------
        # ATTEMPT 1 — GENERATION
        # --------------------------------------------------------------

        prompt = self._build_generation_prompt(
            topic=topic,
            content_type=content_type,
            difficulty=difficulty,
            source_context=source_context,
            allowed_topics=allowed_topics,
        )

        content = await self.llm.generate(
            prompt=prompt,
            response_model=CanonicalContent,
        )

        # --------------------------------------------------------------
        # DETERMINISTIC TOPIC VALIDATION
        # --------------------------------------------------------------

        self._validate_topics(
            content,
            allowed_topics,
        )

        # --------------------------------------------------------------
        # DETERMINISTIC SOURCE VALIDATION
        # --------------------------------------------------------------

        validate_source_traceability(
            content,
            sources,
        )

        # --------------------------------------------------------------
        # LAYA GROUNDING — ATTEMPT 1
        # --------------------------------------------------------------

        grounding = self.grounding_judge.judge_content(
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
            finalized_content = self._finalize(
                content,
            )

            self.repository.save(
                finalized_content,
            )

            return finalized_content

        # --------------------------------------------------------------
        # GROUNDING REPAIR
        # --------------------------------------------------------------

        print("\n")
        print("=" * 70)
        print("GROUNDING REPAIR")
        print("=" * 70)

        repair = await self._repair_grounding(
            grounding=grounding,
            sources=sources,
        )

        # --------------------------------------------------------------
        # APPLY REPAIRS
        # --------------------------------------------------------------

        repaired_content = self._apply_grounding_repair(
            content=content,
            grounding=grounding,
            repair=repair,
        )

        # --------------------------------------------------------------
        # DETERMINISTIC VALIDATION AFTER REPAIR
        # --------------------------------------------------------------

        self._validate_topics(
            repaired_content,
            allowed_topics,
        )

        validate_source_traceability(
            repaired_content,
            sources,
        )

        # --------------------------------------------------------------
        # LAYA GROUNDING — ATTEMPT 2
        # --------------------------------------------------------------

        repaired_grounding = self.grounding_judge.judge_content(
            content=repaired_content,
            sources=sources,
        )

        self._print_grounding_report(
            repaired_grounding,
            attempt=2,
        )

        # --------------------------------------------------------------
        # SUCCESS AFTER REPAIR
        # --------------------------------------------------------------

        if not repaired_grounding.has_rejections:
            finalized_content = self._finalize(
                repaired_content,
            )

            self.repository.save(
                finalized_content,
            )

            return finalized_content

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
            "Canonical content failed Laya grounding after "
            f"{MAX_GENERATION_ATTEMPTS} attempts.\n\n"
            f"{rejection_summary}"
        )

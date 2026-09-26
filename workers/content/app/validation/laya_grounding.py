from dataclasses import dataclass

from laya import Router

from app.models import CanonicalContent, SourceInput


@dataclass
class GroundingResult:
    claim_id: str
    claim: str
    noul: float
    confidence: float
    decision: str
    field: str


@dataclass
class ContentGroundingResult:
    results: list[GroundingResult]

    @property
    def all_accepted(self) -> bool:
        return all(
            result.decision == "accept"
            for result in self.results
        )

    @property
    def has_rejections(self) -> bool:
        return any(
            result.decision == "reject"
            for result in self.results
        )

    @property
    def needs_review(self) -> bool:
        return any(
            result.decision == "review"
            for result in self.results
        )


class LayaGroundingJudge:
    """
    Uses Laya to estimate whether factual assertions in
    canonical Euno content are directly supported by the
    supplied source material.

    Laya is a semantic grounding signal, not an independent
    factual authority.

    Deterministic source_quote validation should still run
    before this judge.
    """

    def __init__(
        self,
        *,
        router: Router | None = None,
        accept_threshold: float = 0.90,
        review_threshold: float = 0.50,
    ):
        self.router = router or Router(preload=True)

        self.accept_threshold = accept_threshold
        self.review_threshold = review_threshold

    def _decide(self, noul: float) -> str:
        if noul >= self.accept_threshold:
            return "accept"

        if noul >= self.review_threshold:
            return "review"

        return "reject"

    def judge_claim(
        self,
        *,
        claim_id: str,
        claim: str,
        sources: list[SourceInput],
        field: str,
    ) -> GroundingResult:

        source_text = "\n\n".join(
            f"""
SOURCE ID: {source.id}
TITLE: {source.title or "Unknown"}
SOURCE NAME: {source.name}
SOURCE TYPE: {source.source_type}

SOURCE CONTENT:
{source.content}
"""
            for source in sources
        )

        state = {
            "source": source_text,
            "claim": claim,
        }

        questions = {
            "grounding": {
                "type": "noul",
                "instructions": (
                    "Is the CLAIM fully supported by the SOURCE? "
                    "Answer true only when the SOURCE supports the "
                    "entire CLAIM without requiring additional facts, "
                    "assumptions, or outside knowledge."
                ),
                "criteria": {
                    "true": (
                        "The SOURCE directly supports the entire CLAIM. "
                        "Every substantive part of the CLAIM is supported "
                        "by information in the SOURCE."
                    ),
                    "false": (
                        "Any substantive part of the CLAIM is unsupported, "
                        "exaggerated, universalized, causally inferred, "
                        "contradicted, or requires information not present "
                        "in the SOURCE."
                    ),
                },
            }
        }

        result = self.router.predict(
            state,
            questions,
        )

        answer = result["answers"]["grounding"]

        noul = float(answer["noul"])
        confidence = float(answer["confidence"])

        return GroundingResult(
            claim_id=claim_id,
            claim=claim,
            noul=noul,
            confidence=confidence,
            decision=self._decide(noul),
            field=field,
        )

    def _build_assertions(
        self,
        content: CanonicalContent,
    ) -> list[tuple[str, str, str]]:
        """
        Returns factual assertions that should be grounded.

        Format:
            (id, field, assertion)

        The purpose of this method is to ensure that meaningful
        factual statements outside the explicit claims list are
        also checked by Laya.
        """

        assertions: list[tuple[str, str, str]] = []

        # ---------------------------------------------------------
        # Core content
        # ---------------------------------------------------------

        assertions.append(
            (
                "title",
                "title",
                content.title,
            )
        )

        assertions.append(
            (
                "core_question",
                "core_question",
                content.core_question,
            )
        )

        assertions.append(
            (
                "core_idea",
                "core_idea",
                content.core_idea,
            )
        )

        # ---------------------------------------------------------
        # Context
        # ---------------------------------------------------------

        if content.context:
            assertions.append(
                (
                    "context",
                    "context",
                    content.context,
                )
            )

        # ---------------------------------------------------------
        # Explanation
        # ---------------------------------------------------------

        assertions.append(
            (
                "explanation.what",
                "explanation.what",
                content.explanation.what,
            )
        )

        assertions.append(
            (
                "explanation.why",
                "explanation.why",
                content.explanation.why,
            )
        )

        if content.explanation.how:
            assertions.append(
                (
                    "explanation.how",
                    "explanation.how",
                    content.explanation.how,
                )
            )

        # ---------------------------------------------------------
        # Deeper insight
        # ---------------------------------------------------------

        if content.deeper_insight:
            assertions.append(
                (
                    "deeper_insight",
                    "deeper_insight",
                    content.deeper_insight,
                )
            )

        # ---------------------------------------------------------
        # Connections
        #
        # Connections can contain factual statements as well as
        # conceptual bridges. We currently ground both the concept
        # and its explanation. This prevents unsupported examples,
        # generalizations, or factual extensions from silently
        # entering the canonical object.
        # ---------------------------------------------------------

        if content.connections:
            for index, connection in enumerate(
                content.connections
            ):
                assertions.append(
                    (
                        f"connection.{index}.concept",
                        "connection.concept",
                        connection.concept,
                    )
                )

                assertions.append(
                    (
                        f"connection.{index}.explanation",
                        "connection.explanation",
                        connection.explanation,
                    )
                )

        # ---------------------------------------------------------
        # Takeaway
        # ---------------------------------------------------------

        assertions.append(
            (
                "takeaway",
                "takeaway",
                content.takeaway,
            )
        )

        return assertions

    def judge_content(
        self,
        *,
        content: CanonicalContent,
        sources: list[SourceInput],
    ) -> ContentGroundingResult:

        results: list[GroundingResult] = []

        # ---------------------------------------------------------
        # 1. Explicit claims
        # ---------------------------------------------------------

        for claim in content.claims:
            results.append(
                self.judge_claim(
                    claim_id=claim.id,
                    claim=claim.statement,
                    sources=sources,
                    field="claims",
                )
            )

        # ---------------------------------------------------------
        # 2. Other factual canonical fields
        # ---------------------------------------------------------

        for assertion_id, field, assertion in self._build_assertions(
            content
        ):
            results.append(
                self.judge_claim(
                    claim_id=assertion_id,
                    claim=assertion,
                    sources=sources,
                    field=field,
                )
            )

        return ContentGroundingResult(
            results=results,
        )

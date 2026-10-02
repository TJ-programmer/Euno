from app.models import (
    CanonicalContent,
    FlowGroundingReport,
    FlowGroundingResult,
    FlowPresentation,
    SourceInput,
)
from app.validation.laya_grounding import LayaGroundingJudge


FLOW_SECTION_NAMES = [
    "hook",
    "tension",
    "reveal",
    "why",
    "surprise",
    "connection",
    "takeaway",
    "next_curiosity",
]


class LayaFlowGroundingJudge:
    """
    Grounds Flow presentation sections against the original
    source material using the existing Laya grounding engine.

    Flow sections are presentation-layer text. They must not
    introduce factual information beyond what is supported by
    the canonical content and its supplied sources.

    Laya is used as a semantic grounding signal.

    Deterministic Flow validation must run separately before
    calling this judge.
    """

    def __init__(
        self,
        *,
        judge: LayaGroundingJudge | None = None,
    ):
        self.judge = judge or LayaGroundingJudge()

    # ------------------------------------------------------------------
    # JUDGE FLOW
    # ------------------------------------------------------------------

    def judge_flow(
        self,
        *,
        presentation: FlowPresentation,
        content: CanonicalContent,
        sources: list[SourceInput],
    ) -> FlowGroundingReport:

        results: list[FlowGroundingResult] = []

        claims_by_id = {
            claim.id: claim
            for claim in content.claims
        }

        for field in FLOW_SECTION_NAMES:
            # ----------------------------------------------------------
            # Flow sections live inside presentation.payload.
            # ----------------------------------------------------------

            section = getattr(
                presentation.payload,
                field,
            )

            # ----------------------------------------------------------
            # Every Flow section must have provenance.
            #
            # Deterministic validation normally guarantees this,
            # but grounding should remain defensive.
            # ----------------------------------------------------------

            if not section.source_claim_ids:
                results.append(
                    FlowGroundingResult(
                        field=field,
                        claim_id=f"{field}.body",
                        claim=section.body,
                        noul=0.0,
                        decision="reject",
                    )
                )

                continue

            # ----------------------------------------------------------
            # Ground the COMPLETE section body.
            #
            # We do NOT ground each source claim independently and
            # conclude that the section is valid.
            #
            # The actual generated sentence must itself be supported.
            # ----------------------------------------------------------

            referenced_claims = []

            for claim_id in section.source_claim_ids:
                claim = claims_by_id.get(claim_id)

                if claim is not None:
                    referenced_claims.append(claim)

            if not referenced_claims:
                results.append(
                    FlowGroundingResult(
                        field=field,
                        claim_id=section.source_claim_ids[0],
                        claim=section.body,
                        noul=0.0,
                        decision="reject",
                    )
                )

                continue

            # ----------------------------------------------------------
            # Build the source material available to the Laya judge.
            #
            # The original sources remain the factual authority.
            # ----------------------------------------------------------

            grounding_result = self.judge.judge_claim(
                claim_id=",".join(
                    section.source_claim_ids
                ),
                claim=section.body,
                sources=sources,
                field=field,
            )

            results.append(
                FlowGroundingResult(
                    field=field,
                    claim_id=grounding_result.claim_id,
                    claim=grounding_result.claim,
                    noul=grounding_result.noul,
                    decision=grounding_result.decision,
                )
            )

        return FlowGroundingReport(
            results=results,
        )

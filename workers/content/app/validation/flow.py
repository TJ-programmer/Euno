
from app.models import CanonicalContent, FlowPresentation


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


def validate_flow_presentation(
    presentation: FlowPresentation,
    content: CanonicalContent,
) -> None:
    if presentation.content_id != content.id:
        raise ValueError(
            "Flow presentation content_id does not match "
            "canonical content id."
        )

    valid_claim_ids = {
        claim.id
        for claim in content.claims
    }

    for section_name in FLOW_SECTION_NAMES:
        section = getattr(
            presentation,
            section_name,
        )

        if not section.title.strip():
            raise ValueError(
                f"Flow section '{section_name}' title "
                "cannot be empty."
            )

        if not section.body.strip():
            raise ValueError(
                f"Flow section '{section_name}' body "
                "cannot be empty."
            )

        unknown_claim_ids = (
            set(section.source_claim_ids)
            - valid_claim_ids
        )

        if unknown_claim_ids:
            raise ValueError(
                f"Flow section '{section_name}' references "
                f"unknown canonical claims: "
                f"{sorted(unknown_claim_ids)}"
            )

    if presentation.payload.model_dump() != {}:
        raise ValueError(
            "Flow presentation payload must be empty "
            "for the current Flow presentation contract."
        )


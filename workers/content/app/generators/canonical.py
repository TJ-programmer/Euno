from datetime import datetime, timezone

from app.llm.orchestrator import LLMOrchestrator
from app.models import CanonicalContent, SourceInput
from app.prompts.canonical import CANONICAL_SYSTEM_PROMPT


GENERATOR_VERSION = "canonical-v1"


class CanonicalGenerator:

    def __init__(
        self,
        llm: LLMOrchestrator | None = None,
    ):
        self.llm = llm or LLMOrchestrator()

    async def generate(
        self,
        *,
        topic: str,
        sources: list[SourceInput],
        content_type: str = "evergreen",
        difficulty: str = "balanced",
    ) -> CanonicalContent:

        # Build the source context that will be given to the LLM.
        source_context = "\n\n".join(
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

        prompt = f"""
{CANONICAL_SYSTEM_PROMPT}

Generate one canonical Euno knowledge object.

TOPIC:
{topic}

CONTENT TYPE:
{content_type}

DIFFICULTY:
{difficulty}

SOURCE MATERIAL
---------------

{source_context}

Additional requirements:

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
- Only use information supported by the supplied sources.
- Only reference source IDs that appear in the SOURCE MATERIAL.

Return ONLY the requested structured object.
"""

        result = await self.llm.generate(
            prompt=prompt,
            response_model=CanonicalContent,
        )

        return result.model_copy(
            update={
                "generated_at": datetime.now(timezone.utc),
                "generator_version": GENERATOR_VERSION,
            }
        )

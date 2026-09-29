from app.llm.orchestrator import LLMOrchestrator
from app.models import CanonicalContent, HomePresentation
from app.prompts.home import HOME_PRESENTATION_SYSTEM_PROMPT
from app.repositories.content import ContentRepository


class HomePresentationGenerator:
    def __init__(
        self,
        llm: LLMOrchestrator | None = None,
        repository: ContentRepository | None = None,
    ):
        self.llm = llm or LLMOrchestrator()
        self.repository = (
            repository or ContentRepository()
        )

    async def generate(
        self,
        content: CanonicalContent,
    ) -> HomePresentation:
        prompt = self._build_prompt(content)

        presentation = await self.llm.generate(
            prompt=prompt,
            response_model=HomePresentation,
        )

        self._validate(
            presentation=presentation,
            content=content,
        )

        self.repository.save_home_presentation(
            content=content,
            presentation=presentation,
        )

        return presentation

    @staticmethod
    def _build_prompt(
        content: CanonicalContent,
    ) -> str:
        canonical = content.model_dump_json(
            indent=2
        )

        return f"""
{HOME_PRESENTATION_SYSTEM_PROMPT}

CANONICAL CONTENT
-----------------

{canonical}

TASK
----

Transform this canonical content into a Home presentation.

The `content_id` MUST exactly match:

{content.id}

Return only the structured HomePresentation object.
"""

    @staticmethod
    def _validate(
        presentation: HomePresentation,
        content: CanonicalContent,
    ) -> None:
        if presentation.content_id != content.id:
            raise ValueError(
                "Home presentation content_id does not match "
                "canonical content id."
            )

        if not presentation.label.strip():
            raise ValueError(
                "Home presentation label cannot be empty."
            )

        if not presentation.display_title.strip():
            raise ValueError(
                "Home presentation display_title cannot be empty."
            )

        if not presentation.display_summary.strip():
            raise ValueError(
                "Home presentation display_summary cannot be empty."
            )

        if presentation.payload.model_dump() != {}:
            raise ValueError(
                "Home presentation payload must be empty "
                "for the current Home presentation contract."
            )

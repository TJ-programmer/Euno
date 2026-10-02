from app.llm.orchestrator import LLMOrchestrator
from app.models import CanonicalContent, HomePresentation
from app.prompts.home import HOME_PRESENTATION_SYSTEM_PROMPT
from app.repositories.content import ContentRepository

MAX_ATTEMPTS = 3

MAX_TITLE_WORDS = 14

MIN_SHORT_SUMMARY_WORDS = 10
MAX_SHORT_SUMMARY_WORDS = 60

MIN_DETAILED_WORDS = 80
MAX_DETAILED_WORDS = 260

MARKDOWN_MARKERS = ("**", "##", "\n- ", "\n* ", "\n1. ")
BANNED_TITLE_PHRASES = (
    "you won't believe",
    "shocking",
    "this one trick",
    "secret",
)


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
        base_prompt = self._build_prompt(content)
        prompt = base_prompt
        presentation: HomePresentation | None = None

        for attempt in range(1, MAX_ATTEMPTS + 1):
            presentation = await self.llm.generate(
                prompt=prompt,
                response_model=HomePresentation,
            )

            try:
                self._validate(
                    presentation=presentation,
                    content=content,
                )
                break
            except ValueError as error:
                if attempt == MAX_ATTEMPTS:
                    raise

                # Tell the model exactly what went wrong and retry.
                prompt = (
                    f"{base_prompt}\n\n"
                    "PREVIOUS ATTEMPT FAILED VALIDATION\n"
                    "----------------------------------\n\n"
                    f"{error}\n\n"
                    "Fix this problem and return the full "
                    "HomePresentation object again.\n"
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

Return only the structured HomePresentation object, with the
detailed summary in `payload.detailed_summary`.
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

        # ---- Title ----
        title = presentation.display_title.strip()

        if not title:
            raise ValueError(
                "Home presentation display_title cannot be empty."
            )

        if len(title.split()) > MAX_TITLE_WORDS:
            raise ValueError(
                f"display_title is too long. Keep it under "
                f"{MAX_TITLE_WORDS} words, ideally 4 to 10."
            )

        if "!" in title or title.isupper():
            raise ValueError(
                "display_title must not use exclamation marks "
                "or ALL CAPS."
            )

        lowered_title = title.lower()
        if any(p in lowered_title for p in BANNED_TITLE_PHRASES):
            raise ValueError(
                "display_title uses clickbait wording. Make it "
                "catchy but honest."
            )

        # ---- Short summary ----
        short = presentation.display_summary.strip()

        if not short:
            raise ValueError(
                "Home presentation display_summary cannot be empty."
            )

        short_words = len(short.split())

        if short_words < MIN_SHORT_SUMMARY_WORDS:
            raise ValueError(
                f"display_summary is too short ({short_words} "
                f"words). Write 1 to 2 sentences, about 20 to 45 "
                f"words."
            )

        if short_words > MAX_SHORT_SUMMARY_WORDS:
            raise ValueError(
                f"display_summary is too long ({short_words} "
                f"words). It must be a short teaser of 1 to 2 "
                f"sentences, about 20 to 45 words. Put the longer "
                f"explanation in payload.detailed_summary."
            )

        if any(m in short for m in MARKDOWN_MARKERS):
            raise ValueError(
                "display_summary must be plain text with no "
                "markdown."
            )

        # ---- Detailed summary (payload) ----
        detailed = presentation.payload.detailed_summary.strip()

        if not detailed:
            raise ValueError(
                "payload.detailed_summary cannot be empty."
            )

        detailed_words = len(detailed.split())

        if detailed_words < MIN_DETAILED_WORDS:
            raise ValueError(
                f"payload.detailed_summary is too short "
                f"({detailed_words} words). It must be at least "
                f"{MIN_DETAILED_WORDS} words, written as 2 to 4 "
                f"short paragraphs."
            )

        if detailed_words > MAX_DETAILED_WORDS:
            raise ValueError(
                f"payload.detailed_summary is too long "
                f"({detailed_words} words). It must be at most "
                f"{MAX_DETAILED_WORDS} words."
            )

        if any(m in detailed for m in MARKDOWN_MARKERS):
            raise ValueError(
                "payload.detailed_summary must be plain text "
                "with no markdown, bullets, or headers."
            )

        if short.lower() == detailed.lower()[: len(short)]:
            raise ValueError(
                "payload.detailed_summary must not simply repeat "
                "display_summary. Expand on it."
            )

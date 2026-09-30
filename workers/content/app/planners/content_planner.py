
from pydantic import BaseModel, ConfigDict

from app.llm.orchestrator import LLMOrchestrator
from app.models import ContentPlan


class ContentPlanList(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plans: list[ContentPlan]


class ContentPlanner:
    def __init__(
        self,
        llm: LLMOrchestrator | None = None,
    ):
        self.llm = llm or LLMOrchestrator()

    def _build_prompt(
        self,
        *,
        topics: list[str],
        count: int,
        difficulty: str,
    ) -> str:

        topic_list = "\n".join(
            f"- {topic}"
            for topic in topics
        )

        return f"""
You are the content planner for Euno.

Euno turns attention into curiosity and understanding.

Your job is NOT to write the final content.

Your job is to propose interesting directions that the
CanonicalGenerator can later turn into complete knowledge
artifacts.

AVAILABLE TOPICS
----------------

{topic_list}

REQUIREMENTS
------------

Generate exactly {count} content plans.

Difficulty:
{difficulty}

Each plan must contain:

- topic
- direction
- content_type
- difficulty

DIRECTION
---------

The direction describes WHAT Euno should explore.

It should be specific enough that another model can generate
a complete knowledge artifact from it.

Good:

"Why can AI models give confident answers that are completely wrong?"

"Why does ice float on water?"

"Why do humans remember embarrassing moments so strongly?"

Bad:

"AI"

"Psychology facts"

"Interesting science"

CONTENT QUALITY
---------------

Prefer ideas that create genuine curiosity.

Prefer questions, surprising relationships, counterintuitive
facts, mechanisms, and everyday phenomena.

Avoid:

- generic trivia
- clickbait
- sensationalism
- political persuasion
- duplicate ideas
- extremely broad subjects
- listicles
- vague directions

CONTENT TYPE
------------

Use one of:

- explainer
- curiosity
- comparison
- mechanism

Choose the type that best fits the direction.

TOPIC
-----

Use ONLY one of the supplied topic IDs.

Do not invent topic IDs.

IMPORTANT
---------

Do not write the final article.

Do not provide claims, explanations, sources, citations,
or long answers.

Return the plans inside a "plans" field.
"""


    async def generate(
        self,
        *,
        topics: list[str],
        count: int = 5,
        difficulty: str = "balanced",
    ) -> list[ContentPlan]:

        if not topics:
            raise ValueError(
                "ContentPlanner requires at least one topic."
            )

        if count < 1:
            raise ValueError(
                "ContentPlanner count must be at least 1."
            )

        prompt = self._build_prompt(
            topics=topics,
            count=count,
            difficulty=difficulty,
        )

        result = await self.llm.generate(
            prompt=prompt,
            response_model=ContentPlanList,
        )

        return result.plans


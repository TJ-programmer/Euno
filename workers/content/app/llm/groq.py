from typing import TypeVar

from groq import AsyncGroq
from pydantic import BaseModel

from app.config import settings
from app.llm.base import LLMProvider
from app.llm.errors import LLMProviderError


T = TypeVar("T", bound=BaseModel)


class GroqProvider(LLMProvider):

    name = "groq"

    def __init__(self):
        self.client = AsyncGroq(
            api_key=settings.groq_api_key
        )

    async def generate(
        self,
        *,
        prompt: str,
        response_model: type[T],
    ) -> T:

        try:
            response = await self.client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": response_model.__name__,
                        "strict": True,
                        "schema": response_model.model_json_schema(),
                    },
                },
            )

            content = response.choices[0].message.content

            if not content:
                raise ValueError("Empty model response")

            return response_model.model_validate_json(content)

        except Exception as exc:
            raise LLMProviderError(
                self.name,
                str(exc),
            ) from exc

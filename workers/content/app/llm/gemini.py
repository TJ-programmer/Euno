from typing import TypeVar

from google import genai
from pydantic import BaseModel

from app.config import settings
from app.llm.base import LLMProvider
from app.llm.errors import LLMProviderError


T = TypeVar("T", bound=BaseModel)


class GeminiProvider(LLMProvider):

    name = "gemini"

    def __init__(self):
        self.client = genai.Client(
            api_key=settings.gemini_api_key
        )

    async def generate(
        self,
        *,
        prompt: str,
        response_model: type[T],
    ) -> T:

        try:
            response = await self.client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": response_model,
                },
            )

            content = response.text

            if not content:
                raise ValueError("Empty model response")

            return response_model.model_validate_json(content)

        except Exception as exc:
            raise LLMProviderError(
                self.name,
                str(exc),
            ) from exc

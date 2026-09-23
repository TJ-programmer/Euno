import json
from typing import TypeVar

import httpx
from pydantic import BaseModel

from app.config import settings
from app.llm.base import LLMProvider
from app.llm.errors import LLMProviderError


T = TypeVar("T", bound=BaseModel)


class NvidiaProvider(LLMProvider):

    name = "nvidia"

    BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

    async def generate(
        self,
        *,
        prompt: str,
        response_model: type[T],
    ) -> T:

        payload = {
            "model": settings.nvidia_model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "response_format": {
                "type": "json_object",
            },
        }

        headers = {
            "Authorization": f"Bearer {settings.nvidia_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                timeout=settings.llm_timeout_seconds
            ) as client:

                response = await client.post(
                    self.BASE_URL,
                    headers=headers,
                    json=payload,
                )

                response.raise_for_status()

                data = response.json()

                content = (
                    data["choices"][0]["message"]["content"]
                )

                if not content:
                    raise ValueError("Empty model response")

                parsed = json.loads(content)

                return response_model.model_validate(parsed)

        except Exception as exc:
            raise LLMProviderError(
                self.name,
                str(exc),
            ) from exc

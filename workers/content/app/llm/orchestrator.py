import logging

from pydantic import BaseModel

from app.config import settings
from app.llm.base import LLMProvider
from app.llm.errors import AllProvidersFailed
from app.llm.groq import GroqProvider
from app.llm.gemini import GeminiProvider
from app.llm.nvidia import NvidiaProvider


logger = logging.getLogger(__name__)


class LLMOrchestrator:

    def __init__(self):
        self.providers: dict[str, LLMProvider] = {}

        self._register_available_providers()

    def _register_available_providers(self):

        provider_factories = {
            "groq": (
                settings.groq_api_key,
                GroqProvider,
            ),
            "gemini": (
                settings.gemini_api_key,
                GeminiProvider,
            ),
            "nvidia": (
                settings.nvidia_api_key,
                NvidiaProvider,
            ),
        }

        for provider_name in settings.provider_order:

            config = provider_factories.get(provider_name)

            if config is None:
                logger.warning(
                    "Unknown provider configured: %s",
                    provider_name,
                )
                continue

            api_key, provider_class = config

            if not api_key:
                logger.warning(
                    "Skipping %s: API key not configured",
                    provider_name,
                )
                continue

            try:
                self.providers[provider_name] = provider_class()

                logger.info(
                    "Registered LLM provider: %s",
                    provider_name,
                )

            except Exception as exc:
                logger.warning(
                    "Failed to initialize %s: %s",
                    provider_name,
                    exc,
                )

    async def generate(
        self,
        *,
        prompt: str,
        response_model: type[BaseModel],
    ):

        if not self.providers:
            raise AllProvidersFailed([
                {
                    "provider": "system",
                    "attempt": 0,
                    "error": "No LLM providers are configured",
                }
            ])

        errors = []

        for provider_name in settings.provider_order:

            provider = self.providers.get(provider_name)

            if provider is None:
                continue

            for attempt in range(
                settings.llm_max_retries_per_provider + 1
            ):

                try:
                    logger.info(
                        "LLM request: provider=%s attempt=%s",
                        provider_name,
                        attempt + 1,
                    )

                    result = await provider.generate(
                        prompt=prompt,
                        response_model=response_model,
                    )

                    logger.info(
                        "LLM success: provider=%s",
                        provider_name,
                    )

                    return result

                except Exception as exc:

                    logger.warning(
                        "LLM failure: provider=%s attempt=%s error=%s",
                        provider_name,
                        attempt + 1,
                        exc,
                    )

                    errors.append({
                        "provider": provider_name,
                        "attempt": attempt + 1,
                        "error": str(exc),
                    })

        raise AllProvidersFailed(errors)

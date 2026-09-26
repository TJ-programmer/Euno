from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    nvidia_api_key: str | None = None

    supabase_url: str
    supabase_service_role_key: sts

    groq_model: str = "openai/gpt-oss-120b"
    gemini_model: str = "gemini-2.5-flash"
    nvidia_model: str = "deepseek-ai/deepseek-v4-flash"

    llm_provider_order: str = "groq,gemini,nvidia"

    llm_max_retries_per_provider: int = 1
    llm_timeout_seconds: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def provider_order(self) -> list[str]:
        return [
            provider.strip().lower()
            for provider in self.llm_provider_order.split(",")
            if provider.strip()
        ]


settings = Settings()

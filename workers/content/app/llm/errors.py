class LLMProviderError(Exception):
    def __init__(
        self,
        provider: str,
        message: str,
        *,
        retryable: bool = True,
    ):
        self.provider = provider
        self.retryable = retryable

        super().__init__(
            f"[{provider}] {message}"
        )


class AllProvidersFailed(Exception):
    def __init__(self, errors: list[dict]):
        self.errors = errors

        message = "All LLM providers failed:\n"

        for error in errors:
            message += (
                f"- {error['provider']}: "
                f"{error['error']}\n"
            )

        super().__init__(message)

"""
config.py — Load and validate all environment variables.

Uses Pydantic BaseSettings so every missing required variable
raises a clear error at startup instead of failing silently later.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration for ScholarSwarm AI backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",           # ignore unknown env vars
    )

    # ── LLM ──────────────────────────────────────────────────
    llm_provider: Literal["openai", "gemini", "anthropic"] = Field(
        default="openai",
        description="Which LLM provider to use",
    )
    llm_model: str = Field(
        default="",
        description="Model name override (leave blank for provider default)",
    )
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")

    # ── Web Search ───────────────────────────────────────────
    tavily_api_key: str = Field(default="", alias="TAVILY_API_KEY")
    serpapi_api_key: str = Field(default="", alias="SERPAPI_API_KEY")

    # ── Server ───────────────────────────────────────────────
    backend_port: int = Field(default=8000)
    backend_host: str = Field(default="0.0.0.0")
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173"
    )
    max_upload_size: int = Field(default=10 * 1024 * 1024)  # 10 MB

    # ── Demo Mode ────────────────────────────────────────────
    demo_mode: bool = Field(
        default=False,
        description="Run without real API keys; shows clearly labeled demo data",
    )

    # ── Derived helpers ──────────────────────────────────────
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def effective_llm_model(self) -> str:
        """Return model name, falling back to provider defaults."""
        if self.llm_model:
            return self.llm_model
        defaults = {
            "openai": "gpt-4o-mini",
            "gemini": "gemini-1.5-flash",
            "anthropic": "claude-3-haiku-20240307",
        }
        return defaults[self.llm_provider]

    @property
    def has_llm_key(self) -> bool:
        """True if at least one LLM API key is configured."""
        return bool(
            self.openai_api_key
            or self.google_api_key
            or self.anthropic_api_key
        )

    @property
    def has_search_key(self) -> bool:
        """True if at least one web search API key is configured."""
        return bool(self.tavily_api_key or self.serpapi_api_key)

    @property
    def is_fully_configured(self) -> bool:
        return self.has_llm_key and self.has_search_key

    def missing_keys(self) -> list[str]:
        """Return human-readable list of what is missing."""
        missing = []
        if not self.has_llm_key:
            missing.append(
                "LLM key (OPENAI_API_KEY, GOOGLE_API_KEY, or ANTHROPIC_API_KEY)"
            )
        if not self.has_search_key:
            missing.append("Search key (TAVILY_API_KEY or SERPAPI_API_KEY)")
        return missing


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — call this everywhere."""
    return Settings()

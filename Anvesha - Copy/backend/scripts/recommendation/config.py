"""
Central configuration for Anvesha recommendation model inside backend.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", "..", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


def _float(name: str, default: float) -> float:
    val = os.getenv(name)
    try:
        return float(val) if val is not None else default
    except ValueError:
        return default


def _int(name: str, default: int) -> int:
    val = os.getenv(name)
    try:
        return int(val) if val is not None else default
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # --- External API keys (read from env) ---
    GEMINI_API_KEY: str | None = field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    GOOGLE_PLACES_API_KEY: str | None = field(default_factory=lambda: os.getenv("GOOGLE_PLACES_API_KEY"))

    # --- Mumbai dataset source ---
    MUMBAI_DATA_SOURCE: str = field(default_factory=lambda: os.getenv("MUMBAI_DATA_SOURCE", "json"))
    MUMBAI_DATA_PATH: str = field(
        default_factory=lambda: os.getenv(
            "MUMBAI_DATA_PATH",
            os.path.join(os.path.dirname(__file__), "data", "mumbai_places.json"),
        )
    )

    # --- MySQL database credentials (if active) ---
    MYSQL_HOST: str = field(default_factory=lambda: os.getenv("MYSQL_HOST", "localhost"))
    MYSQL_PORT: int = field(default_factory=lambda: _int("MYSQL_PORT", 3306))
    MYSQL_USER: str = field(default_factory=lambda: os.getenv("MYSQL_USER", "root"))
    MYSQL_PASSWORD: str = field(default_factory=lambda: os.getenv("MYSQL_PASSWORD", ""))
    MYSQL_DATABASE: str = field(default_factory=lambda: os.getenv("MYSQL_DATABASE", "anvesha"))

    # --- Embeddings ---
    EMBEDDING_BACKEND: str = field(default_factory=lambda: os.getenv("EMBEDDING_BACKEND", "auto"))
    EMBEDDING_MODEL_NAME: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    )
    EMBEDDING_CACHE_PATH: str = field(
        default_factory=lambda: os.getenv(
            "EMBEDDING_CACHE_PATH",
            os.path.join(os.path.dirname(__file__), "data", "embedding_cache.json"),
        )
    )

    # --- Google Places retrieval limits ---
    GOOGLE_PLACES_CANDIDATE_LIMIT: int = field(default_factory=lambda: _int("GOOGLE_PLACES_CANDIDATE_LIMIT", 60))
    GOOGLE_PLACES_DEFAULT_RADIUS_M: int = field(default_factory=lambda: _int("GOOGLE_PLACES_DEFAULT_RADIUS_M", 3000))
    GOOGLE_PLACES_RESULT_CACHE_TTL_SECONDS: int = field(
        default_factory=lambda: _int("GOOGLE_PLACES_RESULT_CACHE_TTL_SECONDS", 3600)
    )

    # --- Recommendation Ranking Weights ---
    WEIGHT_SEMANTIC: float = field(default_factory=lambda: _float("WEIGHT_SEMANTIC", 0.40))
    WEIGHT_DISTANCE: float = field(default_factory=lambda: _float("WEIGHT_DISTANCE", 0.20))
    WEIGHT_BUDGET: float = field(default_factory=lambda: _float("WEIGHT_BUDGET", 0.15))
    WEIGHT_TIME: float = field(default_factory=lambda: _float("WEIGHT_TIME", 0.10))
    WEIGHT_GROUP: float = field(default_factory=lambda: _float("WEIGHT_GROUP", 0.05))
    WEIGHT_QUALITY: float = field(default_factory=lambda: _float("WEIGHT_QUALITY", 0.05))
    WEIGHT_LOCAL: float = field(default_factory=lambda: _float("WEIGHT_LOCAL", 0.05))

    # --- LLM trip planner (Gemini) ---
    GEMINI_MODEL: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    LLM_TIMEOUT_SECONDS: int = field(default_factory=lambda: _int("LLM_TIMEOUT_SECONDS", 25))
    PLAN_SHORTLIST_SIZE: int = field(default_factory=lambda: _int("PLAN_SHORTLIST_SIZE", 12))

    DEFAULT_TOP_K: int = field(default_factory=lambda: _int("DEFAULT_TOP_K", 10))
    MAX_TOP_K: int = field(default_factory=lambda: _int("MAX_TOP_K", 50))

    LOG_LEVEL: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))


settings = Settings()

"""
Candidate retrieval router: determines recommendation mode (mumbai vs google) and retrieves candidates.
"""
from __future__ import annotations

import logging
import os
from typing import Literal

from scripts.recommendation.schemas import Intent, NormalizedPlace
from scripts.recommendation.retrieval.google_places import retrieve_google_candidates
from scripts.recommendation.retrieval.mumbai_retriever import retrieve_mumbai_candidates

logger = logging.getLogger("anvesha.recommendation.retrieval")

EngineName = Literal["mumbai", "google"]


def places_api_configured() -> bool:
    from scripts.recommendation.config import settings

    return bool(os.getenv("GOOGLE_PLACES_API_KEY") or settings.GOOGLE_PLACES_API_KEY)


def resolve_engine(intent: Intent, requested_mode: str = "auto") -> EngineName:
    """'auto' uses live Google Places only when a key is configured; otherwise the local engine
    (bundled dataset + SQLite catalog), so the app works with no external API key."""
    if requested_mode in ("mumbai", "google"):
        return requested_mode  # type: ignore[return-value]
    return "google" if places_api_configured() else "mumbai"


def get_candidates(intent: Intent, engine: EngineName) -> list[NormalizedPlace]:
    if engine == "mumbai":
        return retrieve_mumbai_candidates(intent)
    return retrieve_google_candidates(intent)

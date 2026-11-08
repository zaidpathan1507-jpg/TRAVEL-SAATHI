"""
Framework-agnostic core pipeline for the Anvesha recommendation service.
"""
from __future__ import annotations

import logging

from scripts.gemini.gemini_intent import extract_intent
from scripts.recommendation.config import settings
from scripts.recommendation.ranking.ranker import rank_candidates
from scripts.recommendation.retrieval.candidate_retriever import get_candidates, resolve_engine
from scripts.recommendation.schemas import Intent, RecommendRequest, RecommendResponse

logger = logging.getLogger("anvesha.recommendation.service")


def run_recommendation(request: RecommendRequest, intent_override: Intent | None = None) -> RecommendResponse:
    """Runs intent extraction, engine resolution, candidate retrieval, embedding calculation, and ranking."""
    logger.debug("recommendation start: query=%r mode=%s", request.query, request.mode)

    intent = intent_override or extract_intent(request.query)

    if request.latitude is not None and request.longitude is not None:
        intent = intent.model_copy(update={"latitude": request.latitude, "longitude": request.longitude})

    logger.debug(
        "intent: method=%s city=%s location=%s categories=%s budget=%s duration=%sm",
        intent.extraction_method, intent.city, intent.location_text, intent.categories, intent.budget, intent.duration_minutes,
    )

    engine = resolve_engine(intent, request.mode)
    top_k = request.top_k or settings.DEFAULT_TOP_K
    top_k = min(top_k, settings.MAX_TOP_K)

    logger.info("places shortlist: engine=%s (%s) top_k=%d", engine, "Google Places API" if engine == "google" else "local dataset + SQLite", top_k)

    fallback_note = None
    try:
        candidates = get_candidates(intent, engine)
    except Exception as exc:
        # "auto" prefers live Google Places but must never leave the user without results
        if request.mode != "auto" or engine != "google":
            raise
        logger.warning("Google Places unavailable (%s); using the local dataset instead.", exc)
        fallback_note = "Live Google Places was unavailable, so results come from the local dataset."
        engine = "mumbai"
        candidates = get_candidates(intent, engine)
    logger.debug("raw candidates: %d", len(candidates))

    recommendations, engine_meta = rank_candidates(intent, candidates, engine, top_k=top_k)
    logger.debug(
        "ranked: %d after constraints, %d returned", engine_meta.candidates_after_constraints, len(recommendations)
    )

    if fallback_note:
        engine_meta.warnings.append(fallback_note)

    response = RecommendResponse(
        mode=engine,
        intent=intent,
        recommendations=recommendations,
        engine_meta=engine_meta,
    )
    logger.info(
        "query_id=%s engine=%s user_id=%s -> %d recommendations",
        response.query_id,
        engine,
        request.user_id,
        len(recommendations),
    )
    return response

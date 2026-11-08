"""Plan generation: shortlisted places -> Gemini -> 3-4 timed plans (rule-based fallback)."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Optional

from scripts.recommendation.config import settings
from scripts.recommendation.planning.fallback import local_plans
from scripts.recommendation.planning.llm import LlmFn, gemini_configured, llm_plans
from scripts.recommendation.planning.timeline import Place, PlanContext, place_from_recommendation

logger = logging.getLogger("anvesha.recommendation.planning")

MIN_PLANS = 3
MAX_PLANS = 4


@dataclass
class PlanResult:
    plans: list[dict[str, Any]]
    generator: str  # "gemini" | "mixed" | "local" | "none"
    model: Optional[str] = None
    warnings: list[str] = field(default_factory=list)


def generate_plans(recommendations: list[Any], ctx: PlanContext, llm: Optional[LlmFn] = None) -> PlanResult:
    """Shortlist (ranked Recommendation objects) -> up to four plans.

    Gemini is used when a key is configured (or `llm` is given); if it fails, or returns fewer than
    three usable plans, the rule-based planner fills the gap so the page never comes back empty."""
    shortlist: list[Place] = [place_from_recommendation(r) for r in recommendations[: settings.PLAN_SHORTLIST_SIZE]]
    warnings: list[str] = []
    if not shortlist:
        return PlanResult([], "none", None, ["No places were shortlisted, so no plans could be made."])

    plans: list[dict[str, Any]] = []
    if llm is not None or gemini_configured():
        try:
            plans = llm_plans(shortlist, ctx, llm)
            if not plans:
                warnings.append("The AI planner returned no usable plans, so these plans were built by the local planner.")
        except Exception as exc:  # network, quota, bad JSON ...
            logger.warning("LLM planning failed (%s); using rule-based plans.", exc)
            warnings.append("The AI planner was unavailable, so these plans were built by the local planner.")
    else:
        warnings.append("No Gemini key is configured, so these plans were built by the local planner.")

    if len(plans) < MIN_PLANS:
        taken = {frozenset(s["placeId"] for s in p["stops"]) for p in plans}
        plans += local_plans(shortlist, ctx, exclude=taken, limit=MAX_PLANS - len(plans))
    plans = plans[:MAX_PLANS]

    sources = {p["source"] for p in plans}
    logger.info("plans: %d built (%s); gemini_key_configured=%s", len(plans), ", ".join(sorted(sources)) or "none", gemini_configured())
    generator = "none" if not plans else ("mixed" if len(sources) > 1 else next(iter(sources)))
    model = settings.GEMINI_MODEL if "gemini" in sources else None
    return PlanResult(plans, generator, model, warnings)

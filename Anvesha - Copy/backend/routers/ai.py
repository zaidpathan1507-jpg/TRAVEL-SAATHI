from dataclasses import asdict, replace
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException

from ai_engine import (
    Experience,
    Trip,
    build_plan,
    compose_plan,
    compress_plan,
    parse_query,
    plan_checks,
    rain_affected,
    rain_alternatives,
)
from catalog import experience_catalog
from schemas import (
    AdaptRainRequest,
    AdaptTimeRequest,
    ParseRequest,
    PlanRequest,
    RecommendRequest,
    TripModel,
)
from serializers import camelize_keys

router = APIRouter()


# ------------------------------------------------------------------ helpers

def engine_trip(trip: TripModel) -> Trip:
    """Request trip (pydantic) -> the engine's Trip dataclass"""
    return Trip(**trip.model_dump())


def engine_experiences() -> Dict[str, Experience]:
    """Catalog rows -> engine Experience objects, keyed by id"""
    return {
        exp_id: Experience(
            id=data["id"],
            title=data["title"],
            category=data["category"],
            tags=data["tags"],
            area=data["area"],
            x=data["x"],
            y=data["y"],
            duration_min=data["duration_min"],
            price=data["price"],
            child_price=data["child_price"],
            rating=data["rating"],
            indoor=data["indoor"],
            family_friendly=data["family_friendly"],
            wheelchair=data["wheelchair"],
            walking=data["walking"],
            slots=data["slots"],
        )
        for exp_id, data in experience_catalog.items()
    }


def require_known(ids: List[str], catalog: Dict[str, Experience]) -> None:
    for exp_id in ids:
        if exp_id not in catalog:
            raise HTTPException(status_code=404, detail=f"Experience '{exp_id}' not found")


def match_payload(exp: Experience, match: Any) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": exp.id,
        "title": exp.title,
        "score": match.score,
        "reasons": match.reasons,
        "breakdown": match.breakdown,
        "distance": match.distance,
        "travel": match.travel,
    }
    if match.next_slot:
        out["nextSlot"] = dict(match.next_slot)
    return out


def plan_payload(plan: Any) -> Dict[str, Any]:
    items = []
    for item in plan.items:
        d = camelize_keys(asdict(item))
        items.append({k: v for k, v in d.items() if v is not None})
    return {
        "items": items,
        "totalMin": plan.total_min,
        "travelKm": plan.travel_km,
        "groupCost": plan.group_cost,
        "perPerson": plan.per_person,
        "endMin": plan.end_min,
    }


# ------------------------------------------------------------------ endpoints

@router.post("/parse")
def parse_text(request: ParseRequest) -> Dict[str, Any]:
    """Natural-language request -> structured trip constraints (rule-based parser, no external API needed)"""
    base = engine_trip(request.trip or TripModel())
    result = parse_query(request.text, base)
    patch = result["patch"]

    return {
        "trip": camelize_keys(asdict(replace(base, **patch))),
        "patch": camelize_keys(patch),
        "fields": result["fields"],
    }


@router.get("/maps-key")
def get_maps_key() -> Dict[str, str]:
    """Expose Google Maps API key to frontend for rendering interactive map"""
    import os
    from scripts.recommendation.config import settings
    key = os.getenv("GOOGLE_PLACES_API_KEY") or settings.GOOGLE_PLACES_API_KEY or ""
    return {"key": key}


def _run_recommendation(request: RecommendRequest) -> "tuple[Any, str]":
    """Shared by /recommend and /trip-plans: shortlist places for the trip with the ML pipeline"""
    from scripts.recommendation.schemas import RecommendRequest as MLRecommendRequest, Intent, Budget, BudgetBasis
    from scripts.recommendation.service import run_recommendation

    query_str = request.query
    if not query_str and request.trip:
        query_str = f"Places to visit in {request.trip.city} for {' and '.join(request.trip.interests)}"
    elif not query_str:
        query_str = "Places to visit in Pune for food and culture"

    rec_req = MLRecommendRequest(
        query=query_str,
        mode=request.mode or "auto",
        top_k=request.top_k or request.limit,
    )

    if request.mode == "google":
        from scripts.recommendation.retrieval.candidate_retriever import places_api_configured

        if not places_api_configured():
            raise HTTPException(status_code=400, detail="Live Google Places mode needs GOOGLE_PLACES_API_KEY; use mode 'auto' or 'mumbai' for local data")

    try:
        if request.trip:
            b_basis = BudgetBasis.PER_PERSON if request.trip.budget_mode == "person" else BudgetBasis.TOTAL
            intent_override = Intent(
                raw_query=query_str,
                city=request.trip.city,
                location_text=request.trip.city,
                categories=request.trip.interests or ["food", "culture"],
                budget=Budget(amount=request.trip.budget, basis=b_basis),
                duration_minutes=request.trip.minutes,
                group_size=request.trip.adults + request.trip.children,
                radius_km=request.trip.max_km,
                extraction_method="rule_based",
            )
            return run_recommendation(rec_req, intent_override=intent_override), query_str
        return run_recommendation(rec_req), query_str
    except HTTPException:
        raise
    except Exception as exc:  # e.g. explicit Google mode failing on the network
        raise HTTPException(status_code=502, detail=f"Recommendation engine failed: {exc}") from exc


@router.post("/recommend")
def get_recommendations(request: RecommendRequest) -> Any:
    """Ranked places from the Anvesha recommendation model (local dataset + SQLite catalog; live Google Places only if a key is configured)."""
    rec_resp, _ = _run_recommendation(request)
    return rec_resp.model_dump()


@router.post("/trip-plans")
def get_trip_plans(request: RecommendRequest) -> Dict[str, Any]:
    """Shortlist places (Google Places when configured, else the local data), then let the LLM (Gemini)
    turn the shortlist into 3-4 timed plans. Falls back to rule-based plans if the LLM is unavailable."""
    from scripts.recommendation.planning import generate_plans
    from scripts.recommendation.planning.timeline import PlanContext

    rec_resp, query_str = _run_recommendation(request)
    trip = request.trip or TripModel()
    ctx = PlanContext(
        city=trip.city,
        start_min=trip.start_min,
        minutes=trip.minutes,
        budget=trip.budget,
        budget_mode=trip.budget_mode,
        adults=trip.adults,
        children=trip.children,
        group_type=trip.group_type,
        interests=list(trip.interests),
        wheelchair=trip.wheelchair,
        low_walking=trip.low_walking,
        indoor_only=trip.indoor_only,
        vegetarian=trip.vegetarian,
        weather=trip.weather,
        query=query_str,
    )
    result = generate_plans(rec_resp.recommendations, ctx)
    return {
        "shortlist": rec_resp.model_dump(),
        "plans": result.plans,
        "plan_meta": {"generator": result.generator, "model": result.model, "warnings": result.warnings},
    }


@router.post("/plan")
def create_plan(request: PlanRequest) -> Dict[str, Any]:
    """Build a timed itinerary from a list of experiences, or around one primary experience"""
    if not request.ids and not request.primary_id:
        raise HTTPException(status_code=422, detail="Provide either ids or primaryId")

    trip = engine_trip(request.trip)
    catalog = engine_experiences()

    if request.ids:
        ids = request.ids
        require_known(ids, catalog)
    else:
        require_known([request.primary_id], catalog)
        ids = compose_plan(request.primary_id, trip, list(catalog.values()), catalog)

    plan = build_plan(ids, trip, catalog)
    return {"ids": ids, "plan": plan_payload(plan), "checks": plan_checks(plan, ids, trip, catalog)}


@router.post("/adapt/rain")
def adapt_for_rain(request: AdaptRainRequest) -> Dict[str, Any]:
    """Stops that run into the 5 PM rain, and indoor alternatives for them"""
    trip = engine_trip(request.trip)
    rain_trip = replace(trip, weather="rain")
    catalog = engine_experiences()
    require_known(request.ids, catalog)
    experiences = list(catalog.values())

    affected = rain_affected(request.ids, rain_trip, catalog)

    by_stop: Dict[str, List[Dict[str, Any]]] = {}
    for stop in affected:
        if stop in by_stop:
            continue
        alts = rain_alternatives(stop, request.ids, trip, experiences, catalog)
        by_stop[stop] = [match_payload(a["exp"], a["match"]) for a in alts]

    return {
        "affected": affected,
        "alternatives": by_stop[affected[0]] if affected else [],
        "alternativesByStop": by_stop,
    }


@router.post("/adapt/time")
def adapt_for_time(request: AdaptTimeRequest) -> Dict[str, Any]:
    """Shorten the plan to fit a new time limit"""
    trip = engine_trip(request.trip)
    catalog = engine_experiences()
    require_known(request.ids, catalog)

    result = compress_plan(request.ids, trip, request.minutes, list(catalog.values()), catalog)
    return {
        "ids": result["ids"],
        "removed": result["removed"],
        "added": result["added"],
        "saved": result["saved"],
        "savedMin": result["saved"],
        "before": plan_payload(result["before"]),
        "after": plan_payload(result["after"]),
    }

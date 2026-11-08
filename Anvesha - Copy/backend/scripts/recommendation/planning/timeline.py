"""
Turns an ordered list of shortlisted places into a timed itinerary.

The LLM only chooses *which* places go into a plan and in what order. Every number a traveller sees
(start/end times, travel time, cost, whether it fits the budget) is computed here, never taken from
the model's text.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional

CHILD_PRICE_FACTOR = 0.6  # same child discount the frontend adapter assumes
TRAVEL_SPEED_KMH = 18.0  # city traffic
MIN_TRAVEL_MIN = 5
FIRST_LEG_MIN = 10  # from the traveller's starting point, whose position is unknown
MAX_STOPS = 5

# Rough per-person cost when only Google's price level (0-4) is known
PRICE_LEVEL_INR = {0: 0, 1: 250, 2: 600, 3: 1200, 4: 2500}


@dataclass
class PlanContext:
    """Trip constraints the plans have to respect"""

    city: str = "Pune"
    start_min: int = 960
    minutes: int = 180
    budget: float = 2000
    budget_mode: str = "person"  # "person" | "group"
    adults: int = 2
    children: int = 0
    group_type: str = "family"
    interests: list[str] = field(default_factory=list)
    wheelchair: bool = False
    low_walking: bool = False
    indoor_only: bool = False
    vegetarian: bool = False
    weather: str = "clear"
    query: str = ""

    @property
    def party(self) -> int:
        return max(1, self.adults + self.children)

    @property
    def budget_per_person(self) -> float:
        return self.budget if self.budget_mode == "person" else self.budget / self.party


@dataclass
class Place:
    """Shortlisted place with the features the planner and the LLM work from"""

    id: str
    name: str
    source: str
    categories: list[str]
    address: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    price_pp: Optional[float]  # INR per person, None when unknown
    price_estimated: bool
    rating: Optional[float]
    review_count: Optional[int]
    duration_min: int
    open_status: str
    score: float
    reasons: list[str]
    description: str
    hours: Optional[str]


def _default_duration(categories: Iterable[str]) -> int:
    text = " ".join(categories).lower()
    if any(w in text for w in ("restaurant", "cafe", "food", "bakery", "street")):
        return 60
    if any(w in text for w in ("museum", "gallery", "art", "heritage", "fort", "temple", "worship")):
        return 90
    if any(w in text for w in ("park", "garden", "nature", "promenade")):
        return 60
    return 90


def place_from_recommendation(rec: Any) -> Place:
    """scripts.recommendation.schemas.Recommendation -> Place"""
    details = rec.details or {}
    price = rec.estimated_cost_per_person
    estimated = False
    if price is None:
        level = details.get("price_level")
        if level in PRICE_LEVEL_INR:
            price, estimated = float(PRICE_LEVEL_INR[level]), True
    hours = (details.get("opening_hours") or {}).get("hours_text")
    return Place(
        id=rec.place_id,
        name=rec.name,
        source=rec.source,
        categories=list(rec.category or []),
        address=rec.address,
        lat=rec.latitude,
        lng=rec.longitude,
        price_pp=price,
        price_estimated=estimated,
        rating=rec.rating,
        review_count=details.get("review_count"),
        duration_min=int(details.get("duration_minutes") or _default_duration(rec.category or [])),
        open_status=rec.opening_status or "unknown",
        score=rec.final_score,
        reasons=list(rec.match_reasons or []),
        description=(details.get("description") or "")[:240],
        hours=hours[:160] if hours else None,
    )


def haversine_km(a: Place, b: Place) -> Optional[float]:
    if None in (a.lat, a.lng, b.lat, b.lng):
        return None
    r = 6371.0
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dphi, dlmb = p2 - p1, math.radians(b.lng - a.lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _travel(prev: Optional[Place], nxt: Place) -> tuple[int, float]:
    """(minutes, km) to get to `nxt` from the previous stop"""
    if prev is None:
        return FIRST_LEG_MIN, 0.0
    km = haversine_km(prev, nxt)
    if km is None:
        return FIRST_LEG_MIN, 0.0
    return max(MIN_TRAVEL_MIN, round(km / TRAVEL_SPEED_KMH * 60)), round(km, 1)


def group_cost(places: list[Place], ctx: PlanContext) -> int:
    per_adult = sum(p.price_pp or 0 for p in places)
    return round(per_adult * (ctx.adults + ctx.children * CHILD_PRICE_FACTOR))


def build_plan(
    stops: list[tuple[Place, str]],
    ctx: PlanContext,
    *,
    title: str,
    tagline: str,
    why: str,
    source: str,
    plan_id: str,
) -> Optional[dict[str, Any]]:
    """Schedule the stops back to back from ctx.start_min. Stops that no longer fit in the available
    time are dropped from the end. Returns None if not even the first stop fits."""
    deadline = ctx.start_min + ctx.minutes
    clock = ctx.start_min
    prev: Optional[Place] = None
    items: list[dict[str, Any]] = []
    kept: list[Place] = []
    travel_km = 0.0
    dropped = 0

    for place, note in stops[:MAX_STOPS]:
        travel_min, km = _travel(prev, place)
        start = clock + travel_min
        end = start + place.duration_min
        if end > deadline:
            dropped += 1
            continue
        items.append(
            {
                "placeId": place.id,
                "name": place.name,
                "category": place.categories[0] if place.categories else None,
                "start": start,
                "end": end,
                "durationMin": place.duration_min,
                "travelMin": travel_min,
                "travelKm": km,
                "costPerPerson": place.price_pp,
                "costEstimated": place.price_estimated,
                "rating": place.rating,
                "note": note,
            }
        )
        kept.append(place)
        travel_km += km
        clock, prev = end, place

    if not items:
        return None

    per_person = round(sum(p.price_pp or 0 for p in kept))
    total_group = group_cost(kept, ctx)
    within = per_person <= ctx.budget_per_person if ctx.budget_mode == "person" else total_group <= ctx.budget
    warnings: list[str] = []
    if not within:
        over = per_person - ctx.budget_per_person if ctx.budget_mode == "person" else total_group - ctx.budget
        warnings.append(f"About ₹{round(over):,} over your budget")
    if dropped:
        warnings.append(f"{dropped} stop(s) left out to fit your available time")
    if any(p.open_status == "closed" for p in kept):
        warnings.append("Some places may be closed right now")
    if any(p.price_pp is None for p in kept):
        warnings.append("Some prices are unknown")

    return {
        "id": plan_id,
        "title": title,
        "tagline": tagline,
        "why": why,
        "source": source,
        "stops": items,
        "startMin": ctx.start_min,
        "endMin": clock,
        "totalMin": clock - ctx.start_min,
        "travelKm": round(travel_km, 1),
        "perPerson": per_person,
        "groupCost": total_group,
        "withinBudget": within,
        "warnings": warnings,
    }

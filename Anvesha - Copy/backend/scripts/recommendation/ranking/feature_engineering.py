"""
Feature engineering functions for distance, budget, duration, group size, and rating scores.
"""
from __future__ import annotations

import math

from scripts.recommendation.schemas import Intent, NormalizedPlace


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def distance_km(intent: Intent, place: NormalizedPlace) -> float | None:
    if None in (intent.latitude, intent.longitude, place.latitude, place.longitude):
        return None
    return _haversine_km(intent.latitude, intent.longitude, place.latitude, place.longitude)


def distance_score(intent: Intent, place: NormalizedPlace) -> float | None:
    d = distance_km(intent, place)
    if d is None:
        return None
    scale = (intent.radius_km or 5.0) * 1.5
    return max(0.0, 1.0 - d / scale) if scale > 0 else None


def _effective_budget_per_person(intent: Intent) -> float | None:
    if not intent.budget or intent.budget.amount is None:
        return None
    if intent.budget.basis.value == "total" and intent.group_size:
        return intent.budget.amount / intent.group_size
    return intent.budget.amount


def budget_score(intent: Intent, place: NormalizedPlace) -> float | None:
    if place.cost.is_free:
        return 1.0
    budget_pp = _effective_budget_per_person(intent)
    place_cost = place.cost.max_inr if place.cost.max_inr is not None else place.cost.min_inr
    if budget_pp is None or place_cost is None:
        return None
    if place_cost <= budget_pp:
        return 1.0
    overage_ratio = (place_cost - budget_pp) / budget_pp
    return max(0.0, 1.0 - overage_ratio)


def time_score(intent: Intent, place: NormalizedPlace) -> float | None:
    if intent.duration_minutes is None or place.duration_minutes is None:
        return None
    if place.duration_minutes <= intent.duration_minutes:
        return 1.0
    overage_ratio = (place.duration_minutes - intent.duration_minutes) / intent.duration_minutes
    return max(0.0, 1.0 - overage_ratio)


def group_score(intent: Intent, place: NormalizedPlace) -> float | None:
    if intent.group_size is None or place.capacity.max_people is None:
        return None
    if intent.group_size > place.capacity.max_people:
        return 0.0
    if place.capacity.min_people and intent.group_size < place.capacity.min_people:
        return 0.7
    return 1.0


def quality_score(place: NormalizedPlace) -> float | None:
    if place.rating is None:
        return None
    base = max(0.0, min(1.0, place.rating / 5.0))
    if place.review_count:
        confidence_bonus = min(0.05, math.log10(1 + place.review_count) / 100)
        base = min(1.0, base + confidence_bonus)
    return base


def local_score(place: NormalizedPlace) -> float | None:
    if place.local.local_score is None:
        return None
    return max(0.0, min(1.0, place.local.local_score))

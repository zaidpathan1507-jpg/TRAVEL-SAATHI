"""
Rule-based plan themes, used when Gemini is not configured or fails (and to top up when it returns
fewer than three usable plans). Works only from the shortlisted places, so it needs no API.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

from scripts.recommendation.planning.timeline import (
    MAX_STOPS,
    Place,
    PlanContext,
    build_plan,
    haversine_km,
)

Stops = list[tuple[Place, str]]


def _greedy(order: list[Place], ctx: PlanContext, max_price_pp: Optional[float] = None) -> Stops:
    """Take places in `order` while they still fit the available time (and an optional cost cap)"""
    chosen: Stops = []
    spent = 0.0
    clock = 0
    prev: Optional[Place] = None
    for place in order:
        if len(chosen) >= min(MAX_STOPS, 4):
            break
        if max_price_pp is not None and spent + (place.price_pp or 0) > max_price_pp:
            continue
        km = haversine_km(prev, place) if prev else None
        travel = 10 if km is None else max(5, round(km / 18.0 * 60))
        if clock + travel + place.duration_min > ctx.minutes:
            continue
        chosen.append((place, ""))
        spent += place.price_pp or 0
        clock += travel + place.duration_min
        prev = place
    return chosen


def _route_order(places: list[Place]) -> list[Place]:
    """Nearest-neighbour order so nearby stops are visited together (keeps the first place first)"""
    if len(places) < 3:
        return places
    left, route = places[1:], [places[0]]
    while left:
        last = route[-1]
        nxt = min(left, key=lambda p: haversine_km(last, p) if haversine_km(last, p) is not None else 1e9)
        left.remove(nxt)
        route.append(nxt)
    return route


def _names(stops: Stops) -> str:
    return ", ".join(p.name for p, _ in stops)


def _themes(shortlist: list[Place], ctx: PlanContext) -> list[tuple[str, str, str, list[Place], float]]:
    """(title, tagline, key, candidate order, max cost per person)"""
    cap = ctx.budget_per_person
    return [
        ("Best match", "The places that fit your request best", "best", sorted(shortlist, key=lambda p: -p.score), cap),
        (
            "Budget friendly",
            "Great value, kept well within budget",
            "budget",
            sorted(shortlist, key=lambda p: ((p.price_pp if p.price_pp is not None else 1e9), -p.score)),
            cap * 0.6,
        ),
        ("Top rated", "The highest-rated places on your shortlist", "rated", sorted(shortlist, key=lambda p: (-(p.rating or 0), -p.score)), cap),
        ("Quick and easy", "Shorter stops, more relaxed pace", "quick", sorted(shortlist, key=lambda p: (p.duration_min, -p.score)), cap),
    ]


def local_plans(shortlist: list[Place], ctx: PlanContext, exclude: Optional[set[frozenset[str]]] = None, limit: int = 4) -> list[dict[str, Any]]:
    """Up to `limit` distinct themed plans, skipping any stop-set already in `exclude`.
    If a theme would repeat an earlier plan (e.g. every place costs the same), its candidate order is
    rotated so the plan starts from a different place."""
    seen = set(exclude or ())
    plans: list[dict[str, Any]] = []
    for title, tagline, key, order, cap in _themes(shortlist, ctx):
        if len(plans) >= limit:
            break
        for shift in range(min(len(order), 6)):
            stops = _greedy(order[shift:] + order[:shift], ctx, cap)
            if not stops:
                break
            stops = [(p, "") for p in _route_order([p for p, _ in stops])]
            ids = frozenset(p.id for p, _ in stops)
            if ids in seen:
                continue
            plan = build_plan(
                stops,
                ctx,
                title=title,
                tagline=tagline,
                why=f"{tagline}: {_names(stops)}.",
                source="local",
                plan_id=f"local-{key}",
            )
            if plan:
                seen.add(ids)
                plans.append(plan)
                break
    return plans

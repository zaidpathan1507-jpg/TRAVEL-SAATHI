"""
Retriever for experiences stored in the team's backend database (experiences table / catalog).
"""
from __future__ import annotations

import json
import logging
from typing import List

from scripts.recommendation.schemas import (
    Capacity,
    Cost,
    LocalKnowledge,
    NormalizedPlace,
    OpeningHours,
)

logger = logging.getLogger("anvesha.recommendation.db_retriever")

# The SQLite catalog is the Pune catalog and stores positions on a 0-100 map grid
# (same grid/formula as frontend/src/lib/geo.ts -> ptToLatLng).
CATALOG_CITY = "Pune"


def grid_to_latlng(x: float, y: float) -> tuple[float, float]:
    """0-100 map-grid position -> (latitude, longitude) on the real Pune map"""
    lat = round(18.57 - (y / 100.0) * 0.092, 4)
    lng = round(73.79 + (x / 100.0) * 0.136, 4)
    return lat, lng


def from_db_experience(exp: dict) -> NormalizedPlace:
    tags = exp.get("tags") or []
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except Exception:
            tags = [t.strip() for t in tags.split(",") if t.strip()]

    category = exp.get("category", "")
    categories = [category] if category else []

    price = exp.get("price")
    cost = Cost(
        min_inr=float(price) if price is not None else None,
        max_inr=float(price) if price is not None else None,
        basis="per_person",
        is_free=(price == 0) if price is not None else None,
    )

    indoor = exp.get("indoor", False)
    address_parts = [exp.get("area", ""), exp.get("address", ""), CATALOG_CITY]
    address = ", ".join([p for p in address_parts if p])

    lat = lng = None
    if exp.get("x") is not None and exp.get("y") is not None:
        lat, lng = grid_to_latlng(float(exp["x"]), float(exp["y"]))

    slots = exp.get("slots") or []
    max_cap = slots[0].get("capacity") if slots else None

    return NormalizedPlace(
        id=f"db:{exp['id']}",
        source="mumbai",
        source_id=str(exp["id"]),
        name=exp.get("title") or exp.get("name") or "Experience",
        address=address or None,
        latitude=lat,
        longitude=lng,
        categories=categories,
        tags=list(tags),
        description=exp.get("about") or exp.get("tagline") or "",
        cost=cost,
        capacity=Capacity(max_people=max_cap),
        duration_minutes=exp.get("duration_min"),
        rating=float(exp["rating"]) if exp.get("rating") is not None else None,
        review_count=int(exp.get("reviews", 0)),
        opening_hours=OpeningHours(
            open_now=True if indoor else None,
            hours_text=f"Duration: {exp.get('duration_min', 60)} mins",
        ),
        local=LocalKnowledge(
            local_tips=[exp.get("badge")] if exp.get("badge") else []
        ),
    )


def fetch_db_candidates() -> List[NormalizedPlace]:
    """Fetches seeded database experiences from catalog / database."""
    try:
        from catalog import experience_catalog, refresh_catalog
        if not experience_catalog:
            refresh_catalog()
        if experience_catalog:
            return [from_db_experience(exp) for exp in experience_catalog.values()]
    except Exception as exc:
        logger.warning("Failed to fetch catalog experiences (%s)", exc)
    return []

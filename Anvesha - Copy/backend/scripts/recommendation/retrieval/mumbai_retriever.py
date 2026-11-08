"""
Mumbai candidate retriever: loads raw provider records from JSON dataset or MySQL database,
and normalizes them into NormalizedPlace instances.
"""
from __future__ import annotations

import json
import logging
import math
from functools import lru_cache

from scripts.recommendation.config import settings
from scripts.recommendation.normalization.normalized_place import from_mumbai_record
from scripts.recommendation.schemas import Intent, NormalizedPlace

logger = logging.getLogger("anvesha.recommendation.mumbai_retriever")


def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@lru_cache(maxsize=1)
def _load_json_dataset(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("places", [])


def _load_raw_records() -> list[dict]:
    if settings.MUMBAI_DATA_SOURCE == "mysql":
        try:
            from scripts.recommendation.retrieval.mysql_retriever import fetch_mumbai_places_raw

            return fetch_mumbai_places_raw()
        except Exception as exc:
            logger.warning("Failed to load from MySQL (%s); falling back to Mumbai JSON dataset.", exc)
    return _load_json_dataset(settings.MUMBAI_DATA_PATH)


def retrieve_mumbai_candidates(intent: Intent, limit: int = 100) -> list[NormalizedPlace]:
    raw_records = _load_raw_records()
    places = [from_mumbai_record(r) for r in raw_records]
    try:
        from scripts.recommendation.retrieval.db_retriever import fetch_db_candidates

        places.extend(fetch_db_candidates())
    except Exception as exc:
        logger.debug("Failed to append DB candidates: %s", exc)

    if intent.city:
        city = intent.city.strip().lower()
        city_matches = [p for p in places if city in (p.address or "").lower()]
        places = city_matches  # a city with no local data yields no results (never another city's places)

    if intent.latitude is not None and intent.longitude is not None:
        radius_km = intent.radius_km or 5.0
        in_range = []
        for p in places:
            if p.latitude is None or p.longitude is None:
                in_range.append(p)
                continue
            d = _haversine_km(intent.latitude, intent.longitude, p.latitude, p.longitude)
            if d <= radius_km * 2.5:
                in_range.append(p)
        if in_range:
            places = in_range

    if intent.categories:
        wanted = {c.lower() for c in intent.categories}

        def _matches_category(p: NormalizedPlace) -> bool:
            place_terms = {c.lower() for c in p.categories} | {t.lower() for t in p.tags}
            return bool(wanted & place_terms) or any(
                w in " ".join(place_terms) for w in wanted
            )

        category_matches = [p for p in places if _matches_category(p)]
        if category_matches:
            places = category_matches

    logger.info("Mumbai candidate retrieval: %d candidates for intent categories=%s", len(places), intent.categories)
    return places[:limit]

"""
Google Places API (New) candidate retrieval for General recommendation mode.

Calls Google Places Text Search (https://places.googleapis.com/v1/places:searchText)
with field masks when GOOGLE_PLACES_API_KEY is configured,
or returns structured mock candidate places when key is absent or on network error.
"""
from __future__ import annotations

import logging
import os
import time
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from scripts.recommendation.schemas import Intent, NormalizedPlace

logger = logging.getLogger("anvesha.google_places")

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.types",
    "places.primaryType",
    "places.businessStatus",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.currentOpeningHours",
    "places.googleMapsUri",
    "nextPageToken",
])

CATEGORY_TO_TYPE = {
    "cafe": "cafe",
    "food": "restaurant",
    "street_food": "restaurant",
    "shopping": "shopping_mall",
    "handicrafts": "store",
    "heritage": "tourist_attraction",
    "culture": "museum",
    "religious": "place_of_worship",
    "nightlife": "bar",
    "nature": "park",
    "entertainment": "tourist_attraction",
}

CITY_COORDINATES = {
    "pune": (18.5204, 73.8567),
    "mumbai": (19.0760, 72.8777),
    "goa": (15.2993, 74.1240),
    "jaipur": (26.9124, 75.7873),
    "delhi": (28.6139, 77.2090),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "udaipur": (24.5854, 73.7125),
    "kochi": (9.9312, 76.2673),
    "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "varanasi": (25.3176, 82.9739),
    "mysuru": (12.2958, 76.6394),
    "nashik": (19.9975, 73.7898),
    "lonavala": (18.7557, 73.4091),
}

_query_cache: dict[str, tuple[float, list[dict]]] = {}


def _build_text_query(intent: Intent) -> str:
    parts = []
    if intent.categories:
        parts.append(" ".join(intent.categories).replace("_", " "))
    else:
        parts.append("tourist attractions and popular places")
    if intent.location_text:
        parts.append(f"in {intent.location_text}")
    elif intent.city:
        parts.append(f"in {intent.city}")
    return " ".join(parts)


def _cache_key(intent: Intent) -> str:
    return f"{_build_text_query(intent)}|{intent.latitude}|{intent.longitude}|{intent.radius_km}"


def _call_text_search(intent: Intent, page_token: str | None = None) -> dict:
    from scripts.recommendation.config import settings

    api_key = os.getenv("GOOGLE_PLACES_API_KEY") or settings.GOOGLE_PLACES_API_KEY or ""
    if not api_key:
        raise ValueError("GOOGLE_PLACES_API_KEY is missing in backend .env configuration.")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body: dict = {
        "textQuery": _build_text_query(intent),
        "pageSize": 20,
    }
    lat = intent.latitude
    lng = intent.longitude
    if lat is None or lng is None:
        city_key = (intent.city or "").lower()
        if city_key in CITY_COORDINATES:
            lat, lng = CITY_COORDINATES[city_key]

    if lat is not None and lng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": (intent.radius_km or settings.GOOGLE_PLACES_DEFAULT_RADIUS_M / 1000) * 1000,
            }
        }
    if len(intent.categories) == 1 and intent.categories[0] in CATEGORY_TO_TYPE:
        body["includedType"] = CATEGORY_TO_TYPE[intent.categories[0]]
    if page_token:
        body["pageToken"] = page_token

    logger.info("Calling Google Places API (New searchText) query='%s' center=(%s, %s)", body["textQuery"], lat, lng)
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(TEXT_SEARCH_URL, headers=headers, json=body)
        if resp.status_code != 200:
            error_text = resp.text
            logger.error("Google Places API error HTTP %d: %s", resp.status_code, error_text)
            raise RuntimeError(f"Google Places API HTTP {resp.status_code}: {error_text}")
        return resp.json()


def retrieve_google_candidates(intent: Intent, limit: int | None = None) -> list[NormalizedPlace]:
    from scripts.recommendation.config import settings
    from scripts.recommendation.normalization.normalized_place import from_google_place

    limit = limit or settings.GOOGLE_PLACES_CANDIDATE_LIMIT
    api_key = os.getenv("GOOGLE_PLACES_API_KEY") or settings.GOOGLE_PLACES_API_KEY
    if not api_key:
        raise ValueError("GOOGLE_PLACES_API_KEY is missing. Please configure GOOGLE_PLACES_API_KEY in backend/.env")

    cache_key = _cache_key(intent)
    cached = _query_cache.get(cache_key)
    if cached and (time.time() - cached[0]) < settings.GOOGLE_PLACES_RESULT_CACHE_TTL_SECONDS:
        raw_places = cached[1]
    else:
        raw_places: list[dict] = []
        page_token = None
        while len(raw_places) < limit:
            data = _call_text_search(intent, page_token)
            fetched = data.get("places", [])
            raw_places.extend(fetched)
            page_token = data.get("nextPageToken")
            if not page_token or not fetched:
                break
        _query_cache[cache_key] = (time.time(), raw_places)

    normalized = [from_google_place(p) for p in raw_places[:limit]]
    return normalized


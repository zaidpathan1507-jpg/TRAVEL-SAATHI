"""
Gemini Intent Extraction & Natural Language Query Understanding.

Converts natural language user query into structured Intent object.
Uses Gemini structured output (google-genai) when GEMINI_API_KEY is present,
and falls back cleanly to deterministic rule-based intent parsing when absent or on API failure.
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from scripts.recommendation.schemas import Intent

logger = logging.getLogger("anvesha.gemini_intent")

# Known Mumbai-area keywords used to (a) resolve city for engine routing and
# (b) resolve a rough lat/lon centroid in the rule-based fallback.
MUMBAI_AREAS: dict[str, tuple[float, float]] = {
    "colaba": (18.9067, 72.8147),
    "fort": (18.9345, 72.8353),
    "churchgate": (18.9322, 72.8264),
    "marine drive": (18.9440, 72.8235),
    "bandra": (19.0596, 72.8295),
    "andheri": (19.1197, 72.8468),
    "juhu": (19.1075, 72.8263),
    "dadar": (19.0176, 72.8478),
    "worli": (19.0176, 72.8162),
    "powai": (19.1176, 72.9060),
    "cst": (18.9402, 72.8355),
    "kurla": (19.0728, 72.8826),
    "mumbai": (19.0760, 72.8777),
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "shopping": ["shopping", "shop", "market", "bazaar", "mall"],
    "handicrafts": ["handicraft", "handicrafts", "souvenir", "souvenirs", "craft"],
    "food": ["food", "eat", "eating", "cuisine", "restaurant", "restaurants"],
    "street_food": ["street food", "chaat", "vada pav", "street snacks"],
    "cafe": ["cafe", "coffee", "cafes"],
    "heritage": ["heritage", "historic", "historical", "monument", "fort"],
    "culture": ["culture", "cultural", "museum", "art", "gallery"],
    "religious": ["temple", "mosque", "church", "spiritual", "religious", "shrine"],
    "nightlife": ["nightlife", "bar", "pub", "club"],
    "nature": ["park", "garden", "beach", "nature"],
    "entertainment": ["entertainment", "fun", "amusement", "activities"],
}

PREFERENCE_KEYWORDS = [
    "local", "authentic", "budget", "hidden", "offbeat", "family-friendly",
    "family friendly", "quiet", "popular", "must-visit", "cheap", "luxury"
]


def _extract_budget(text: str):
    from scripts.recommendation.schemas import Budget, BudgetBasis

    m = re.search(r"(?:₹|rs\.?|inr)\s?(\d{2,7})", text, re.IGNORECASE)
    if not m:
        m = re.search(r"(\d{2,7})\s?(?:rupees|rs\.?|inr|₹)", text, re.IGNORECASE)
    if not m:
        return None
    amount = float(m.group(1))
    basis = BudgetBasis.UNKNOWN
    if re.search(r"\beach\b|\bper person\b|\bper head\b", text, re.IGNORECASE):
        basis = BudgetBasis.PER_PERSON
    elif re.search(r"\btotal\b|\bcombined\b|\baltogether\b", text, re.IGNORECASE):
        basis = BudgetBasis.TOTAL
    return Budget(amount=amount, currency="INR", basis=basis, is_max=True)


def _extract_group_size(text: str) -> int | None:
    m = re.search(r"\b(\d{1,2})\s*(?:people|persons|pax|of us|friends|members)\b", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    m = re.search(r"\bwe are\s*(\d{1,2})\b", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if re.search(r"\bjust me\b|\balone\b|\bsolo\b", text, re.IGNORECASE):
        return 1
    return None


def _extract_duration_minutes(text: str) -> int | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*hours?", text, re.IGNORECASE)
    if m:
        return int(float(m.group(1)) * 60)
    m = re.search(r"(\d+)\s*(?:min|minutes)", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


CITY_CENTROIDS: dict[str, tuple[float, float]] = {
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "delhi": (28.6139, 77.2090),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "goa": (15.2993, 74.1240),
    "jaipur": (26.9124, 75.7873),
    "hyderabad": (17.3850, 78.4867),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
}


def _extract_location(text: str) -> tuple[str | None, str | None, float | None, float | None]:
    lowered = text.lower()
    for area, (lat, lon) in MUMBAI_AREAS.items():
        if area in lowered:
            location_text = area.title() if area != "mumbai" else "Mumbai"
            city = "Mumbai"
            return location_text, city, lat, lon
    for city_key, (lat, lon) in CITY_CENTROIDS.items():
        if re.search(r"\b" + re.escape(city_key) + r"\b", lowered):
            cname = city_key.title()
            return cname, cname, lat, lon
    m = re.search(
        r"\b(?:in|near|around|visiting|to|at)\s+([A-Za-z\s]{2,40}?)"
        r"(?=\s+(?:for|with|to|at|during|and)\b|[,.!?]|$)",
        text,
        re.IGNORECASE,
    )
    if m:
        loc = m.group(1).strip().rstrip(".,").title()
        return loc, loc, None, None
    return None, None, None, None


def _extract_categories(text: str) -> list[str]:
    lowered = text.lower()
    found = []
    for canonical, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            found.append(canonical)
    return found


def _extract_preferences(text: str) -> list[str]:
    lowered = text.lower()
    return [p for p in PREFERENCE_KEYWORDS if p in lowered]


def _extract_traveller_type(text: str) -> str | None:
    lowered = text.lower()
    for t in ["family", "solo", "couple", "friends", "business", "senior", "kids"]:
        if t in lowered:
            return t
    return None


def extract_intent_rule_based(query: str) -> Intent:
    """Deterministic, rule-based fallback intent extraction."""
    from scripts.recommendation.schemas import Intent

    location_text, city, lat, lon = _extract_location(query)
    return Intent(
        raw_query=query,
        location_text=location_text,
        latitude=lat,
        longitude=lon,
        radius_km=3.0 if lat is not None else None,
        city=city,
        categories=_extract_categories(query),
        budget=_extract_budget(query),
        group_size=_extract_group_size(query),
        duration_minutes=_extract_duration_minutes(query),
        traveller_type=_extract_traveller_type(query),
        preferences=_extract_preferences(query),
        time_constraint="open now" if "open now" in query.lower() else None,
        extraction_method="rule_based",
        confidence=0.55,
    )


GEMINI_SYSTEM_PROMPT = """You convert a traveller's natural-language request into structured JSON.
Extract ONLY what is explicitly stated or very strongly implied. Never invent a location,
budget, or group size that is not present in the text. Use null for anything unknown.
Return JSON matching exactly this shape (types matter):
{
  "location_text": string|null,
  "city": string|null,
  "categories": string[],
  "budget": {"amount": number|null, "currency": "INR", "basis": "per_person"|"total"|"unknown", "is_max": boolean} | null,
  "group_size": integer|null,
  "duration_minutes": integer|null,
  "traveller_type": string|null,
  "preferences": string[],
  "time_constraint": string|null
}"""


def extract_intent_gemini(query: str) -> Intent:
    """
    Calls Gemini API with structured output.
    Falls back gracefully to extract_intent_rule_based if key is absent or request fails.
    """
    from scripts.recommendation.config import settings
    from scripts.recommendation.schemas import Budget, BudgetBasis, Intent

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return extract_intent_rule_based(query)

    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{GEMINI_SYSTEM_PROMPT}\n\nUser request: {query}",
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(response.text)

        budget = None
        if data.get("budget"):
            b = data["budget"]
            budget = Budget(
                amount=b.get("amount"),
                currency=b.get("currency") or "INR",
                basis=BudgetBasis(b.get("basis") or "unknown"),
                is_max=b.get("is_max", True),
            )

        rb = extract_intent_rule_based(query)
        return Intent(
            raw_query=query,
            location_text=data.get("location_text") or rb.location_text,
            latitude=rb.latitude,
            longitude=rb.longitude,
            radius_km=rb.radius_km,
            city=data.get("city") or rb.city,
            categories=data.get("categories") or rb.categories,
            budget=budget or rb.budget,
            group_size=data.get("group_size") or rb.group_size,
            duration_minutes=data.get("duration_minutes") or rb.duration_minutes,
            traveller_type=data.get("traveller_type") or rb.traveller_type,
            preferences=data.get("preferences") or rb.preferences,
            time_constraint=data.get("time_constraint") or rb.time_constraint,
            extraction_method="gemini",
            confidence=0.9,
        )
    except Exception as exc:
        logger.warning("Gemini intent extraction failed (%s); falling back to rule-based.", exc)
        return extract_intent_rule_based(query)


def extract_intent(query: str) -> Intent:
    """Main intent entry point."""
    from scripts.recommendation.config import settings

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if api_key:
        return extract_intent_gemini(query)
    return extract_intent_rule_based(query)

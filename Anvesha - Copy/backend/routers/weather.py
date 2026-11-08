"""Current weather for the places on the traveller's itinerary (OpenWeather).

The traveller arrives "now", so each stop gets the current conditions at its own coordinates, plus the
chance of rain from the next forecast slot."""
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger("anvesha.weather")

CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
CACHE_TTL_SECONDS = 10 * 60
KEY_NAMES = ("OPENWEATHER_API_KEY", "OPENWEATHERMAP_API_KEY", "OPEN_WEATHER_API_KEY", "OPENWEATHER_KEY")

# (rounded lat, rounded lng) -> (fetched at, current, next forecast slot). Nearby stops share one lookup (~1 km).
_cache: Dict[tuple, tuple] = {}


class WeatherStop(BaseModel):
    id: str = Field(max_length=200)
    name: str = Field("", max_length=200)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class WeatherRequest(BaseModel):
    stops: List[WeatherStop] = Field(min_length=1, max_length=10)


def _api_key() -> str:
    for name in KEY_NAMES:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def _get(client: httpx.Client, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    resp = client.get(url, params=params)
    if resp.status_code == 200:
        return resp.json()
    try:
        message = str(resp.json().get("message", ""))
    except ValueError:
        message = ""
    logger.warning("OpenWeather HTTP %s: %s", resp.status_code, message[:200])
    if resp.status_code == 401:
        message = "OpenWeather rejected the API key (a new key can take up to a couple of hours to activate)"
    elif resp.status_code == 429:
        message = "OpenWeather rate limit reached, try again in a minute"
    raise HTTPException(status_code=502, detail=f"Weather service error ({resp.status_code}): {message[:200] or 'no details'}")


def _lookup(lat: float, lng: float, key: str) -> tuple:
    cache_key = (round(lat, 2), round(lng, 2))
    hit = _cache.get(cache_key)
    if hit and time.time() - hit[0] < CACHE_TTL_SECONDS:
        return hit[1], hit[2]

    params = {"lat": lat, "lon": lng, "units": "metric", "appid": key}
    with httpx.Client(timeout=10.0) as client:
        current = _get(client, CURRENT_URL, params)
        try:
            forecast = _get(client, FORECAST_URL, {**params, "cnt": 1})
            slot = (forecast.get("list") or [None])[0]
        except HTTPException:
            slot = None  # rain chance is a bonus; current conditions are enough

    _cache[cache_key] = (time.time(), current, slot)
    return current, slot


def _condition_type(code: int) -> str:
    """OpenWeather condition id -> coarse type the frontend maps to an icon"""
    if 200 <= code < 300:
        return "THUNDERSTORM"
    if 300 <= code < 400:
        return "DRIZZLE"
    if 500 <= code < 600:
        return "RAIN"
    if 600 <= code < 700:
        return "SNOW"
    if 700 <= code < 800:
        return "FOG"
    if code == 800:
        return "CLEAR"
    if code in (801, 802):
        return "PARTLY_CLOUDY"
    if code in (803, 804):
        return "CLOUDY"
    return "UNKNOWN"


def _num(obj: Any, *path: str) -> Optional[float]:
    for p in path:
        obj = obj.get(p) if isinstance(obj, dict) else None
    return float(obj) if isinstance(obj, (int, float)) else None


def _summary(stop: WeatherStop, current: Dict[str, Any], slot: Optional[Dict[str, Any]], now: datetime) -> Dict[str, Any]:
    w = (current.get("weather") or [{}])[0]
    wind_ms = _num(current, "wind", "speed")
    pop = _num(slot, "pop") if slot else None
    observed = current.get("dt")
    return {
        "id": stop.id,
        "name": stop.name,
        "lat": stop.lat,
        "lng": stop.lng,
        "at": now.isoformat(),
        "forecastFor": datetime.fromtimestamp(observed, tz=timezone.utc).isoformat() if isinstance(observed, (int, float)) else None,
        "condition": str(w.get("description") or w.get("main") or "Unknown").capitalize(),
        "type": _condition_type(int(w.get("id") or 0)),
        "isDaytime": str(w.get("icon", "01d")).endswith("d"),
        "tempC": round(_num(current, "main", "temp"), 1) if _num(current, "main", "temp") is not None else None,
        "feelsLikeC": round(_num(current, "main", "feels_like"), 1) if _num(current, "main", "feels_like") is not None else None,
        "rainChance": round(pop * 100) if pop is not None else None,
        "rainMm": _num(current, "rain", "1h") or 0.0,
        "windKph": round(wind_ms * 3.6) if wind_ms is not None else None,
        "humidity": _num(current, "main", "humidity"),
    }


@router.post("/weather")
def stop_weather(request: WeatherRequest) -> Dict[str, Any]:
    """Weather right now at each stop's own location"""
    key = _api_key()
    if not key:
        raise HTTPException(status_code=503, detail=f"No weather API key configured (set {KEY_NAMES[0]} in backend/.env)")

    now = datetime.now(timezone.utc)
    results: List[Dict[str, Any]] = []
    for stop in request.stops:
        try:
            current, slot = _lookup(stop.lat, stop.lng, key)
        except HTTPException:
            raise
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Weather service unreachable: {type(exc).__name__}") from exc
        results.append(_summary(stop, current, slot, now))
    return {"stops": results, "source": "OpenWeather", "asOf": now.isoformat()}

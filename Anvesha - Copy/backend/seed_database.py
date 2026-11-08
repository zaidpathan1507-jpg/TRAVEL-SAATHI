"""
Seed the SQLite database from the JSON files in database/seed/.

    cd backend && python seed_database.py

The API also calls ensure_seeded() on startup, so a fresh checkout works without running this by hand.
"""
import json
import os
from datetime import timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from database import get_db, init_db, json_dumps, utcnow
from models import (
    AnalyticsDaily,
    Availability,
    Booking,
    Experience,
    ExperienceSlot,
    Provider,
    ProviderInsight,
    Review,
)

SEED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "database", "seed")

# Present in the seed data; if it is missing the database holds something else (e.g. old demo rows)
MARKER_EXPERIENCE_ID = "pune-food-walk"


def load_json_file(name: str) -> Optional[Any]:
    """Load database/seed/<name>.json, or None if the file does not exist"""
    path = os.path.join(SEED_DIR, name + ".json")
    if not os.path.exists(path):
        print(f"{name}.json not found, skipping")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def clear_all(db: Session) -> None:
    """Delete every row, children before parents"""
    for model in (Booking, Availability, ExperienceSlot, Review, Experience, AnalyticsDaily, ProviderInsight, Provider):
        db.query(model).delete()
    db.flush()


def seed_providers(db: Session, data: List[Dict[str, Any]]) -> int:
    for p in data:
        db.add(
            Provider(
                id=p["id"],
                name=p["name"],
                host=p["host"],
                verified=bool(p.get("verified", False)),
                response_min=p.get("responseMin", 30),
                since=p.get("since"),
            )
        )
    return len(data)


def seed_experiences(db: Session, data: List[Dict[str, Any]]) -> int:
    """Experiences and their booking slots (slots are embedded in each experience)"""
    base = utcnow()
    for i, e in enumerate(data):
        db.add(
            Experience(
                id=e["id"],
                provider_id=e["providerId"],
                title=e["title"],
                tagline=e.get("tagline"),
                category=e["category"],
                tags=json_dumps(e.get("tags", [])),
                image_url=e.get("image"),
                area=e.get("area"),
                address=e.get("address"),
                map_x=e.get("x", 50.0),
                map_y=e.get("y", 50.0),
                duration_min=e["durationMin"],
                price=e["price"],
                child_price=e.get("childPrice"),
                rating=e.get("rating", 0.0),
                reviews_count=e.get("reviews", 0),
                indoor=bool(e.get("indoor", False)),
                family_friendly=bool(e.get("familyFriendly", True)),
                wheelchair=bool(e.get("wheelchair", False)),
                vegetarian=bool(e.get("vegetarian", False)),
                walking=e.get("walking", "medium"),
                languages=json_dumps(e.get("languages", [])),
                about=e.get("about"),
                included=json_dumps(e.get("included", [])),
                highlights=json_dumps(e.get("highlights", [])),
                accessibility=json_dumps(e.get("accessibility", [])),
                badge=e.get("badge"),
                created_at=base + timedelta(milliseconds=i),  # keeps the catalog in file order
            )
        )
        for s in e.get("slots", []):
            db.add(
                ExperienceSlot(
                    experience_id=e["id"],
                    time_min=s["time"],
                    capacity=s["capacity"],
                    seats_left=s.get("left", s["capacity"]),
                )
            )
    return len(data)


def seed_reviews(db: Session, data: List[Dict[str, Any]], known: set) -> int:
    n = 0
    for r in data:
        if r["experienceId"] not in known:
            continue
        db.add(
            Review(
                experience_id=r["experienceId"],
                name=r["name"],
                from_city=r.get("from"),
                rating=r["rating"],
                text=r["text"],
                when_label=r.get("when"),
                traveler_type=r.get("type"),
            )
        )
        n += 1
    return n


def seed_availability(db: Session, data: List[Dict[str, Any]], known: set) -> int:
    seen = set()
    for a in data:
        key = (a["experienceId"], a["date"], a["time"])
        if a["experienceId"] not in known or key in seen:
            continue
        seen.add(key)
        db.add(
            Availability(
                experience_id=a["experienceId"],
                date=a["date"],
                time_min=a["time"],
                capacity=a["capacity"],
                booked=a.get("booked", 0),
                enabled=bool(a.get("enabled", True)),
            )
        )
    return len(seen)


def seed_bookings(db: Session, data: List[Dict[str, Any]], known: set) -> int:
    now = utcnow()
    n = 0
    for i, b in enumerate(data):
        if b["expId"] not in known:
            continue
        db.add(
            Booking(
                id=b["id"],
                checkout_id=b.get("checkoutId"),
                customer=b["customer"],
                from_city=b.get("from"),
                experience_id=b["expId"],
                date=b["date"],
                time_min=b["time"],
                adults=b["adults"],
                children=b.get("children", 0),
                amount=b["amount"],
                payment=b["payment"],
                status=b["status"],
                traveler_type=b.get("travelerType"),
                note=b.get("note"),
                is_new=bool(b.get("isNew", False)),
                # file order = newest first, so earlier rows get later timestamps
                created_at=now - timedelta(minutes=i),
            )
        )
        n += 1
    return n


def seed_analytics(db: Session, data: Any) -> int:
    """analytics.json holds one object per provider: {providerId, series:{days,views,bookings,revenue}, ...}.
    The daily series goes to analytics_daily; every other key (popular, travelerMix, peak, demand)
    is stored as JSON in provider_insights."""
    items = data if isinstance(data, list) else [data]
    n = 0
    for item in items:
        provider_id = item["providerId"]
        series = item.get("series", {})
        days = series.get("days", [])
        for i, day in enumerate(days):
            db.add(
                AnalyticsDaily(
                    provider_id=provider_id,
                    day=day,
                    views=series["views"][i],
                    bookings=series["bookings"][i],
                    revenue=series["revenue"][i],
                )
            )
            n += 1
        insights = {k: v for k, v in item.items() if k not in ("providerId", "series")}
        db.add(ProviderInsight(provider_id=provider_id, data=json.dumps(insights, ensure_ascii=False)))
    return n


def seed_all(db: Session, clear: bool = True) -> Dict[str, int]:
    """Load every seed file into the database (committed at the end)"""
    if clear:
        clear_all(db)

    counts: Dict[str, int] = {}

    providers = load_json_file("providers")
    if providers:
        counts["providers"] = seed_providers(db, providers)

    experiences = load_json_file("experiences")
    if experiences:
        counts["experiences"] = seed_experiences(db, experiences)
    known = {e["id"] for e in experiences or []}

    reviews = load_json_file("reviews")
    if reviews:
        counts["reviews"] = seed_reviews(db, reviews, known)

    availability = load_json_file("availability")
    if availability:
        counts["availability"] = seed_availability(db, availability, known)

    bookings = load_json_file("bookings")
    if bookings:
        counts["bookings"] = seed_bookings(db, bookings, known)

    analytics = load_json_file("analytics")
    if analytics:
        counts["analytics_days"] = seed_analytics(db, analytics)

    db.commit()
    return counts


def ensure_seeded(db: Session) -> bool:
    """Seed on first run. Also replaces the placeholder rows an older seed script left behind
    (ids exp1..exp5) that the React app cannot use. Returns True if it (re)seeded."""
    has_seed = db.query(Experience).filter(Experience.id == MARKER_EXPERIENCE_ID).first() is not None
    if has_seed:
        return False
    counts = seed_all(db, clear=True)
    print("Seeded database:", ", ".join(f"{v} {k}" for k, v in counts.items()))
    return True


def main() -> None:
    init_db()
    with get_db() as db:
        counts = seed_all(db, clear=True)
    print("Database seeded:", ", ".join(f"{v} {k}" for k, v in counts.items()))


if __name__ == "__main__":
    main()

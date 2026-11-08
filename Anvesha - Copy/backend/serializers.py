"""Database rows -> the JSON shapes the React app (frontend/src/lib/types.ts) expects."""
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from database import json_loads
from models import Booking, Experience, ExperienceSlot, Provider, Review


def to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(word.capitalize() for word in rest)


def camelize_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    return {to_camel(k): v for k, v in data.items()}


def provider_payload(provider: Optional[Provider], fallback_id: str) -> Dict[str, Any]:
    if provider is None:
        return {"id": fallback_id, "name": fallback_id, "host": "", "verified": False, "responseMin": 30, "since": 0}
    return {
        "id": provider.id,
        "name": provider.name,
        "host": provider.host,
        "verified": bool(provider.verified),
        "responseMin": provider.response_min,
        "since": provider.since or 0,
    }


def experience_payload(
    exp: Experience,
    provider: Optional[Provider],
    slots: List[ExperienceSlot],
    reviews: List[Review],
) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": exp.id,
        "title": exp.title,
        "tagline": exp.tagline or "",
        "category": exp.category,
        "tags": json_loads(exp.tags),
        "area": exp.area or "",
        "address": exp.address or "",
        "x": exp.map_x,
        "y": exp.map_y,
        "durationMin": exp.duration_min,
        "price": exp.price,
        "rating": exp.rating,
        "reviews": exp.reviews_count,
        "slots": [
            {"time": s.time_min, "left": s.seats_left, "capacity": s.capacity}
            for s in sorted(slots, key=lambda s: s.time_min)
        ],
        "indoor": bool(exp.indoor),
        "familyFriendly": bool(exp.family_friendly),
        "wheelchair": bool(exp.wheelchair),
        "vegetarian": bool(exp.vegetarian),
        "walking": exp.walking,
        "languages": json_loads(exp.languages),
        "provider": provider_payload(provider, exp.provider_id),
        "about": exp.about or "",
        "included": json_loads(exp.included),
        "highlights": json_loads(exp.highlights),
        "accessibility": json_loads(exp.accessibility),
        "reviewsList": [
            {
                "name": r.name,
                "from": r.from_city or "",
                "rating": r.rating,
                "text": r.text,
                "when": r.when_label or "",
                "type": r.traveler_type or "Family",
            }
            for r in reviews
        ],
    }
    if exp.child_price is not None:
        out["childPrice"] = exp.child_price
    if exp.image_url:
        out["image"] = exp.image_url
    if exp.badge:
        out["badge"] = exp.badge
    return out


def load_experiences(db: Session, only_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load experiences with their provider, slots and reviews using a fixed number of queries"""
    query = db.query(Experience)
    if only_id is not None:
        query = query.filter(Experience.id == only_id)
    experiences = query.order_by(Experience.created_at, Experience.id).all()
    if not experiences:
        return []

    ids = [e.id for e in experiences]
    providers = {p.id: p for p in db.query(Provider).all()}

    slots_by_exp: Dict[str, List[ExperienceSlot]] = {}
    for s in db.query(ExperienceSlot).filter(ExperienceSlot.experience_id.in_(ids)).all():
        slots_by_exp.setdefault(s.experience_id, []).append(s)

    reviews_by_exp: Dict[str, List[Review]] = {}
    for r in db.query(Review).filter(Review.experience_id.in_(ids)).order_by(Review.id).all():
        reviews_by_exp.setdefault(r.experience_id, []).append(r)

    return [
        experience_payload(e, providers.get(e.provider_id), slots_by_exp.get(e.id, []), reviews_by_exp.get(e.id, []))
        for e in experiences
    ]


def booking_payload(b: Booking) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": b.id,
        "checkoutId": b.checkout_id,
        "customer": b.customer,
        "from": b.from_city or "",
        "expId": b.experience_id,
        "date": b.date,
        "time": b.time_min,
        "adults": b.adults,
        "children": b.children,
        "amount": b.amount,
        "payment": b.payment,
        "status": b.status,
        "travelerType": b.traveler_type or "Family",
        "isNew": bool(b.is_new),
    }
    if b.note:
        out["note"] = b.note
    return out

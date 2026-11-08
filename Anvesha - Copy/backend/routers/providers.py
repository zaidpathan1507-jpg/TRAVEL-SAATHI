import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from ai_engine import CATEGORY_META
from catalog import refresh_catalog
from database import get_db, json_dumps, json_loads, utcnow
from models import (
    AnalyticsDaily,
    Availability,
    Experience,
    ExperienceSlot,
    Provider,
    ProviderInsight,
)
from schemas import AvailabilityRequest, PublishExperienceRequest
from serializers import load_experiences

router = APIRouter()

DATE_FORMAT = "%Y-%m-%d"
EXPERIENCE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def today() -> str:
    """Today's date as YYYY-MM-DD"""
    return utcnow().strftime(DATE_FORMAT)


def slot_payload(a: Availability) -> Dict[str, Any]:
    return {"time": a.time_min, "capacity": a.capacity, "booked": a.booked, "enabled": bool(a.enabled)}


@router.get("/providers/{provider_id}/availability")
def get_provider_availability(
    provider_id: str,
    from_date: Optional[str] = Query(None, alias="from"),
    days: int = Query(14),
) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
    """Calendar for a provider: { experienceId: { 'YYYY-MM-DD': [ {time, capacity, booked, enabled} ] } }"""
    start = from_date or today()
    try:
        start_day = datetime.strptime(start, DATE_FORMAT)
    except ValueError:
        raise HTTPException(status_code=422, detail="from must be a valid YYYY-MM-DD date") from None

    days = min(60, max(1, days))
    end = (start_day + timedelta(days=days)).strftime(DATE_FORMAT)  # exclusive

    with get_db() as db:
        if db.query(Provider).filter(Provider.id == provider_id).first() is None:
            raise HTTPException(status_code=404, detail="Provider not found")

        exp_ids = [e.id for e in db.query(Experience).filter(Experience.provider_id == provider_id).all()]
        result: Dict[str, Dict[str, List[Dict[str, Any]]]] = {exp_id: {} for exp_id in exp_ids}
        if not exp_ids:
            return result

        rows = (
            db.query(Availability)
            .filter(
                Availability.experience_id.in_(exp_ids),
                Availability.date >= start_day.strftime(DATE_FORMAT),
                Availability.date < end,
            )
            .order_by(Availability.date, Availability.time_min)
            .all()
        )
        for row in rows:
            result[row.experience_id].setdefault(row.date, []).append(slot_payload(row))
        return result


@router.patch("/availability")
def update_availability(request: AvailabilityRequest) -> Dict[str, Any]:
    """Open/close a slot, change its capacity, or add a new slot"""
    with get_db() as db:
        if db.query(Experience).filter(Experience.id == request.experience_id).first() is None:
            raise HTTPException(status_code=404, detail="Experience not found")

        avail = (
            db.query(Availability)
            .filter(
                Availability.experience_id == request.experience_id,
                Availability.date == request.date,
                Availability.time_min == request.time,
            )
            .first()
        )

        if avail is not None:
            if request.capacity is not None:
                avail.capacity = max(request.capacity, avail.booked)  # can't drop below seats already sold
            if request.enabled is not None:
                avail.enabled = request.enabled
        else:
            avail = Availability(
                experience_id=request.experience_id,
                date=request.date,
                time_min=request.time,
                capacity=request.capacity if request.capacity is not None else 10,
                booked=0,
                enabled=request.enabled if request.enabled is not None else True,
            )
            db.add(avail)

        db.commit()
        return {"experienceId": avail.experience_id, "date": avail.date, **slot_payload(avail)}


@router.post("/providers/{provider_id}/experiences", status_code=201)
def create_experience(provider_id: str, request: PublishExperienceRequest) -> Dict[str, Any]:
    """Publish a new experience for a provider"""
    if request.category not in CATEGORY_META:
        raise HTTPException(status_code=422, detail=f"Unknown category '{request.category}'")

    with get_db() as db:
        if db.query(Provider).filter(Provider.id == provider_id).first() is None:
            raise HTTPException(status_code=404, detail="Provider not found")

        if request.id:
            if not EXPERIENCE_ID.match(request.id):
                raise HTTPException(status_code=422, detail="id may only contain letters, digits, '-' and '_'")
            if db.query(Experience).filter(Experience.id == request.id).first() is not None:
                raise HTTPException(status_code=409, detail=f"Experience '{request.id}' already exists")
            exp_id = request.id
        else:
            exp_id = "exp-" + uuid.uuid4().hex[:8]

        db.add(
            Experience(
                id=exp_id,
                provider_id=provider_id,
                title=request.title,
                tagline=request.tagline,
                category=request.category,
                tags=json_dumps(request.tags),
                image_url=request.image,
                area=request.area,
                address=request.address,
                map_x=request.x,
                map_y=request.y,
                duration_min=request.duration_min,
                price=request.price,
                child_price=request.child_price,
                rating=request.rating,
                reviews_count=request.reviews,
                indoor=request.indoor,
                family_friendly=request.family_friendly,
                wheelchair=request.wheelchair,
                vegetarian=request.vegetarian,
                walking=request.walking,
                languages=json_dumps(request.languages),
                about=request.about,
                included=json_dumps(request.included),
                highlights=json_dumps(request.highlights),
                accessibility=json_dumps(request.accessibility),
                badge=request.badge,
                created_at=utcnow(),
            )
        )

        seen_times = set()
        for slot in request.slots:
            if slot.time in seen_times:
                continue
            seen_times.add(slot.time)
            left = slot.left if slot.left is not None else slot.capacity
            db.add(
                ExperienceSlot(
                    experience_id=exp_id,
                    time_min=slot.time,
                    capacity=slot.capacity,
                    seats_left=min(left, slot.capacity),
                )
            )

        db.commit()
        created = load_experiences(db, only_id=exp_id)[0]

    refresh_catalog()
    return created


@router.get("/providers/{provider_id}/analytics")
def get_provider_analytics(provider_id: str) -> Dict[str, Any]:
    """Chart data: { providerId, series:{days,views,bookings,revenue}, popular, travelerMix, peak, demand }"""
    with get_db() as db:
        if db.query(Provider).filter(Provider.id == provider_id).first() is None:
            raise HTTPException(status_code=404, detail="Provider not found")

        rows = (
            db.query(AnalyticsDaily)
            .filter(AnalyticsDaily.provider_id == provider_id)
            .order_by(AnalyticsDaily.day)
            .all()
        )
        if not rows:
            raise HTTPException(status_code=404, detail="No analytics for this provider yet")

        insight = db.query(ProviderInsight).filter(ProviderInsight.provider_id == provider_id).first()
        extra = json_loads(insight.data) if insight else {}
        if not isinstance(extra, dict):
            extra = {}

        return {
            "providerId": provider_id,
            "series": {
                "days": [r.day for r in rows],
                "views": [r.views for r in rows],
                "bookings": [r.bookings for r in rows],
                "revenue": [r.revenue for r in rows],
            },
            **extra,
        }

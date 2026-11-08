"""In-memory copy of the experience catalog used by the AI engine.

It lives in its own module (not main.py) so routers can import it without a circular import.
The dict is updated IN PLACE by refresh_catalog(): other modules keep a reference to this very
object, so rebinding it (experience_catalog = {...}) would leave them looking at a stale, empty dict.
"""
from typing import Any, Dict

from database import get_db, json_loads
from models import Experience, ExperienceSlot

experience_catalog: Dict[str, Dict[str, Any]] = {}


def refresh_catalog() -> None:
    """Reload the catalog from the database"""
    fresh: Dict[str, Dict[str, Any]] = {}
    with get_db() as db:
        for exp in db.query(Experience).all():
            fresh[exp.id] = {
                "id": exp.id,
                "title": exp.title,
                "tagline": exp.tagline or "",
                "about": exp.about or "",
                "address": exp.address or "",
                "badge": exp.badge,
                "reviews": exp.reviews_count,
                "vegetarian": bool(exp.vegetarian),
                "category": exp.category,
                "tags": json_loads(exp.tags),
                "area": exp.area or "",
                "x": exp.map_x,
                "y": exp.map_y,
                "duration_min": exp.duration_min,
                "price": exp.price,
                "child_price": exp.child_price,
                "rating": exp.rating,
                "indoor": bool(exp.indoor),
                "family_friendly": bool(exp.family_friendly),
                "wheelchair": bool(exp.wheelchair),
                "walking": exp.walking,
                "slots": [],
            }

        slots = db.query(ExperienceSlot).order_by(ExperienceSlot.time_min).all()
        for slot in slots:
            if slot.experience_id in fresh:
                fresh[slot.experience_id]["slots"].append(
                    {"time": slot.time_min, "left": slot.seats_left, "capacity": slot.capacity}
                )

    experience_catalog.clear()
    experience_catalog.update(fresh)

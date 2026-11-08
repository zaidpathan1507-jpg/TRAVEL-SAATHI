import math
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, replace

# Constants
HOTEL = {"x": 38, "y": 58, "name": "The Deccan Courtyard", "area": "Deccan Gymkhana"}
NOW = 16 * 60  # 4:00 PM in minutes
RAIN_AT = 17 * 60  # 5:00 PM in minutes

CITIES = ["Pune", "Mumbai", "Goa", "Jaipur", "Delhi", "Bengaluru", "Bangalore", "Udaipur", "Kochi", "Hyderabad", "Chennai", "Kolkata", "Varanasi", "Mysuru", "Nashik", "Lonavala"]

INTEREST_WORDS = [
    ["food", r"\b(food|eat|eating|cuisine|street food|snacks?|misal|foodie|lunch|dinner|breakfast|sweets?|cafes?|chai)\b"],
    ["culture", r"\b(cultur(e|al)|traditions?|traditional|local life|festivals?|community)\b"],
    ["history", r"\b(history|historic(al)?|heritage|forts?|museums?|palaces?|temples?)\b"],
    ["art", r"\b(art|arts|pottery|crafts?|workshops?|painting|warli)\b"],
    ["music", r"\b(music|concerts?|live music|dhol|singing|classical)\b"],
    ["shopping", r"\b(shop|shopping|markets?|souvenirs?|bazaar)\b"],
    ["nature", r"\b(nature|hills?|parks?|gardens?|sunset|green|outdoors?)\b"],
    ["adventure", r"\b(adventure|treks?|trekking|hikes?|hiking|climb)\b"],
    ["nightlife", r"\b(nightlife|bars?|pubs?|clubs?|party|drinks)\b"]
]

CATEGORY_META = {
    "food": {"label": "Food", "emoji": "🍛"},
    "culture": {"label": "Culture", "emoji": "🏛️"},
    "art": {"label": "Art", "emoji": "🎨"},
    "music": {"label": "Music", "emoji": "🎵"},
    "heritage": {"label": "Heritage", "emoji": "🏰"},
    "history": {"label": "History", "emoji": "🏛"},
    "family": {"label": "Family", "emoji": "👨‍👩‍👧"},
    "nature": {"label": "Nature", "emoji": "🌿"},
    "adventure": {"label": "Adventure", "emoji": "🏔️"},
    "shopping": {"label": "Shopping", "emoji": "🛍️"},
    "nightlife": {"label": "Nightlife", "emoji": "🌙"}
}

@dataclass
class Experience:
    id: str
    title: str
    category: str
    tags: List[str]
    area: str
    x: float
    y: float
    duration_min: int
    price: int
    child_price: Optional[int]
    rating: float
    indoor: bool
    family_friendly: bool
    wheelchair: bool
    walking: str
    slots: List[Dict]

@dataclass
class Trip:
    city: str = "Pune"
    minutes: int = 180
    budget: int = 2000
    budget_mode: str = "person"
    adults: int = 2
    children: int = 2
    group_type: str = "family"
    interests: List[str] = None
    max_km: float = 5
    wheelchair: bool = False
    low_walking: bool = False
    indoor_only: bool = False
    vegetarian: bool = False
    start_min: int = 960
    weather: str = "clear"

    def __post_init__(self):
        if self.interests is None:
            self.interests = ["food", "culture"]

@dataclass
class MatchResult:
    score: int
    reasons: List[Dict]
    breakdown: List[Dict]
    distance: float
    travel: int
    next_slot: Optional[Dict]

@dataclass
class PlanItem:
    kind: str
    start: int
    end: int
    label: str
    sub: str
    distance: Optional[float] = None
    mode: Optional[str] = None
    exp_id: Optional[str] = None

@dataclass
class Plan:
    items: List[PlanItem]
    total_min: int
    travel_km: float
    group_cost: int
    per_person: int
    end_min: int

def js_round(n: float) -> int:
    """Round half up like JavaScript's Math.round (Python's round() is banker's rounding)"""
    return int(math.floor(n + 0.5))

def _xy(p: Any):
    """Read map coordinates from a dict ({x, y}) or an object with x / y attributes"""
    if isinstance(p, dict):
        return p["x"], p["y"]
    return p.x, p.y

def dist_km(a: Any, b: Any) -> float:
    """Calculate distance between two map points in km"""
    ax, ay = _xy(a)
    bx, by = _xy(b)
    return js_round(math.hypot(ax - bx, ay - by) * 0.1 * 10) / 10

def travel_mode(k: float) -> str:
    """Determine travel mode based on distance"""
    return "walk" if k <= 0.6 else "auto"

def travel_min(k: float) -> int:
    """Calculate travel time in minutes"""
    if k <= 0.6:
        return max(3, js_round(k / 4.5 * 60))
    return js_round(k / 18 * 60) + 4

def _indian_grouping(n: int) -> str:
    """12345678 -> 1,23,45,678"""
    sign = "-" if n < 0 else ""
    digits = str(abs(n))
    if len(digits) <= 3:
        return sign + digits
    head, tail = digits[:-3], digits[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return sign + ",".join(parts + [tail])

def inr(n: float) -> str:
    """Format number as Indian Rupees, e.g. ₹2,000"""
    return "₹" + _indian_grouping(js_round(n))

def dur(m: int) -> str:
    """Format duration"""
    m = js_round(m)
    if m < 60:
        return f"{m} min"
    h = m // 60
    r = m % 60
    return f"{h}h {r}m" if r else f"{h}h"

def clock(m: int) -> str:
    """Convert minutes from midnight to time string"""
    h = int(m // 60) % 24
    mm = js_round(m % 60)
    ap = "PM" if h >= 12 else "AM"
    h12 = (h + 11) % 12 + 1
    return f"{h12}:{str(mm).zfill(2)} {ap}"

def km(k: float) -> str:
    """Format distance"""
    if k < 1:
        return f"{max(100, js_round(k * 10) * 100)} m"
    return f"{k:.1f} km"

def group_size(trip: Trip) -> int:
    """Calculate total group size"""
    return trip.adults + trip.children

def per_person_budget(trip: Trip) -> float:
    """Calculate budget per person"""
    if trip.budget_mode == "group":
        return trip.budget / max(1, group_size(trip))
    return trip.budget

def group_label(trip: Trip) -> str:
    """Get group label"""
    if trip.group_type == "family":
        return f"Family of {group_size(trip)}"
    elif trip.group_type == "couple":
        return "Couple"
    elif trip.group_type == "solo":
        return "Solo"
    else:
        return f"{group_size(trip)} friends"

def interest_label(trip: Trip) -> str:
    """Get interests label"""
    return " + ".join([CATEGORY_META.get(i, {}).get("label", i) for i in trip.interests])

def group_cost_for(exp: Experience, trip: Trip) -> int:
    """Calculate total cost for group"""
    child_price = exp.child_price if exp.child_price is not None else exp.price
    return trip.adults * exp.price + trip.children * child_price

def next_slot_for(exp: Experience, from_time: int) -> Optional[Dict]:
    """Find next available slot"""
    available = [s for s in exp.slots if s["time"] >= from_time - 5 and s["left"] > 0]
    if not available:
        return None
    return sorted(available, key=lambda x: x["time"])[0]

def score_experience(exp: Experience, trip: Trip, origin: Dict = HOTEL) -> MatchResult:
    """Score an experience against trip criteria"""
    d = dist_km(origin, exp)
    tr = travel_min(d)
    slot = next_slot_for(exp, trip.start_min)
    budget = per_person_budget(trip)
    reasons = []

    # Interest scoring
    if not trip.interests:
        interest = 0.7
    elif exp.category in trip.interests:
        interest = 1.0
    elif any(tag in trip.interests for tag in exp.tags):
        interest = 0.8
    else:
        interest = 0.2

    matched = [CATEGORY_META.get(tag, {}).get("label", tag) for tag in exp.tags if tag in trip.interests]
    if interest >= 0.8:
        reasons.append({"ok": True, "kind": "interest", "text": f"Matches your interests: {' + '.join(matched)}"})
    else:
        reasons.append({"ok": False, "kind": "interest", "text": f"Not quite your interests ({CATEGORY_META.get(exp.category, {}).get('label', exp.category)})"})

    # Distance scoring
    dist_score = 1 - (d / trip.max_km) * 0.3 if (d <= trip.max_km and trip.max_km > 0) else 0.2
    mode = travel_mode(d)
    reasons.append({"ok": d <= trip.max_km, "kind": "distance", "text": f"{km(d)} away · {tr} min by {mode}"})

    # Time scoring
    needed = exp.duration_min + tr * 2
    time_score = 1 if needed <= trip.minutes else max(0, 1 - (needed - trip.minutes) / 60)
    if needed <= trip.minutes:
        reasons.append({"ok": True, "kind": "time", "text": f"{dur(exp.duration_min)} — fits your {dur(trip.minutes)} window"})
    else:
        reasons.append({"ok": False, "kind": "time", "text": f"{dur(exp.duration_min)} — longer than your free time"})

    # Budget scoring
    if exp.price <= budget:
        budget_score = 1
    elif exp.price <= budget * 1.2:
        budget_score = 0.5
    else:
        budget_score = 0

    if exp.price == 0:
        reasons.append({"ok": True, "kind": "budget", "text": "Free to join"})
    elif exp.price <= budget:
        reasons.append({"ok": True, "kind": "budget", "text": f"{inr(exp.price)}/person — under your {inr(budget)} budget"})
    else:
        reasons.append({"ok": False, "kind": "budget", "text": f"{inr(exp.price)}/person — over your budget"})

    # Group scoring
    group_score = 1 if trip.group_type != "family" or exp.family_friendly else 0
    if trip.group_type == "family":
        if exp.family_friendly:
            child_info = ""
            if exp.child_price is not None and exp.child_price < exp.price:
                child_info = f" · kids {'free' if exp.child_price == 0 else inr(exp.child_price)}"
            reasons.append({"ok": True, "kind": "group", "text": f"Family friendly{child_info}"})
        else:
            reasons.append({"ok": False, "kind": "group", "text": "Not suitable for kids"})

    # Availability scoring
    avail_score = 1 if slot and slot["time"] - trip.start_min <= 60 else (0.7 if slot else 0)
    if slot:
        reasons.append({"ok": True, "kind": "availability", "text": f"Available at {clock(slot['time'])} · {slot['left']} spots left"})
    else:
        reasons.append({"ok": False, "kind": "availability", "text": "No slots left today"})

    # Weather scoring
    weather_score = 1
    if trip.weather == "rain" or trip.indoor_only:
        weather_score = 1 if exp.indoor else 0
        if exp.indoor:
            reasons.append({"ok": True, "kind": "weather", "text": "Indoor — rain-proof"})
        else:
            reasons.append({"ok": False, "kind": "weather", "text": "Outdoor — rain expected at 5 PM"})

    # Accessibility penalty
    access_penalty = 0
    if trip.wheelchair:
        if exp.wheelchair:
            reasons.append({"ok": True, "kind": "access", "text": "Wheelchair accessible"})
        else:
            reasons.append({"ok": False, "kind": "access", "text": "Not wheelchair accessible"})
            access_penalty = 0.25

    if trip.low_walking and exp.walking == "high":
        access_penalty += 0.12

    # Rating score
    rating_score = max(0, min(1, (exp.rating - 4.2) / 0.8))

    # Score breakdown
    breakdown = [
        {"key": "interest", "label": "Interests", "value": interest, "weight": 0.26},
        {"key": "time", "label": "Time fit", "value": time_score, "weight": 0.14},
        {"key": "budget", "label": "Budget", "value": budget_score, "weight": 0.14},
        {"key": "distance", "label": "Distance", "value": dist_score, "weight": 0.12},
        {"key": "availability", "label": "Availability", "value": avail_score, "weight": 0.1},
        {"key": "weather", "label": "Weather", "value": weather_score, "weight": 0.1},
        {"key": "group", "label": "Group fit", "value": group_score, "weight": 0.08},
        {"key": "rating", "label": "Ratings", "value": rating_score, "weight": 0.06}
    ]

    raw = sum(b["value"] * b["weight"] for b in breakdown) - access_penalty
    score = max(35, min(98, js_round(raw * 94)))
    reasons.sort(key=lambda x: x["ok"], reverse=True)

    return MatchResult(score, reasons, breakdown, d, tr, slot)

def recommend(trip: Trip, experiences: List[Experience]) -> List[Dict]:
    """Recommend experiences based on trip criteria"""
    filtered = experiences if trip.group_type != "family" else [e for e in experiences if e.family_friendly]
    scored = [{"exp": e, "match": score_experience(e, trip)} for e in filtered]
    return sorted(scored, key=lambda x: x["match"].score, reverse=True)

def build_plan(ids: List[str], trip: Trip, experiences_dict: Dict[str, Experience]) -> Plan:
    """Build a timed itinerary from experience IDs"""
    items = []
    t = trip.start_min
    pos = HOTEL
    travel_km = 0
    group_cost = 0

    for exp_id in ids:
        exp = experiences_dict[exp_id]
        d = dist_km(pos, exp)
        m = travel_min(d)
        mode = travel_mode(d)

        items.append(PlanItem(
            kind="travel",
            start=t,
            end=t + m,
            label=f"Walk to {exp.area}" if mode == "walk" else f"Auto-rickshaw to {exp.area}",
            sub=f"{km(d)} · {m} min",
            distance=d,
            mode=mode
        ))

        t += m
        travel_km += d
        t = math.ceil(t / 5) * 5

        items.append(PlanItem(
            kind="activity",
            start=t,
            end=t + exp.duration_min,
            label=exp.title,
            sub=f"{exp.area} · {dur(exp.duration_min)}",
            exp_id=exp.id
        ))

        t += exp.duration_min
        group_cost += group_cost_for(exp, trip)
        pos = exp

    if ids:
        d = dist_km(pos, HOTEL)
        m = travel_min(d)
        items.append(PlanItem(
            kind="return",
            start=t,
            end=t + m,
            label="Return to hotel",
            sub=f"{HOTEL['name']} · {km(d)} · {m} min",
            distance=d,
            mode=travel_mode(d)
        ))
        t += m
        travel_km += d

    return Plan(
        items=items,
        total_min=t - trip.start_min,
        travel_km=js_round(travel_km * 10) / 10,
        group_cost=group_cost,
        per_person=js_round(group_cost / max(1, group_size(trip))),
        end_min=t
    )

def compose_plan(primary_id: str, trip: Trip, experiences: List[Experience], experiences_dict: Dict[str, Experience]) -> List[str]:
    """Compose a plan around a primary experience"""
    primary = experiences_dict[primary_id]
    remaining = trip.minutes - primary.duration_min - 30
    want = [i for i in trip.interests if i != primary.category]

    candidates = [r for r in recommend(trip, experiences)
                  if r["exp"].id != primary_id and
                  r["exp"].duration_min <= remaining and
                  r["exp"].category != primary.category]

    if want:
        candidates = [c for c in candidates if any(tag in want for tag in c["exp"].tags)]

    candidates.sort(key=lambda x: x["match"].score - 5 * dist_km(x["exp"], primary), reverse=True)

    pick = next((c for c in candidates if c["match"].score >= 70 and c["exp"].duration_min >= 40), candidates[0] if candidates else None)

    if not pick:
        return [primary_id]

    if primary.category == "food":
        return [pick["exp"].id, primary_id]
    return [primary_id, pick["exp"].id]

def plan_checks(plan: Plan, ids: List[str], trip: Trip, experiences_dict: Dict[str, Experience]) -> List[Dict]:
    """Check if plan meets trip constraints"""
    exps = [experiences_dict[id] for id in ids]
    checks = [
        {"ok": plan.per_person <= per_person_budget(trip), "text": "Within budget"},
        {"ok": plan.total_min <= trip.minutes, "text": "Within available time"}
    ]

    if trip.group_type == "family":
        checks.append({"ok": all(e.family_friendly for e in exps), "text": "Family friendly"})

    if trip.weather == "rain":
        checks.append({"ok": len(rain_affected(ids, trip, experiences_dict)) == 0, "text": "Rain-proof"})

    return checks

def rain_affected(ids: List[str], trip: Trip, experiences_dict: Dict[str, Experience]) -> List[str]:
    """Find experiences affected by rain"""
    plan = build_plan(ids, trip, experiences_dict)
    return [item.exp_id for item in plan.items
            if item.kind == "activity" and item.end > RAIN_AT and not experiences_dict[item.exp_id].indoor]

def rain_alternatives(affected_id: str, ids: List[str], trip: Trip, experiences: List[Experience], experiences_dict: Dict[str, Experience]) -> List[Dict]:
    """Find indoor alternatives for rain-affected experiences"""
    affected = experiences_dict[affected_id]
    rain_trip = replace(trip, weather="rain")

    alternatives = [r for r in recommend(rain_trip, experiences)
                    if r["exp"].indoor and
                    r["exp"].id not in ids and
                    r["exp"].duration_min <= affected.duration_min + 20 and
                    r["exp"].duration_min >= affected.duration_min * 0.4]

    filtered = []
    for alt in alternatives:
        next_ids = [alt["exp"].id if i == affected_id else i for i in ids]
        if build_plan(next_ids, rain_trip, experiences_dict).total_min <= trip.minutes:
            filtered.append(alt)

    return filtered[:3]

def compress_plan(ids: List[str], trip: Trip, new_minutes: int, experiences: List[Experience], experiences_dict: Dict[str, Experience]) -> Dict:
    """Compress plan to fit new time constraint"""
    t2 = replace(trip, minutes=new_minutes)
    before = build_plan(ids, trip, experiences_dict)

    if before.total_min <= new_minutes:
        return {
            "ids": ids,
            "removed": [],
            "added": [],
            "saved": 0,
            "before": before,
            "after": before
        }

    pool = [r["exp"].id for r in recommend(t2, experiences) if r["match"].next_slot and r["match"].score >= 70]

    def score_func(exp_id: str) -> int:
        return score_experience(experiences_dict[exp_id], t2).score

    candidates = []
    for idx, rid in enumerate(ids):
        candidates.append([i for i in ids if i != rid])

    for nid in pool:
        if nid in ids:
            continue
        for idx in range(len(ids)):
            next_ids = ids.copy()
            next_ids[idx] = nid
            candidates.append(next_ids)

    for a in pool:
        candidates.append([a])
        for b in pool:
            if a != b:
                candidates.append([a, b])

    best = None
    for c in candidates:
        if not c:
            continue
        p = build_plan(c, t2, experiences_dict)
        if p.total_min > new_minutes:
            continue

        removed = len([i for i in ids if i not in c])
        value = sum(score_func(x) for x in c) + 15 * len(c) - 10 * removed

        if best is None or value > best["value"]:
            best = {"ids": c, "value": value}

    if not best:
        return {
            "ids": ids,
            "removed": [],
            "added": [],
            "saved": 0,
            "before": before,
            "after": before
        }

    after = build_plan(best["ids"], t2, experiences_dict)
    return {
        "ids": best["ids"],
        "removed": [i for i in ids if i not in best["ids"]],
        "added": [i for i in best["ids"] if i not in ids],
        "saved": before.total_min - after.total_min,
        "before": before,
        "after": after
    }

def parse_query(text: str, base: Trip) -> Dict:
    """Parse natural language query to extract trip constraints"""
    q = text.strip()
    patch = {}
    fields = []

    # City detection
    city = next((c for c in CITIES if re.search(rf"\b{c}\b", q, re.IGNORECASE)), None)
    patch["city"] = "Bengaluru" if city == "Bangalore" else city if city else base.city
    fields.append({"key": "location", "label": "Location", "value": patch["city"], "assumed": not city})

    # Time parsing
    minutes = None
    h_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(hours?|hrs?|h)\b", q, re.IGNORECASE)
    m_match = re.search(r"(\d+)\s*(minutes?|mins?)\b", q, re.IGNORECASE)

    if h_match:
        minutes = js_round(float(h_match.group(1)) * 60) + (int(m_match.group(1)) if m_match else 0)
    elif m_match:
        minutes = int(m_match.group(1))
    elif re.search(r"half[- ]day", q, re.IGNORECASE):
        minutes = 240
    elif re.search(r"full[- ]day|whole day", q, re.IGNORECASE):
        minutes = 480
    elif re.search(r"an hour|one hour", q, re.IGNORECASE):
        minutes = 60

    patch["minutes"] = minutes if minutes is not None else base.minutes
    fields.append({"key": "time", "label": "Available time", "value": dur(patch["minutes"]), "assumed": minutes is None})

    # Group parsing
    fam_match = re.search(r"family of (\d+)", q, re.IGNORECASE)
    group_match = re.search(r"(?:group of|we are|we're)\s*(\d+)", q, re.IGNORECASE)

    if fam_match or re.search(r"\b(family|kids|children|parents|son|daughter)\b", q, re.IGNORECASE):
        n = int(fam_match.group(1)) if fam_match else 4
        patch["group_type"] = "family"
        patch["adults"] = max(1, min(n, 2))
        patch["children"] = max(0, n - 2)
    elif re.search(r"\b(couple|partner|wife|husband|girlfriend|boyfriend|anniversary|honeymoon)\b", q, re.IGNORECASE):
        patch["group_type"] = "couple"
        patch["adults"] = 2
        patch["children"] = 0
    elif re.search(r"\b(friends|buddies|gang)\b", q, re.IGNORECASE) or group_match:
        patch["group_type"] = "friends"
        patch["adults"] = int(group_match.group(1)) if group_match else 4
        patch["children"] = 0
    elif re.search(r"\b(alone|solo|myself|just me)\b", q, re.IGNORECASE):
        patch["group_type"] = "solo"
        patch["adults"] = 1
        patch["children"] = 0

    g = replace(base, **patch)
    group_text = f"Family · {g.adults} adults, {g.children} kids" if g.group_type == "family" else group_label(g)
    fields.append({"key": "group", "label": "Group", "value": group_text, "assumed": "group_type" not in patch})

    # Budget parsing
    budget_re = r"(?:under|below|less than|within|budget(?: of| is)?|max(?:imum)?|upto|up to|₹|\brs\.?|\binr)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k\b)?(\s*(?:km|kms|hours?|hrs?|h\b|mins?|minutes?))?"
    budget_matches = list(re.finditer(budget_re, q, re.IGNORECASE))
    budget_match = next((m for m in budget_matches if not m.group(3) and float(m.group(1).replace(",", "")) * (1000 if m.group(2) else 1) >= 50), None)

    if budget_match:
        v = float(budget_match.group(1).replace(",", ""))
        if budget_match.group(2):
            v *= 1000
        patch["budget"] = v
        patch["budget_mode"] = "person" if re.search(r"per person|each|\bpp\b|per head", q, re.IGNORECASE) else ("group" if re.search(r"total|for all|for us|altogether", q, re.IGNORECASE) else "person")

    bb = replace(base, **patch)
    budget_text = f"{inr(bb.budget)} {'per person' if bb.budget_mode == 'person' else 'total'}"
    fields.append({"key": "budget", "label": "Budget", "value": budget_text, "assumed": not budget_match})

    # Interests parsing
    found = [cat for cat, pattern in INTEREST_WORDS if re.search(pattern, q, re.IGNORECASE)]
    if found:
        patch["interests"] = list(dict.fromkeys(found))  # de-duplicate, keep order

    interest_text = " + ".join([CATEGORY_META.get(i, {}).get("label", i) for i in (patch.get("interests", base.interests))])
    fields.append({"key": "interests", "label": "Interests", "value": interest_text, "assumed": not found})

    # Distance parsing
    dist_match = re.search(r"within\s*(\d+(?:\.\d+)?)\s*km", q, re.IGNORECASE) or re.search(r"(\d+(?:\.\d+)?)\s*km", q, re.IGNORECASE)
    if dist_match:
        patch["max_km"] = float(dist_match.group(1))
    elif re.search(r"nearby|near me|close by|walking distance", q, re.IGNORECASE):
        patch["max_km"] = 2

    fields.append({"key": "distance", "label": "Distance", "value": f"Within {patch.get('max_km', base.max_km):g} km", "assumed": not dist_match})

    # Indoor/rain
    if re.search(r"\bindoor|rain(y)?\b", q, re.IGNORECASE):
        patch["indoor_only"] = True
        fields.append({"key": "indoor", "label": "Setting", "value": "Indoor only"})

    # Accessibility
    if re.search(r"wheelchair|accessible|elderly|grand(ma|pa|parents)", q, re.IGNORECASE):
        patch["wheelchair"] = True
        fields.append({"key": "access", "label": "Accessibility", "value": "Step-free access"})

    if re.search(r"less walking|no walking|can't walk|cannot walk|minimal walking", q, re.IGNORECASE):
        patch["low_walking"] = True
        fields.append({"key": "walking", "label": "Walking", "value": "Minimal walking"})

    # Vegetarian
    if re.search(r"\b(veg|vegetarian|jain)\b", q, re.IGNORECASE):
        patch["vegetarian"] = True
        fields.append({"key": "veg", "label": "Food", "value": "Vegetarian"})

    return {"patch": patch, "fields": fields}

DEMO_QUERY = "I have 3 hours in Pune with my family. We want local food and something cultural under ₹2000 and within 5 km."

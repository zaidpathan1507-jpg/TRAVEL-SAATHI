import re
import threading
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from database import get_db, utcnow
from models import Availability, Booking, Experience
from schemas import CreateBookingRequest, UpdateBookingStatusRequest
from serializers import booking_payload

router = APIRouter()

PAYMENTS = {"upi": "UPI", "card": "Card", "later": "Pay later", "UPI": "UPI", "Card": "Card", "Pay later": "Pay later"}
STATUSES = ["Confirmed", "Pending", "Completed", "Cancelled"]
FIRST_ID = 24811  # the seed data starts at ANV-24811

_checkout_lock = threading.Lock()


def _next_checkout_number(db) -> int:
    """Highest ANV-<n> already used (bookings are ANV-<n> or ANV-<n>-<i>) plus one"""
    highest = FIRST_ID
    for (booking_id,) in db.query(Booking.id).all():
        m = re.match(r"^ANV-(\d+)", booking_id)
        if m:
            highest = max(highest, int(m.group(1)))
    return highest + 1


def _traveler_type(request: CreateBookingRequest) -> str:
    if request.traveler_type:
        return request.traveler_type
    if request.children > 0:
        return "Family"
    if request.adults == 2:
        return "Couple"
    if request.adults == 1:
        return "Solo"
    return "Friends"


def quote_total(db, items, adults: int, children: int) -> Dict[str, Any]:
    """What the traveller pays, computed from the database prices. Same formula as the checkout page:
    5% bundle discount for 2+ experiences, then 5% taxes & fees. Raises 404 for an unknown experience."""
    subtotal = 0
    for item in items:
        exp = db.query(Experience).filter(Experience.id == item.exp_id).first()
        if exp is None:
            raise HTTPException(status_code=404, detail=f"Experience {item.exp_id} not found")
        child_price = exp.child_price if exp.child_price is not None else exp.price
        subtotal += adults * exp.price + children * child_price
    half_up = lambda x: int(x + 0.5)  # like JavaScript's Math.round for positive numbers
    discount = half_up(subtotal * 0.05) if len(items) >= 2 else 0
    fees = half_up((subtotal - discount) * 0.05)
    return {"subtotal": subtotal, "discount": discount, "fees": fees, "total": subtotal - discount + fees}


def create_bookings(request: CreateBookingRequest, payment: str, extra_note: Optional[str] = None) -> Dict[str, Any]:
    """Create one booking per experience and take the seats. `payment` is the display label (UPI, Razorpay ...)."""
    party = request.adults + request.children
    traveler_type = _traveler_type(request)
    note = " · ".join(n for n in (request.note, extra_note) if n) or None

    with _checkout_lock, get_db() as db:
        # Look everything up before writing anything, so a bad id leaves no partial checkout behind
        experiences: List[Experience] = []
        for item in request.items:
            exp = db.query(Experience).filter(Experience.id == item.exp_id).first()
            if exp is None:
                raise HTTPException(status_code=404, detail=f"Experience {item.exp_id} not found")
            experiences.append(exp)

        checkout_id = f"ANV-{_next_checkout_number(db)}"
        created: List[Booking] = []
        total = 0

        for index, (item, exp) in enumerate(zip(request.items, experiences), start=1):
            child_price = exp.child_price if exp.child_price is not None else exp.price
            amount = request.adults * exp.price + request.children * child_price
            total += amount

            booking = Booking(
                id=f"{checkout_id}-{index}",
                checkout_id=checkout_id,
                customer=request.customer,
                from_city=request.from_city,
                experience_id=exp.id,
                date=request.date,
                time_min=item.time,
                adults=request.adults,
                children=request.children,
                amount=amount,
                payment=payment,
                status="Pending" if payment == "Pay later" else "Confirmed",
                traveler_type=traveler_type,
                note=note,
                is_new=True,
                created_at=utcnow(),
            )
            db.add(booking)
            created.append(booking)

            # Take the seats from the provider's calendar: the slot closest to the chosen time
            # (within 30 min), otherwise the first slot of that day
            day = (
                db.query(Availability)
                .filter(Availability.experience_id == exp.id, Availability.date == request.date)
                .order_by(Availability.time_min)
                .all()
            )
            if day:
                slot = next((s for s in day if abs(s.time_min - item.time) <= 30), day[0])
                slot.booked = min(slot.capacity, slot.booked + party)

        db.commit()
        return {"checkoutId": checkout_id, "total": total, "bookings": [booking_payload(b) for b in created]}


@router.post("/bookings", status_code=201)
def create_booking(request: CreateBookingRequest) -> Dict[str, Any]:
    """Checkout without online payment (UPI/card demo, pay later). Prices are always recalculated here, never trusted from the client."""
    payment = PAYMENTS.get(request.payment)
    if payment is None:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    return create_bookings(request, payment)


@router.get("/bookings")
def get_bookings(provider_id: Optional[str] = Query(None, alias="providerId")) -> List[Dict[str, Any]]:
    """Bookings, newest first. With ?providerId= only that provider's experiences."""
    with get_db() as db:
        query = db.query(Booking)
        if provider_id:
            exp_ids = [e.id for e in db.query(Experience).filter(Experience.provider_id == provider_id).all()]
            if not exp_ids:
                return []
            query = query.filter(Booking.experience_id.in_(exp_ids))
        rows = query.order_by(Booking.created_at.desc(), Booking.id.desc()).all()
        return [booking_payload(b) for b in rows]


@router.patch("/bookings/{booking_id}")
def update_booking_status(booking_id: str, request: UpdateBookingStatusRequest) -> Dict[str, Any]:
    """Confirm / complete / cancel a booking"""
    if request.status not in STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {', '.join(STATUSES)}")

    with get_db() as db:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if booking is None:
            raise HTTPException(status_code=404, detail="Booking not found")

        booking.status = request.status
        booking.is_new = False
        db.commit()
        return booking_payload(booking)

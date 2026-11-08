"""Online payment with Razorpay Checkout.

Flow: the browser asks for an order (the server prices it from the database) -> Razorpay Checkout collects the
payment in its own window (card / UPI details never touch this app) -> the browser sends the result back and
the server verifies the signature and the payment with Razorpay before creating the bookings.
The key SECRET stays in backend/.env and is never sent to the browser."""
import hashlib
import hmac
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import Field

from database import get_db
from models import Booking
from routers.bookings import create_bookings, quote_total
from schemas import CamelModel, CreateBookingRequest, BookingItem

router = APIRouter()
logger = logging.getLogger("anvesha.payments")

API = "https://api.razorpay.com/v1"
MIN_PAISE = 100  # Razorpay's minimum order is Rs 1


class PaymentOrderRequest(CamelModel):
    items: List[BookingItem] = Field(min_length=1, max_length=20)
    date: str
    adults: int = Field(1, ge=1, le=100)
    children: int = Field(0, ge=0, le=100)


class VerifyPaymentRequest(CamelModel):
    razorpay_order_id: str = Field(max_length=100)
    razorpay_payment_id: str = Field(max_length=100)
    razorpay_signature: str = Field(max_length=200)
    booking: CreateBookingRequest


def _keys() -> tuple:
    return os.getenv("RAZORPAY_KEY_ID", "").strip(), os.getenv("RAZORPAY_KEY_SECRET", "").strip()


def _require_keys() -> tuple:
    key_id, secret = _keys()
    if not key_id or not secret:
        raise HTTPException(status_code=503, detail="Online payment is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in backend/.env)")
    return key_id, secret


def _razorpay(method: str, path: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    key_id, secret = _require_keys()
    try:
        with httpx.Client(timeout=15.0, auth=(key_id, secret)) as client:
            resp = client.request(method, f"{API}{path}", json=json)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Razorpay is unreachable: {type(exc).__name__}") from exc
    if resp.status_code >= 400:
        try:
            message = resp.json().get("error", {}).get("description", "")
        except ValueError:
            message = ""
        logger.warning("Razorpay %s %s -> HTTP %s: %s", method, path.split("?")[0], resp.status_code, message[:200])
        if resp.status_code == 401:
            message = "Razorpay rejected the API keys (check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)"
        raise HTTPException(status_code=502, detail=f"Payment service error ({resp.status_code}): {message[:200] or 'no details'}")
    return resp.json()


@router.get("/config")
def payment_config() -> Dict[str, Any]:
    """Whether online payment is available. The key id is public; the secret is never exposed."""
    key_id, secret = _keys()
    enabled = bool(key_id and secret)
    mode = None if not enabled else "test" if key_id.startswith("rzp_test_") else "live"
    return {"enabled": enabled, "keyId": key_id if enabled else None, "mode": mode}


@router.post("/order")
def create_order(request: PaymentOrderRequest) -> Dict[str, Any]:
    """Create a Razorpay order for this checkout. The amount comes from the database, not from the browser."""
    key_id, _ = _require_keys()
    with get_db() as db:
        quote = quote_total(db, request.items, request.adults, request.children)
    paise = quote["total"] * 100
    if paise < MIN_PAISE:
        raise HTTPException(status_code=400, detail="Nothing to pay online for this booking (total is below Rs 1)")
    order = _razorpay(
        "POST",
        "/orders",
        {"amount": paise, "currency": "INR", "receipt": f"anv-{os.urandom(4).hex()}", "notes": {"items": ",".join(i.exp_id for i in request.items)[:250], "date": request.date}},
    )
    return {"orderId": order["id"], "amount": order["amount"], "currency": order["currency"], "keyId": key_id, "total": quote["total"], "quote": quote}


@router.post("/verify", status_code=201)
def verify_payment(request: VerifyPaymentRequest) -> Dict[str, Any]:
    """Check the payment with Razorpay, then create the bookings. Safe to call twice for the same payment."""
    _, secret = _require_keys()

    expected = hmac.new(secret.encode(), f"{request.razorpay_order_id}|{request.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature is invalid")

    marker = f"Razorpay {request.razorpay_payment_id}"
    with get_db() as db:
        existing = db.query(Booking).filter(Booking.note.contains(marker)).all()  # same payment sent twice
        if existing:
            from serializers import booking_payload

            return {"checkoutId": existing[0].checkout_id, "total": sum(b.amount for b in existing), "bookings": [booking_payload(b) for b in existing], "paymentId": request.razorpay_payment_id, "repeat": True}
        quote = quote_total(db, request.booking.items, request.booking.adults, request.booking.children)

    payment = _razorpay("GET", f"/payments/{request.razorpay_payment_id}")
    if payment.get("order_id") != request.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not belong to this order")
    if payment.get("status") not in ("captured", "authorized"):
        raise HTTPException(status_code=402, detail=f"Payment is not complete (status: {payment.get('status')})")
    if payment.get("amount") != quote["total"] * 100:
        raise HTTPException(status_code=400, detail="Paid amount does not match the booking total")

    result = create_bookings(request.booking, "Razorpay", extra_note=marker)
    result["paymentId"] = request.razorpay_payment_id
    result["total"] = quote["total"]
    return result

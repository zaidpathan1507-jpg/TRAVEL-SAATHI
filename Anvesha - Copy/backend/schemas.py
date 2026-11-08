"""Request bodies. The React app talks camelCase JSON (expId, budgetMode, durationMin ...), so every
model accepts camelCase; snake_case field names work too (populate_by_name)."""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from serializers import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


def _check_date(value: str) -> str:
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except (TypeError, ValueError):
        raise ValueError("date must be a valid YYYY-MM-DD date") from None
    return value


# ---------------------------------------------------------------- Trip / AI

class TripModel(CamelModel):
    city: str = "Pune"
    minutes: int = Field(180, ge=0, le=2880)
    budget: float = Field(2000, ge=0)
    budget_mode: Literal["person", "group"] = "person"
    adults: int = Field(2, ge=0, le=100)
    children: int = Field(2, ge=0, le=100)
    group_type: Literal["family", "couple", "solo", "friends"] = "family"
    interests: List[str] = Field(default_factory=lambda: ["food", "culture"])
    max_km: float = Field(5, ge=0)
    wheelchair: bool = False
    low_walking: bool = False
    indoor_only: bool = False
    vegetarian: bool = False
    start_min: int = Field(960, ge=0, le=2880)
    weather: Literal["clear", "rain"] = "clear"


class ParseRequest(CamelModel):
    text: str = Field(max_length=2000)
    trip: Optional[TripModel] = None


class RecommendRequest(CamelModel):
    query: Optional[str] = None
    mode: Optional[Literal["auto", "mumbai", "google"]] = "auto"
    trip: Optional[TripModel] = Field(default_factory=lambda: TripModel())
    limit: int = Field(20, ge=1, le=50)
    top_k: Optional[int] = None


class PlanRequest(CamelModel):
    ids: Optional[List[str]] = None
    primary_id: Optional[str] = None
    trip: TripModel = Field(default_factory=lambda: TripModel())


class AdaptRainRequest(CamelModel):
    ids: List[str] = Field(min_length=1, max_length=20)
    trip: TripModel = Field(default_factory=lambda: TripModel())


class AdaptTimeRequest(CamelModel):
    ids: List[str] = Field(min_length=1, max_length=20)
    trip: TripModel = Field(default_factory=lambda: TripModel())
    minutes: int = Field(ge=1, le=2880)


# ---------------------------------------------------------------- Bookings

class BookingItem(CamelModel):
    exp_id: str
    time: int = Field(ge=0, le=2880)


class CreateBookingRequest(CamelModel):
    items: List[BookingItem] = Field(min_length=1, max_length=20)
    date: str
    adults: int = Field(1, ge=1, le=100)
    children: int = Field(0, ge=0, le=100)
    payment: str
    customer: str = Field("Guest traveler", min_length=1, max_length=120)
    from_city: str = Field("", alias="from", max_length=120)
    traveler_type: Optional[Literal["Family", "Couple", "Solo", "Friends"]] = None
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("date")
    @classmethod
    def valid_date(cls, value: str) -> str:
        return _check_date(value)


class UpdateBookingStatusRequest(CamelModel):
    status: str


# ---------------------------------------------------------------- Provider

class AvailabilityRequest(CamelModel):
    experience_id: str
    date: str
    time: int = Field(ge=0, le=2880)
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    enabled: Optional[bool] = None

    @field_validator("date")
    @classmethod
    def valid_date(cls, value: str) -> str:
        return _check_date(value)


class SlotModel(CamelModel):
    time: int = Field(ge=0, le=2880)
    capacity: int = Field(10, ge=1, le=1000)
    left: Optional[int] = Field(None, ge=0)


class PublishExperienceRequest(CamelModel):
    id: Optional[str] = None
    title: str = Field(min_length=1, max_length=200)
    tagline: str = Field("", max_length=300)
    category: str
    tags: List[str] = Field(default_factory=list)
    image: Optional[str] = None
    area: str = ""
    address: str = ""
    x: float = Field(50, ge=0, le=100)
    y: float = Field(50, ge=0, le=100)
    duration_min: int = Field(ge=1, le=1440)
    price: int = Field(ge=0)
    child_price: Optional[int] = Field(None, ge=0)
    rating: float = Field(0, ge=0, le=5)
    reviews: int = Field(0, ge=0)
    slots: List[SlotModel] = Field(default_factory=list)
    indoor: bool = False
    family_friendly: bool = True
    wheelchair: bool = False
    vegetarian: bool = False
    walking: Literal["low", "medium", "high"] = "medium"
    languages: List[str] = Field(default_factory=list)
    about: str = ""
    included: List[str] = Field(default_factory=list)
    highlights: List[str] = Field(default_factory=list)
    accessibility: List[str] = Field(default_factory=list)
    badge: Optional[str] = None

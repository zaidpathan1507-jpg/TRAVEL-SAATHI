"""
Shared Pydantic schemas for the Anvesha recommendation model.
"""
from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


class BudgetBasis(str, Enum):
    PER_PERSON = "per_person"
    TOTAL = "total"
    UNKNOWN = "unknown"


class Budget(BaseModel):
    amount: Optional[float] = Field(None, description="Numeric budget figure.")
    currency: str = "INR"
    basis: BudgetBasis = BudgetBasis.UNKNOWN
    is_max: bool = Field(True, description="True if upper bound.")


class Intent(BaseModel):
    raw_query: str
    location_text: Optional[str] = Field(None, description="Location phrase e.g. 'Colaba, Mumbai'.")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None
    city: Optional[str] = Field(None, description="Resolved city used to select Mumbai vs Google mode.")

    categories: list[str] = Field(default_factory=list)
    budget: Optional[Budget] = None
    group_size: Optional[int] = None
    duration_minutes: Optional[int] = Field(None, description="Available time in minutes.")
    traveller_type: Optional[str] = None
    preferences: list[str] = Field(default_factory=list)
    time_constraint: Optional[str] = None

    extraction_method: Literal["gemini", "rule_based"] = "rule_based"
    confidence: float = Field(0.5, ge=0.0, le=1.0)

    @field_validator("categories", "preferences", mode="before")
    @classmethod
    def _none_to_empty(cls, v):
        return v or []


class Cost(BaseModel):
    min_inr: Optional[float] = None
    max_inr: Optional[float] = None
    basis: BudgetBasis = BudgetBasis.UNKNOWN
    is_free: Optional[bool] = None
    note: Optional[str] = None

    @property
    def is_known(self) -> bool:
        return self.min_inr is not None or self.max_inr is not None or self.is_free is not None


class Capacity(BaseModel):
    min_people: Optional[int] = None
    max_people: Optional[int] = None
    raw: Optional[str] = None


class OpeningHours(BaseModel):
    weekly_closure: Optional[list[str]] = None
    open_now: Optional[bool] = None
    hours_text: Optional[str] = None


class LocalKnowledge(BaseModel):
    local_score: Optional[float] = None
    local_confidence: Optional[float] = None
    local_recommendation_count: Optional[int] = None
    local_tips: list[str] = Field(default_factory=list)


class NormalizedPlace(BaseModel):
    id: str
    source: Literal["google", "mumbai"]
    source_id: str

    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    description: Optional[str] = None

    cost: Cost = Field(default_factory=Cost)
    capacity: Capacity = Field(default_factory=Capacity)
    duration_minutes: Optional[int] = None

    rating: Optional[float] = None
    review_count: Optional[int] = None
    price_level: Optional[int] = None

    opening_hours: OpeningHours = Field(default_factory=OpeningHours)
    business_status: Optional[str] = None

    local: LocalKnowledge = Field(default_factory=LocalKnowledge)

    last_verified: Optional[str] = None
    source_url: Optional[str] = None
    embedding_text: Optional[str] = None

    class Config:
        extra = "allow"


class ScoreBreakdown(BaseModel):
    semantic_score: Optional[float] = None
    distance_score: Optional[float] = None
    budget_score: Optional[float] = None
    time_score: Optional[float] = None
    group_score: Optional[float] = None
    quality_score: Optional[float] = None
    local_score: Optional[float] = None
    final_score: float = 0.0


class Recommendation(BaseModel):
    place_id: str
    source: Literal["google", "mumbai"]
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: list[str] = Field(default_factory=list)

    distance_km: Optional[float] = None
    estimated_cost_per_person: Optional[float] = None
    cost_note: Optional[str] = None
    rating: Optional[float] = None
    opening_status: Optional[str] = None

    semantic_score: Optional[float] = None
    constraint_score: Optional[float] = None
    final_score: float = 0.0

    match_reasons: list[str] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    details: dict[str, Any] = Field(default_factory=dict)


class EngineMeta(BaseModel):
    candidates_considered: int = 0
    candidates_after_constraints: int = 0
    engine: Literal["google", "mumbai"]
    data_source: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Free-text query.")
    mode: Literal["auto", "mumbai", "google"] = "auto"
    user_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    top_k: Optional[int] = Field(None, ge=1, le=50)


class RecommendResponse(BaseModel):
    query_id: str = Field(default_factory=lambda: new_id("Q"))
    mode: Literal["mumbai", "google"]
    intent: Intent
    recommendations: list[Recommendation] = Field(default_factory=list)
    engine_meta: EngineMeta
    generated_at: float = Field(default_factory=time.time)


class FeedbackEventType(str, Enum):
    IMPRESSION = "impression"
    CLICK = "click"
    SAVE = "save"
    SHARE = "share"
    BOOKING = "booking"
    VISIT = "visit"
    RATING = "rating"
    REJECT = "reject"


class FeedbackEvent(BaseModel):
    user_id: Optional[str] = None
    query_id: str
    place_id: str
    event: FeedbackEventType
    value: Optional[float] = None
    dwell_time_seconds: Optional[float] = None
    timestamp: float = Field(default_factory=time.time)

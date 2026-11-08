from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Provider(Base):
    __tablename__ = "providers"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    response_min = Column(Integer, default=30, nullable=False)
    since = Column(Integer, nullable=True)

class Experience(Base):
    __tablename__ = "experiences"

    id = Column(String, primary_key=True)
    provider_id = Column(String, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    tagline = Column(String, nullable=True)
    category = Column(String, nullable=False)
    tags = Column(Text, nullable=False, default="[]")  # JSON array
    image_url = Column(String, nullable=True)
    area = Column(String, nullable=True)
    address = Column(String, nullable=True)
    map_x = Column(Float, nullable=False)
    map_y = Column(Float, nullable=False)
    duration_min = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    child_price = Column(Integer, nullable=True)
    rating = Column(Float, default=0.0, nullable=False)
    reviews_count = Column(Integer, default=0, nullable=False)
    indoor = Column(Boolean, default=False, nullable=False)
    family_friendly = Column(Boolean, default=True, nullable=False)
    wheelchair = Column(Boolean, default=False, nullable=False)
    vegetarian = Column(Boolean, default=False, nullable=False)
    walking = Column(String, default="medium", nullable=False)
    languages = Column(Text, nullable=False, default="[]")  # JSON array
    about = Column(Text, nullable=True)
    included = Column(Text, nullable=False, default="[]")  # JSON array
    highlights = Column(Text, nullable=False, default="[]")  # JSON array
    accessibility = Column(Text, nullable=False, default="[]")  # JSON array
    badge = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.utcnow(), nullable=False)

    __table_args__ = (
        Index("experiences_provider_idx", "provider_id"),
        Index("experiences_category_idx", "category"),
    )

class ExperienceSlot(Base):
    __tablename__ = "experience_slots"

    experience_id = Column(String, ForeignKey("experiences.id", ondelete="CASCADE"), primary_key=True)
    time_min = Column(Integer, primary_key=True)
    capacity = Column(Integer, nullable=False)
    seats_left = Column(Integer, nullable=False)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experience_id = Column(String, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    from_city = Column(String, nullable=True)
    rating = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    when_label = Column(String, nullable=True)
    traveler_type = Column(String, nullable=True)

class Availability(Base):
    __tablename__ = "availability"

    experience_id = Column(String, ForeignKey("experiences.id", ondelete="CASCADE"), primary_key=True)
    date = Column(String, primary_key=True)  # YYYY-MM-DD
    time_min = Column(Integer, primary_key=True)
    capacity = Column(Integer, nullable=False)
    booked = Column(Integer, default=0, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True)
    checkout_id = Column(String, nullable=True)
    customer = Column(String, nullable=False)
    from_city = Column(String, nullable=True)
    experience_id = Column(String, ForeignKey("experiences.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    time_min = Column(Integer, nullable=False)
    adults = Column(Integer, default=1, nullable=False)
    children = Column(Integer, default=0, nullable=False)
    amount = Column(Integer, nullable=False)
    payment = Column(String, nullable=False)
    status = Column(String, nullable=False)
    traveler_type = Column(String, nullable=True)
    note = Column(Text, nullable=True)
    is_new = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.utcnow(), nullable=False)

    __table_args__ = (
        Index("bookings_experience_idx", "experience_id"),
        Index("bookings_checkout_idx", "checkout_id"),
    )

class AnalyticsDaily(Base):
    __tablename__ = "analytics_daily"

    provider_id = Column(String, ForeignKey("providers.id", ondelete="CASCADE"), primary_key=True)
    day = Column(String, primary_key=True)  # YYYY-MM-DD
    views = Column(Integer, nullable=False)
    bookings = Column(Integer, nullable=False)
    revenue = Column(Integer, nullable=False)

class ProviderInsight(Base):
    __tablename__ = "provider_insights"

    provider_id = Column(String, ForeignKey("providers.id", ondelete="CASCADE"), primary_key=True)
    data = Column(Text, nullable=False)  # JSON

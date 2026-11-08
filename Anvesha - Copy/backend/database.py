import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _resolve_database_url(raw: str):
    """Make a relative SQLite path (sqlite:///./anvesha.db) relative to backend/, not to the
    directory the server happens to be started from. Otherwise running from the project root
    silently creates a second, empty database."""
    if not raw:
        raw = "sqlite:///./anvesha.db"
    url = make_url(raw)
    if url.get_backend_name() == "sqlite" and url.database and url.database != ":memory:":
        if not os.path.isabs(url.database):
            url = url.set(database=os.path.join(BASE_DIR, url.database))
    return url


DATABASE_URL = _resolve_database_url(os.getenv("DATABASE_URL", "sqlite:///./anvesha.db"))
IS_SQLITE = DATABASE_URL.get_backend_name() == "sqlite"
IS_MEMORY = IS_SQLITE and (not DATABASE_URL.database or DATABASE_URL.database == ":memory:")

if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        # A single shared connection is only needed for an in-memory database. For a file
        # database, one connection per request is safe and avoids cross-request transaction bleed.
        poolclass=StaticPool if IS_MEMORY else None,
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def utcnow() -> datetime:
    """Naive UTC timestamp (what the DateTime columns store)"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def init_db() -> None:
    """Create tables if they do not exist"""
    Base.metadata.create_all(bind=engine)


def reset_db() -> None:
    """Drop and recreate all tables"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_db() -> Iterator[Session]:
    """Database session context manager (rolls back on error, always closes)"""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def json_loads(value: Any) -> Any:
    """Safe JSON parsing that handles empty strings"""
    if not value or (isinstance(value, str) and value.strip() == ""):
        return []
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return []


def json_dumps(value: Any) -> str:
    """Safe JSON serialization"""
    if value is None:
        return "[]"
    return json.dumps(value, ensure_ascii=False)

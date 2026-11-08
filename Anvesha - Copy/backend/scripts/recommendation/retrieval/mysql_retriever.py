"""
MySQL database candidate retriever for Mumbai recommendation engine.
"""
from __future__ import annotations

import logging

from scripts.recommendation.config import settings

logger = logging.getLogger("anvesha.recommendation.mysql_retriever")

MUMBAI_PLACES_COLUMNS = [
    "provider_id", "provider_name", "address", "latitude", "longitude",
    "category", "sub_category", "description", "experience_tags",
    "traveller_tags", "cost_basis", "est_cost_per_person_inr",
    "people_per_experience", "recommended_duration", "opening_hours",
    "weekly_closure", "rating", "review_count", "indoor_outdoor",
    "signature_items", "local_score", "local_confidence",
    "local_recommendation_count", "local_tips", "last_verified", "source_url",
]


def _get_connection():
    import pymysql  # type: ignore

    return pymysql.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD,
        database=settings.MYSQL_DATABASE,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def fetch_mumbai_places_raw() -> list[dict]:
    query = f"SELECT {', '.join(MUMBAI_PLACES_COLUMNS)} FROM mumbai_places"
    try:
        conn = _get_connection()
    except ImportError:
        logger.error("PyMySQL not installed. Install via `pip install pymysql` or set MUMBAI_DATA_SOURCE=json.")
        raise
    try:
        with conn.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
        logger.info("Fetched %d rows from MySQL mumbai_places table.", len(rows))
        return list(rows)
    finally:
        conn.close()

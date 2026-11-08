import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from catalog import experience_catalog, refresh_catalog  # noqa: F401  (re-exported for convenience)
from database import BASE_DIR, get_db, init_db, reset_db, utcnow
from seed_database import ensure_seeded, seed_all

load_dotenv(os.path.join(BASE_DIR, ".env"))

# LOG_LEVEL (backend/.env) controls the app's own logs, e.g. which data source / LLM served a request
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(levelname)s:     %(name)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)  # never print outgoing request URLs


class Settings:
    def __init__(self):
        self.port = int(os.getenv("PORT", "8000"))
        origins = [o.strip() for o in os.getenv("CORS_ORIGIN", "*").split(",") if o.strip()]
        self.cors_origins = origins or ["*"]


settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables, seed on first run, load the catalog used by the AI engine"""
    init_db()
    with get_db() as db:
        ensure_seeded(db)
    refresh_catalog()
    yield


app = FastAPI(title="Anvesha API", lifespan=lifespan)

# The frontend sends no cookies, so credentials stay off (a wildcard origin can't be combined with them)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    """Health check endpoint"""
    ok = True
    try:
        with get_db() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        ok = False
    return {"ok": ok, "database": "sqlite", "time": utcnow().isoformat() + "Z"}


@app.post("/api/demo/reset")
def demo_reset():
    """Reset demo data: rebuild the tables and reload the seed files"""
    reset_db()
    with get_db() as db:
        seed_all(db, clear=False)
    refresh_catalog()
    return {"ok": True}


# Routers are imported after the app exists; none of them import this module
from routers import ai, bookings, experiences, payments, providers, weather  # noqa: E402

app.include_router(experiences.router, prefix="/api")
app.include_router(ai.router, prefix="/api/ai")
app.include_router(bookings.router, prefix="/api")
app.include_router(providers.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(payments.router, prefix="/api/payments")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.port)

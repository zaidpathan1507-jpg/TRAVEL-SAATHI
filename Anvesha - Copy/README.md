# Anvesha — Intelligent Local Discovery & Experience Platform

A traveler describes their plan in plain language. Anvesha extracts the constraints, ranks local experiences by how well they fit, builds a timed itinerary, adapts it in real time (rain, less time) and books it in one checkout. Providers see the booking, live traveler demand and manage their availability.

## Project layout

```
Anvesha/
├── frontend/          React + TypeScript + Tailwind + Lucide (Vite). Traveler app + provider dashboard.
├── backend/           FastAPI (Python) REST API. AI matching, itineraries, bookings, availability, analytics.
├── database/          SQLite database with seed data (JSON)
├── anvesha-demo.html   The whole frontend in one file. Double-click to demo with no install.
└── package.json       Root scripts that drive frontend and backend
```

### How the three parts connect

```
frontend  ──HTTP /api/*──▶  backend  ──SQL──▶  database (SQLite)
|(port 5173)                 (port 8000)
```

- **frontend → backend:** `frontend/src/api/client.ts`. In development Vite forwards `/api` to `http://localhost:8000` (see `frontend/vite.config.ts`). In production set `VITE_API_URL` to the backend's URL.
- **backend → database:** SQLite database with SQLAlchemy ORM. Database file is created automatically on first run.
- **Offline fallback:** if the backend isn't reachable, the frontend switches to its bundled sample data, so the demo never breaks on stage. Open **Demo flow** in the header to see which mode you're in: "Backend connected" or "Offline demo mode".

## Run locally

Requires:
- Node.js 18.18 or newer (for frontend)
- Python 3.10+ (for backend)

```bash
# Install frontend dependencies
npm --prefix frontend install

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# Run backend (FastAPI on port 8000). The SQLite database (backend/anvesha.db) is created
# and filled from database/seed/*.json automatically on first start.
npm run start:backend

# Run frontend (Vite on port 5173) - in a separate terminal
npm run dev:frontend

# Optional: rebuild the database from the seed files / run the API smoke test
npm run seed:backend
npm run test:backend
```

API docs are served by FastAPI at http://localhost:8000/docs while the backend is running.

## Deploy

|| Part | Where | Settings |
||---|---|---|
|| database | SQLite (file-based) | No external database needed - runs with the backend |
|| backend | Render / Railway / Fly.io (Web Service) | Root directory `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port 8000`. Env: `PORT`, `CORS_ORIGIN` |
|| frontend | Vercel / Netlify | Root directory `frontend`, build `npm run build`, output `dist`. Env: `VITE_API_URL=https://your-backend-url.com` |

## API keys

Every key is **optional**. Without any key the whole app runs locally (local dataset + SQLite catalog, rule-based plans, SVG map).

|| Feature | Key (in `backend/.env`) | Without it |
||---|---|---|
|| Live place shortlist | `GOOGLE_PLACES_API_KEY` (Google Places API) | Places come from the local dataset and the SQLite catalog |
|| AI trip plans (3-4 timed plans on the Recommendations page) | `GEMINI_API_KEY` (model: `GEMINI_MODEL`, default `gemini-2.5-flash`) | The rule-based planner builds the plans; each card is labelled "Local plan" |
|| Weather at the itinerary stops (current conditions) | `OPENWEATHER_API_KEY` (OpenWeather free plan is enough) | The weather card shows that it is unavailable |
|| Interactive map | `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env` | Stylized SVG map of Pune |
|| NL parsing, match scores, itinerary, rain/time adaptation | none | Rule-based engine in `backend/ai_engine.py` |
|| Online payment on the Booking page | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test keys start with `rzp_test_`) | The demo UPI / card / pay-later screens are used (no money moves) |
|| Weather "rain at 5 PM" simulation | none | Simulated |

How the Recommendations page is built: the request (city, time, budget, group, interests) shortlists places and their features (rating, price level, opening hours, category, distance) → the shortlist goes to Gemini → Gemini returns 3-4 plans made only of shortlisted places → the server validates them (unknown places are dropped) and computes times, travel and cost. Keys stay in `backend/.env`; the browser never calls Gemini or Places directly.

## API reference

|| Method | Path | Purpose |
||---|---|---|
|| GET | `/api/health` | Status and which database is active |
|| GET | `/api/experiences` | Full catalog |
|| GET | `/api/experiences/:id` | One experience |
|| POST | `/api/ai/parse` | `{ text, trip? }` → extracted constraints |
|| POST | `/api/ai/recommend` | `{ query?, mode?, trip?, limit? }` → `{ recommendations[], engine_meta }` ranked places with reasons. `mode` is `auto` (default: local dataset + SQLite catalog; live Google Places only if a key is set), `mumbai` (local) or `google` (needs a key) |
|| POST | `/api/ai/trip-plans` | Same body as `/recommend`. Shortlists places (Google Places when a key is set, otherwise the local data), sends the shortlist and its features to Gemini, and returns `{ shortlist, plans[3-4], plan_meta }`. Each plan is a themed, timed itinerary; times and costs are computed by the server. Without a Gemini key, or if the call fails, the rule-based planner builds the plans |
|| POST | `/api/weather` | `{ stops:[{ id, name, lat, lng }] }` → current weather (and rain chance) at each stop's own location, using OpenWeather. Shown in the weather row of the Itinerary page's "Plans change. Anvesha adapts." card |
|| GET | `/api/ai/maps-key` | Google Maps key for the frontend map (empty when none is configured) |
|| POST | `/api/ai/plan` | `{ primaryId \| ids, trip }` → timed itinerary + checks |
|| POST | `/api/ai/adapt/rain` | `{ ids, trip }` → affected stops + indoor alternatives |
|| POST | `/api/ai/adapt/time` | `{ ids, trip, minutes }` → shortened plan + minutes saved |
|| GET | `/api/payments/config` | Whether Razorpay is configured (public key id only) |
|| POST | `/api/payments/order` | `{ items, date, adults, children }` → Razorpay order; the amount is priced by the server from the database |
|| POST | `/api/payments/verify` | `{ razorpayOrderId, razorpayPaymentId, razorpaySignature, booking }` → verifies the signature and the payment with Razorpay, then creates the bookings |
|| POST | `/api/bookings` | Checkout: `{ items:[{expId,time}], date, adults, children, payment }` |
|| GET | `/api/bookings?providerId=` | Provider's bookings |
|| PATCH | `/api/bookings/:id` | `{ status }` Confirmed / Pending / Completed / Cancelled |
|| GET | `/api/providers/:id/availability?from=&days=` | Calendar: `{ experienceId: { date: [slots] } }` |
|| PATCH | `/api/availability` | Open/close a slot or change capacity |
|| POST | `/api/providers/:id/experiences` | Publish a new experience |
|| GET | `/api/providers/:id/analytics` | Charts data |
|| POST | `/api/demo/reset` | Reset demo data |

Prices are always recalculated on the server, so the client can't change what a booking costs.

## Demo script (≈4 minutes)

Click **Demo flow** in the header at any time to jump to a step, or **Reset demo** to start fresh.

1. **Home**: trip context (Pune · 3h · ₹2,000 · family of 4) and curated picks with match %.
2. **Ask AI**: the request types itself; *"AI understood your request"* shows location, time, budget, group, interests, distance.
3. **Find Experiences**: ranked list, filters, and **"Why this matches"** on each card.
4. **Traditional Pune Food Walk**: 92% match with the score breakdown.
5. **Add to AI itinerary**: Shaniwar Wada is added before the food walk; budget, time and family checks.
6. **Map**: numbered route with travel times.
7. **Simulate rain at 5 PM**: the outdoor stop is flagged; 3 indoor alternatives; **Replace Experience**.
8. **Less time**: "You now have only 90 minutes" with minutes saved.
9. **Book All** → **Confirm Booking** → confirmation with QR.
10. **Provider dashboard**: Raj sees the new booking, demand insights, availability, bookings and analytics.

## Images

Experience imagery currently uses placeholder images. To use real photos, set `image_url` on an experience (in the database or via the API). The frontend will display the provided image URL; otherwise it shows a placeholder.

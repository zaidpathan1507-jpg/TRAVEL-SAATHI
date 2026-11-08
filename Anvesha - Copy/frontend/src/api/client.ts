/**
 * Typed client for the Anvesha backend (FastAPI, backend/main.py).
 * Every call has a timeout (1.5 s health check, 15-20 s otherwise) so the app can fall back to its bundled demo data
 * when the API isn't running, e.g. when opening anvesha-demo.html directly.
 */
import type { Experience, ProviderBooking, Trip } from '../lib/types';
import type { ParsedField } from '../lib/engine';
import type { PSlot } from '../store/AppStore';

const BASE = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

/** FastAPI reports errors as { detail: string } or, for validation failures, { detail: [{ msg, loc }] } */
function errorMessage(data: unknown, status: number): string {
  const d = data as { error?: string; detail?: string | { msg?: string; loc?: (string | number)[] }[] };
  if (typeof d.error === 'string') return d.error;
  if (typeof d.detail === 'string') return d.detail;
  if (Array.isArray(d.detail) && d.detail.length) return d.detail.map((x) => [x.loc?.slice(1).join('.'), x.msg].filter(Boolean).join(': ')).join('; ');
  return `HTTP ${status}`;
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorMessage(data, res.status));
    return data as T;
  } finally {
    clearTimeout(t);
  }
}

export type Availability = Record<string, Record<string, PSlot[]>>;

export interface RecommendationItem {
  place_id: string;
  source: 'google' | 'mumbai';
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category: string[];
  distance_km?: number;
  estimated_cost_per_person?: number;
  cost_note?: string;
  rating?: number;
  opening_status?: string;
  semantic_score?: number;
  constraint_score?: number;
  final_score: number;
  match_reasons: string[];
  score_breakdown: Record<string, number | null>;
  details: Record<string, any>;
}

export interface RecommendApiResponse {
  query_id: string;
  mode: 'mumbai' | 'google';
  intent: any;
  recommendations: RecommendationItem[];
  engine_meta: {
    candidates_considered: number;
    candidates_after_constraints: number;
    engine: 'mumbai' | 'google';
    data_source?: string;
    warnings: string[];
  };
  generated_at: number;
}

export interface PlanStop {
  placeId: string;
  name: string;
  category: string | null;
  start: number;
  end: number;
  durationMin: number;
  travelMin: number;
  travelKm: number;
  costPerPerson: number | null;
  costEstimated: boolean;
  rating: number | null;
  note: string;
}

/** One themed, timed plan. All times and costs are computed by the backend. */
export interface TripPlan {
  id: string;
  title: string;
  tagline: string;
  why: string;
  source: 'gemini' | 'local';
  stops: PlanStop[];
  startMin: number;
  endMin: number;
  totalMin: number;
  travelKm: number;
  perPerson: number;
  groupCost: number;
  withinBudget: boolean;
  warnings: string[];
}

export interface TripPlansResponse {
  shortlist: RecommendApiResponse;
  plans: TripPlan[];
  plan_meta: { generator: 'gemini' | 'mixed' | 'local' | 'none'; model: string | null; warnings: string[] };
}

/** Weather right now at one itinerary stop (OpenWeather, for that place's own coordinates) */
export interface StopForecast {
  id: string;
  name: string;
  at: string;
  forecastFor: string | null;
  condition: string;
  type: string;
  isDaytime: boolean;
  tempC: number | null;
  feelsLikeC: number | null;
  rainChance: number | null;
  rainMm: number | null;
  windKph: number | null;
  humidity: number | null;
}

export interface PaymentConfig {
  enabled: boolean;
  keyId: string | null;
  mode: 'test' | 'live' | null;
}

export interface PaymentOrder {
  orderId: string;
  /** in paise */
  amount: number;
  currency: string;
  keyId: string;
  /** rupees, priced by the server */
  total: number;
  quote: { subtotal: number; discount: number; fees: number; total: number };
}

export interface CheckoutRequest {
  items: { expId: string; time: number }[];
  date: string;
  adults: number;
  children: number;
  payment: 'upi' | 'card' | 'later';
  customer: string;
  from: string;
  travelerType?: string;
}

export const api = {
  health: () => request<{ ok: boolean; database: string }>('GET', '/api/health', undefined, 1500),
  experiences: () => request<Experience[]>('GET', '/api/experiences'),
  parse: (text: string, trip: Trip) => request<{ trip: Trip; patch: Partial<Trip>; fields: ParsedField[] }>('POST', '/api/ai/parse', { text, trip }),
  recommend: (query?: string, mode = 'auto', trip?: Trip, limit = 20) =>
    request<RecommendApiResponse>('POST', '/api/ai/recommend', { query, mode, trip, limit }, 20000),
  /** Shortlist places for the trip, then 3-4 timed plans built from them (Gemini, or the local planner) */
  tripPlans: (query: string | undefined, mode: string, trip: Trip, limit = 20) =>
    request<TripPlansResponse>('POST', '/api/ai/trip-plans', { query, mode, trip, limit }, 60000),
  /** Current weather at each stop's own coordinates (OpenWeather, via the backend) */
  weather: (stops: { id: string; name: string; lat: number; lng: number }[]) =>
    request<{ stops: StopForecast[]; source: string; asOf: string }>('POST', '/api/weather', { stops }, 20000),
  /** Is online payment (Razorpay) configured on the backend? */
  paymentConfig: () => request<PaymentConfig>('GET', '/api/payments/config', undefined, 3000),
  /** The server prices the checkout from the database and creates the Razorpay order */
  createPaymentOrder: (b: { items: { expId: string; time: number }[]; date: string; adults: number; children: number }) => request<PaymentOrder>('POST', '/api/payments/order', b, 20000),
  /** The server verifies the payment with Razorpay, then creates the bookings */
  verifyPayment: (b: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string; booking: Omit<CheckoutRequest, 'payment'> & { payment: string } }) =>
    request<{ checkoutId: string; total: number; bookings: ProviderBooking[]; paymentId: string }>('POST', '/api/payments/verify', b, 30000),
  checkout: (b: CheckoutRequest) => request<{ checkoutId: string; total: number; bookings: ProviderBooking[] }>('POST', '/api/bookings', b),
  providerBookings: (providerId: string) => request<ProviderBooking[]>('GET', `/api/bookings?providerId=${encodeURIComponent(providerId)}`),
  updateBooking: (id: string, status: ProviderBooking['status']) => request<ProviderBooking>('PATCH', `/api/bookings/${encodeURIComponent(id)}`, { status }),
  availability: (providerId: string, from: string, days = 14) => request<Availability>('GET', `/api/providers/${providerId}/availability?from=${from}&days=${days}`),
  updateSlot: (s: { experienceId: string; date: string; time: number; capacity?: number; enabled?: boolean }) => request('PATCH', '/api/availability', s),
  publish: (providerId: string, e: Experience) => request<Experience>('POST', `/api/providers/${providerId}/experiences`, e),
  reset: () => request('POST', '/api/demo/reset'),
};

/**
 * Anvesha constraint-matching engine (client-side mock of the AI layer).
 * - parseQuery: natural language -> structured trip constraints
 * - scoreExperience: weighted constraint fit + human-readable reasons
 * - buildPlan: itinerary with travel legs
 * - rain / time adaptation helpers
 */
import { EXPERIENCES, byId, CATEGORY_META } from '../data/experiences';
import type { Category, Experience, MatchResult, Plan, Reason, TimelineItem, Trip } from './types';
import { HOTEL, distKm, travelMin, travelMode, type Pt } from './geo';
import { clock, dur, inr, km } from './format';

export const NOW = 16 * 60; // demo clock: 4:00 PM
export const RAIN_AT = 17 * 60; // rain expected at 5:00 PM

export const groupSize = (t: Trip) => t.adults + t.children;
export const perPersonBudget = (t: Trip) => (t.budgetMode === 'group' ? t.budget / Math.max(1, groupSize(t)) : t.budget);
export const groupLabel = (t: Trip) =>
  t.groupType === 'family' ? `Family of ${groupSize(t)}` : t.groupType === 'couple' ? 'Couple' : t.groupType === 'solo' ? 'Solo' : `${groupSize(t)} friends`;
export const interestLabel = (t: Trip) => t.interests.map((i) => CATEGORY_META[i]?.label ?? i).join(' + ');

export const groupCostFor = (e: Experience, t: Trip) => t.adults * e.price + t.children * (e.childPrice ?? e.price);

const nextSlotFor = (e: Experience, from: number) => e.slots.filter((s) => s.time >= from - 5 && s.left > 0).sort((a, b) => a.time - b.time)[0];

export function scoreExperience(e: Experience, trip: Trip, origin: Pt = HOTEL): MatchResult {
  const d = distKm(origin, e);
  const tr = travelMin(d);
  const slot = nextSlotFor(e, trip.startMin);
  const budget = perPersonBudget(trip);
  const reasons: Reason[] = [];

  // interest
  const interest = trip.interests.length === 0 ? 0.7 : trip.interests.includes(e.category) ? 1 : e.tags.some((x) => trip.interests.includes(x)) ? 0.8 : 0.2;
  const matched = e.tags.filter((x) => trip.interests.includes(x)).map((x) => CATEGORY_META[x].label);
  reasons.push(interest >= 0.8 ? { ok: true, kind: 'interest', text: `Matches your interests: ${matched.join(' + ')}` } : { ok: false, kind: 'interest', text: `Not quite your interests (${CATEGORY_META[e.category].label})` });

  // distance
  const distScore = d <= trip.maxKm ? 1 - (d / trip.maxKm) * 0.3 : 0.2;
  reasons.push({ ok: d <= trip.maxKm, kind: 'distance', text: `${km(d)} away · ${tr} min by ${travelMode(d) === 'walk' ? 'walk' : 'auto'}` });

  // time
  const needed = e.durationMin + tr * 2;
  const timeScore = needed <= trip.minutes ? 1 : Math.max(0, 1 - (needed - trip.minutes) / 60);
  reasons.push({ ok: needed <= trip.minutes, kind: 'time', text: needed <= trip.minutes ? `${dur(e.durationMin)} — fits your ${dur(trip.minutes)} window` : `${dur(e.durationMin)} — longer than your free time` });

  // budget
  const budgetScore = e.price <= budget ? 1 : e.price <= budget * 1.2 ? 0.5 : 0;
  reasons.push({
    ok: e.price <= budget,
    kind: 'budget',
    text: e.price === 0 ? 'Free to join' : e.price <= budget ? `${inr(e.price)}/person — under your ${inr(budget)} budget` : `${inr(e.price)}/person — over your budget`,
  });

  // group
  const groupScore = trip.groupType === 'family' ? (e.familyFriendly ? 1 : 0) : 1;
  if (trip.groupType === 'family') reasons.push({ ok: e.familyFriendly, kind: 'group', text: e.familyFriendly ? `Family friendly${e.childPrice !== undefined && e.childPrice < e.price ? ` · kids ${e.childPrice === 0 ? 'free' : inr(e.childPrice)}` : ''}` : 'Not suitable for kids' });

  // availability
  const availScore = slot ? (slot.time - trip.startMin <= 60 ? 1 : 0.7) : 0;
  reasons.push(slot ? { ok: true, kind: 'availability', text: `Available at ${clock(slot.time)} · ${slot.left} spots left` } : { ok: false, kind: 'availability', text: 'No slots left today' });

  // weather
  let weatherScore = 1;
  if (trip.weather === 'rain' || trip.indoorOnly) {
    weatherScore = e.indoor ? 1 : 0;
    reasons.push(e.indoor ? { ok: true, kind: 'weather', text: 'Indoor — rain-proof' } : { ok: false, kind: 'weather', text: 'Outdoor — rain expected at 5 PM' });
  }

  // access
  let accessPenalty = 0;
  if (trip.wheelchair) {
    reasons.push({ ok: e.wheelchair, kind: 'access', text: e.wheelchair ? 'Wheelchair accessible' : 'Not wheelchair accessible' });
    if (!e.wheelchair) accessPenalty = 0.25;
  }
  if (trip.lowWalking && e.walking === 'high') accessPenalty += 0.12;

  const ratingScore = Math.max(0, Math.min(1, (e.rating - 4.2) / 0.8));

  const breakdown = [
    { key: 'interest', label: 'Interests', value: interest, weight: 0.26 },
    { key: 'time', label: 'Time fit', value: timeScore, weight: 0.14 },
    { key: 'budget', label: 'Budget', value: budgetScore, weight: 0.14 },
    { key: 'distance', label: 'Distance', value: distScore, weight: 0.12 },
    { key: 'availability', label: 'Availability', value: availScore, weight: 0.1 },
    { key: 'weather', label: 'Weather', value: weatherScore, weight: 0.1 },
    { key: 'group', label: 'Group fit', value: groupScore, weight: 0.08 },
    { key: 'rating', label: 'Ratings', value: ratingScore, weight: 0.06 },
  ];
  const raw = breakdown.reduce((s, b) => s + b.value * b.weight, 0) - accessPenalty;
  const score = Math.max(35, Math.min(98, Math.round(raw * 94)));

  // order: positives first, keep the list short and readable
  reasons.sort((a, b) => Number(b.ok) - Number(a.ok));
  return { score, reasons, breakdown, distance: d, travel: tr, nextSlot: slot };
}

export function recommend(trip: Trip, list: Experience[] = EXPERIENCES) {
  return list
    .filter((e) => (trip.groupType === 'family' ? e.familyFriendly : true))
    .map((e) => ({ exp: e, match: scoreExperience(e, trip) }))
    .sort((a, b) => b.match.score - a.match.score);
}

/* ---------------------------------- Itinerary ---------------------------------- */

export function buildPlan(ids: string[], trip: Trip): Plan {
  const items: TimelineItem[] = [];
  let t = trip.startMin;
  let pos: Pt = HOTEL;
  let travelKm = 0;
  let groupCost = 0;
  for (const id of ids) {
    const e = byId(id);
    const d = distKm(pos, e);
    const m = travelMin(d);
    const mode = travelMode(d);
    items.push({ kind: 'travel', start: t, end: t + m, label: mode === 'walk' ? `Walk to ${e.area}` : `Auto-rickshaw to ${e.area}`, sub: `${km(d)} · ${m} min`, distance: d, mode });
    t += m;
    travelKm += d;
    // round start up to the next 5 minutes
    t = Math.ceil(t / 5) * 5;
    items.push({ kind: 'activity', start: t, end: t + e.durationMin, label: e.title, sub: `${e.area} · ${dur(e.durationMin)}`, expId: e.id });
    t += e.durationMin;
    groupCost += groupCostFor(e, trip);
    pos = e;
  }
  if (ids.length) {
    const d = distKm(pos, HOTEL);
    const m = travelMin(d);
    items.push({ kind: 'return', start: t, end: t + m, label: 'Return to hotel', sub: `${HOTEL.name} · ${km(d)} · ${m} min`, distance: d, mode: travelMode(d) });
    t += m;
    travelKm += d;
  }
  return {
    items,
    totalMin: t - trip.startMin,
    travelKm: Math.round(travelKm * 10) / 10,
    groupCost,
    perPerson: Math.round(groupCost / Math.max(1, groupSize(trip))),
    endMin: t,
  };
}

/** Given a primary experience, pick a complementary one that still fits the trip. */
export function composePlan(primaryId: string, trip: Trip): string[] {
  const primary = byId(primaryId);
  const remaining = trip.minutes - primary.durationMin - 30;
  const want: Category[] = trip.interests.filter((i) => i !== primary.category);
  const candidates = recommend(trip)
    .filter(({ exp }) => exp.id !== primaryId && exp.durationMin <= remaining && exp.category !== primary.category)
    .filter(({ exp }) => (want.length ? exp.tags.some((x) => want.includes(x)) : true))
    .sort((a, b) => b.match.score - 5 * distKm(b.exp, primary) - (a.match.score - 5 * distKm(a.exp, primary)));
  const pick = candidates.find((c) => c.match.score >= 70 && c.exp.durationMin >= 40) ?? candidates[0];
  if (!pick) return [primaryId];
  // Heritage / daylight experiences go first, food last
  return primary.category === 'food' ? [pick.exp.id, primaryId] : [primaryId, pick.exp.id];
}

export function planChecks(plan: Plan, ids: string[], trip: Trip) {
  const exps = ids.map(byId);
  return [
    { ok: plan.perPerson <= perPersonBudget(trip), text: 'Within budget' },
    { ok: plan.totalMin <= trip.minutes, text: 'Within available time' },
    ...(trip.groupType === 'family' ? [{ ok: exps.every((e) => e.familyFriendly), text: 'Family friendly' }] : []),
    ...(trip.weather === 'rain' ? [{ ok: rainAffected(ids, trip).length === 0, text: 'Rain-proof' }] : []),
  ];
}

/* ---------------------------------- Adaptation ---------------------------------- */

export function rainAffected(ids: string[], trip: Trip): string[] {
  const plan = buildPlan(ids, trip);
  return plan.items.filter((i) => i.kind === 'activity' && i.end > RAIN_AT && !byId(i.expId!).indoor).map((i) => i.expId!);
}

export function rainAlternatives(affectedId: string, ids: string[], trip: Trip) {
  const affected = byId(affectedId);
  const rainTrip: Trip = { ...trip, weather: 'rain' };
  return recommend(rainTrip)
    .filter(({ exp }) => exp.indoor && !ids.includes(exp.id) && exp.durationMin <= affected.durationMin + 20 && exp.durationMin >= affected.durationMin * 0.4)
    .filter(({ exp }) => {
      const next = ids.map((x) => (x === affectedId ? exp.id : x));
      return buildPlan(next, rainTrip).totalMin <= trip.minutes;
    })
    .slice(0, 3);
}

export function compressPlan(ids: string[], trip: Trip, newMinutes: number) {
  const t2: Trip = { ...trip, minutes: newMinutes };
  const before = buildPlan(ids, trip);
  if (before.totalMin <= newMinutes) return { ids, removed: [] as string[], added: [] as string[], saved: 0, before, after: before };
  const pool = recommend(t2).filter((r) => r.match.nextSlot && r.match.score >= 70).map((r) => r.exp.id);
  const score = (x: string) => scoreExperience(byId(x), t2).score;
  const candidates: string[][] = [];
  // keep some, swap one, or drop one
  ids.forEach((rid, idx) => {
    candidates.push(ids.filter((x) => x !== rid));
    pool.forEach((nid) => {
      if (ids.includes(nid)) return;
      const next = [...ids];
      next[idx] = nid;
      candidates.push(next);
    });
  });
  // fresh short combinations near you
  pool.forEach((a) => {
    candidates.push([a]);
    pool.forEach((b) => a !== b && candidates.push([a, b]));
  });
  let best: { ids: string[]; value: number } | null = null;
  for (const c of candidates) {
    if (!c.length) continue;
    const p = buildPlan(c, t2);
    if (p.totalMin > newMinutes) continue;
    const removed = ids.filter((x) => !c.includes(x)).length;
    const value = c.reduce((s, x) => s + score(x), 0) + 15 * c.length - 10 * removed;
    if (!best || value > best.value) best = { ids: c, value };
  }
  if (!best) return { ids, removed: [], added: [], saved: 0, before, after: before };
  const after = buildPlan(best.ids, t2);
  return {
    ids: best.ids,
    removed: ids.filter((x) => !best!.ids.includes(x)),
    added: best.ids.filter((x) => !ids.includes(x)),
    saved: before.totalMin - after.totalMin,
    before,
    after,
  };
}

/* ---------------------------------- NL parsing ---------------------------------- */

const CITIES = ['Pune', 'Mumbai', 'Goa', 'Jaipur', 'Delhi', 'Bengaluru', 'Bangalore', 'Udaipur', 'Kochi', 'Hyderabad', 'Chennai', 'Kolkata', 'Varanasi', 'Mysuru', 'Nashik', 'Lonavala'];

const INTEREST_WORDS: [Category, RegExp][] = [
  ['food', /\b(food|eat|eating|cuisine|street food|snacks?|misal|foodie|lunch|dinner|breakfast|sweets?|cafes?|chai)\b/i],
  ['culture', /\b(cultur(e|al)|traditions?|traditional|local life|festivals?|community)\b/i],
  ['history', /\b(history|historic(al)?|heritage|forts?|museums?|palaces?|temples?)\b/i],
  ['art', /\b(art|arts|pottery|crafts?|workshops?|painting|warli)\b/i],
  ['music', /\b(music|concerts?|live music|dhol|singing|classical)\b/i],
  ['shopping', /\b(shop|shopping|markets?|souvenirs?|bazaar)\b/i],
  ['nature', /\b(nature|hills?|parks?|gardens?|sunset|green|outdoors?)\b/i],
  ['adventure', /\b(adventure|treks?|trekking|hikes?|hiking|climb)\b/i],
  ['nightlife', /\b(nightlife|bars?|pubs?|clubs?|party|drinks)\b/i],
];

export interface ParsedField {
  key: string;
  label: string;
  value: string;
  assumed?: boolean;
}

export function parseQuery(text: string, base: Trip): { patch: Partial<Trip>; fields: ParsedField[] } {
  const q = text.trim();
  const patch: Partial<Trip> = {};
  const fields: ParsedField[] = [];

  // location
  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(q));
  patch.city = city ? (city === 'Bangalore' ? 'Bengaluru' : city) : base.city;
  fields.push({ key: 'location', label: 'Location', value: patch.city, assumed: !city });

  // time
  let minutes: number | undefined;
  const h = q.match(/(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(hours?|hrs?|h)\b/i);
  const m = q.match(/(\d+)\s*(minutes?|mins?)\b/i);
  if (h) minutes = Math.round(parseFloat(h[1]) * 60) + (m ? parseInt(m[1]) : 0);
  else if (m) minutes = parseInt(m[1]);
  else if (/half[- ]day/i.test(q)) minutes = 240;
  else if (/full[- ]day|whole day/i.test(q)) minutes = 480;
  else if (/an hour|one hour/i.test(q)) minutes = 60;
  patch.minutes = minutes ?? base.minutes;
  fields.push({ key: 'time', label: 'Available time', value: dur(patch.minutes), assumed: !minutes });

  // group
  const famOf = q.match(/family of (\d+)/i);
  const groupOf = q.match(/(?:group of|we are|we're)\s*(\d+)/i);
  if (famOf || /\b(family|kids|children|parents|son|daughter)\b/i.test(q)) {
    const n = famOf ? parseInt(famOf[1]) : 4;
    patch.groupType = 'family';
    patch.adults = Math.max(1, Math.min(n, 2));
    patch.children = Math.max(0, n - 2);
  } else if (/\b(couple|partner|wife|husband|girlfriend|boyfriend|anniversary|honeymoon)\b/i.test(q)) {
    patch.groupType = 'couple';
    patch.adults = 2;
    patch.children = 0;
  } else if (/\b(friends|buddies|gang)\b/i.test(q) || groupOf) {
    patch.groupType = 'friends';
    patch.adults = groupOf ? parseInt(groupOf[1]) : 4;
    patch.children = 0;
  } else if (/\b(alone|solo|myself|just me)\b/i.test(q)) {
    patch.groupType = 'solo';
    patch.adults = 1;
    patch.children = 0;
  }
  const g = { ...base, ...patch } as Trip;
  fields.push({ key: 'group', label: 'Group', value: g.groupType === 'family' ? `Family · ${g.adults} adults, ${g.children} kids` : groupLabel(g), assumed: !patch.groupType });

  // budget
  const budgetRe = /(?:under|below|less than|within|budget(?: of| is)?|max(?:imum)?|upto|up to|₹|rs\.?|inr)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k\b)?(\s*(?:km|kms|hours?|hrs?|h\b|mins?|minutes?))?/gi;
  const b = Array.from(q.matchAll(budgetRe)).find((x) => !x[3] && parseFloat(x[1].replace(/,/g, '')) * (x[2] ? 1000 : 1) >= 50);
  if (b) {
    let v = parseFloat(b[1].replace(/,/g, ''));
    if (b[2]) v *= 1000;
    patch.budget = v;
    patch.budgetMode = /(per person|each|\bpp\b|per head)/i.test(q) ? 'person' : /(total|for all|for us|altogether)/i.test(q) ? 'group' : 'person';
  }
  const bb = { ...base, ...patch } as Trip;
  fields.push({ key: 'budget', label: 'Budget', value: `${inr(bb.budget)} ${bb.budgetMode === 'person' ? 'per person' : 'total'}`, assumed: !b });

  // interests
  const found = INTEREST_WORDS.filter(([, re]) => re.test(q)).map(([c]) => c);
  if (found.length) patch.interests = Array.from(new Set(found));
  fields.push({ key: 'interests', label: 'Interests', value: (patch.interests ?? base.interests).map((i) => CATEGORY_META[i].label).join(' + '), assumed: !found.length });

  // distance
  const dm = q.match(/within\s*(\d+(?:\.\d+)?)\s*km/i) || q.match(/(\d+(?:\.\d+)?)\s*km/i);
  if (dm) patch.maxKm = parseFloat(dm[1]);
  else if (/nearby|near me|close by|walking distance/i.test(q)) patch.maxKm = 2;
  fields.push({ key: 'distance', label: 'Distance', value: `Within ${patch.maxKm ?? base.maxKm} km`, assumed: !dm });

  // extras
  if (/\bindoor|rain(y)?\b/i.test(q)) {
    patch.indoorOnly = true;
    fields.push({ key: 'indoor', label: 'Setting', value: 'Indoor only' });
  }
  if (/wheelchair|accessible|elderly|grand(ma|pa|parents)/i.test(q)) {
    patch.wheelchair = true;
    fields.push({ key: 'access', label: 'Accessibility', value: 'Step-free access' });
  }
  if (/less walking|no walking|can't walk|cannot walk|minimal walking/i.test(q)) {
    patch.lowWalking = true;
    fields.push({ key: 'walking', label: 'Walking', value: 'Minimal walking' });
  }
  if (/\b(veg|vegetarian|jain)\b/i.test(q)) {
    patch.vegetarian = true;
    fields.push({ key: 'veg', label: 'Food', value: 'Vegetarian' });
  }
  return { patch, fields };
}

export const DEMO_QUERY = 'I have 3 hours in Pune with my family. We want local food and something cultural under ₹2000 and within 5 km.';

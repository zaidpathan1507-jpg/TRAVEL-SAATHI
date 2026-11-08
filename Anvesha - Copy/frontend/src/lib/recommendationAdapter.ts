import type { Category, Experience, MatchResult } from './types';
import type { RecommendationItem } from '../api/client';
import type { Trip } from './types';
import { EXPERIENCES } from '../data/experiences';
import { getExperienceImage } from '../data/experienceImages';
import { scoreExperience } from './engine';
import { latLngToPt } from './geo';

function normalizeCategory(cats: string[]): Category {
  for (const c of cats) {
    const k = String(c).toLowerCase().replace(/_/g, '');
    if (k.includes('food') || k.includes('restaurant') || k.includes('cafe') || k.includes('bakery')) return 'food';
    if (k.includes('shop') || k.includes('store') || k.includes('mall')) return 'shopping';
    if (k.includes('nature') || k.includes('park') || k.includes('garden')) return 'nature';
    if (k.includes('history') || k.includes('worship') || k.includes('fort') || k.includes('palace') || k.includes('temple')) return 'history';
    if (k.includes('art')) return 'art';
    if (k.includes('music')) return 'music';
    if (k.includes('night') || k.includes('bar')) return 'nightlife';
    if (k.includes('family')) return 'family';
    if (k.includes('advent')) return 'adventure';
    if (k.includes('cultur') || k.includes('tourist') || k.includes('attraction') || k.includes('museum') || k.includes('point')) return 'culture';
  }
  return 'culture';
}

/**
 * Catalog places come back from the API as `db:<experience id>`. Use the full catalog experience
 * (slots, reviews, image, real map position) and score it with the same engine as every other page.
 */
function catalogEntry(rec: RecommendationItem, trip: Trip): { exp: Experience; match: MatchResult } | null {
  if (!rec.place_id.startsWith('db:')) return null;
  const exp = EXPERIENCES.find((e) => e.id === rec.place_id.slice(3));
  return exp ? { exp, match: scoreExperience(exp, trip) } : null;
}

/** Id the app uses for a shortlisted place: the catalog id for `db:` places, otherwise the place id */
export function experienceIdFor(rec: RecommendationItem): string {
  return catalogEntryId(rec) ?? rec.place_id;
}

function catalogEntryId(rec: RecommendationItem): string | null {
  if (!rec.place_id.startsWith('db:')) return null;
  const id = rec.place_id.slice(3);
  return EXPERIENCES.some((e) => e.id === id) ? id : null;
}

export function recommendationToExperience(rec: RecommendationItem, trip: Trip): { exp: Experience; match: MatchResult } {
  const fromCatalog = catalogEntry(rec, trip);
  if (fromCatalog) return fromCatalog;

  const score = Math.round((rec.final_score ?? 0.5) * 100);
  const expId = rec.place_id;
  const category = normalizeCategory(rec.category || []);
  const price = rec.estimated_cost_per_person ?? 0;
  const details = rec.details || {};
  const hasGeo = typeof rec.latitude === 'number' && typeof rec.longitude === 'number';
  const pos = hasGeo ? latLngToPt({ lat: rec.latitude!, lng: rec.longitude! }) : { x: 44, y: 52 }; // no position: middle of the Pune grid

  const exp: Experience = {
    id: expId,
    title: rec.name,
    image: getExperienceImage(expId)?.src || getExperienceImage(rec.name)?.src,
    tagline: rec.cost_note || rec.address || (rec.source === 'google' ? 'Google Places Live Listing' : 'Anvesha Recommendation'),
    category: category,
    tags: (rec.category || []).map((c) => normalizeCategory([c])),
    area: rec.address ? rec.address.split(',')[0] : 'Local Area',
    address: rec.address || '',
    ...(hasGeo ? { geo: { lat: rec.latitude!, lng: rec.longitude! } } : {}),
    x: pos.x,
    y: pos.y,
    durationMin: details.duration_minutes ?? 90,
    price: price,
    childPrice: Math.round(price * 0.6),
    rating: rec.rating ?? 4.5,
    reviews: details.review_count ?? 120,
    slots: [{ time: 10 * 60, left: 10, capacity: 15 }],
    indoor: details.opening_hours?.indoor ?? false,
    familyFriendly: true,
    wheelchair: true,
    walking: 'medium',
    languages: ['English', 'Hindi'],
    about: details.description || rec.cost_note || rec.address || 'Place retrieved by the Anvesha recommendation model.',
    included: ['Verified Location', rec.source === 'google' ? 'Live Google Places Listing' : 'Local Mumbai Dataset Entry'],
    highlights: rec.match_reasons || [],
    accessibility: ['Public access'],
    reviewsList: [],
    badge: rec.source === 'google' ? 'Trending' : 'Local favourite',
    provider: {
      id: rec.source,
      name: rec.source === 'google' ? 'Google Places API' : 'Anvesha Recommendation Service',
      host: rec.source === 'google' ? 'Google Maps Platform' : 'Anvesha Engine',
      verified: true,
      responseMin: 15,
      since: 2024,
    },
  };

  const match: MatchResult = {
    score: Math.max(40, Math.min(99, score)),
    distance: rec.distance_km ?? 2.5,
    travel: Math.round((rec.distance_km ?? 2.5) * 6),
    nextSlot: { time: 10 * 60, left: 8, capacity: 12 },
    reasons: (rec.match_reasons || []).map((r) => ({ ok: true, kind: 'interest', text: r })),
    breakdown: [
      { key: 'semantic', label: 'Semantic Similarity', value: rec.semantic_score ?? 0.8, weight: 0.4 },
      { key: 'constraint', label: 'Constraints', value: rec.constraint_score ?? 0.8, weight: 0.6 },
    ],
  };

  return { exp, match };
}

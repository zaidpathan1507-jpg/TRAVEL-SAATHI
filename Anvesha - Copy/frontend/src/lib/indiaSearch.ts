import localPlacesData from '../data/india-places.json';

export type IndiaPlaceType =
  | 'CITY'
  | 'STATE'
  | 'LANDMARK'
  | 'TOURIST_PLACE'
  | 'FOOD'
  | 'RESTAURANT'
  | 'HOTEL'
  | 'ACTIVITY'
  | 'ATTRACTION';

export interface IndiaPlace {
  id: string;
  name: string;
  city: string;
  state: string;
  category: string;
  type: IndiaPlaceType;
  latitude: number;
  longitude: number;
  keywords?: string[];
  aliases?: string[];
  description?: string;
  source?: 'local' | 'google';
  placeId?: string;
}

const LOCAL_PLACES: IndiaPlace[] = localPlacesData as IndiaPlace[];

/**
 * Intelligent local search with token-based and keyword scoring.
 */
export function searchLocalIndiaPlaces(query: string, maxResults = 8): IndiaPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored: { place: IndiaPlace; score: number }[] = [];

  for (const place of LOCAL_PLACES) {
    const nameLower = place.name.toLowerCase();
    const cityLower = place.city.toLowerCase();
    const stateLower = place.state.toLowerCase();
    const catLower = place.category.toLowerCase();
    const descLower = (place.description || '').toLowerCase();
    const keywords = (place.keywords || []).map((k) => k.toLowerCase());
    const aliases = (place.aliases || []).map((a) => a.toLowerCase());

    let score = 0;

    // 1. Exact matches
    if (nameLower === q) {
      score += 130;
    } else if (cityLower === q && place.type === 'CITY') {
      score += 115;
    } else if (stateLower === q && place.type === 'STATE') {
      score += 110;
    } else if (cityLower === q) {
      score += 45;
    } else if (stateLower === q) {
      score += 35;
    }

    // 2. Starts with query
    if (nameLower.startsWith(q)) score += 50;
    else if (cityLower.startsWith(q) && place.type === 'CITY') score += 40;

    // 3. Substring full query match
    if (nameLower.includes(q)) score += 30;
    if (keywords.some((k) => k === q || k.includes(q))) score += 35;
    if (aliases.some((a) => a.includes(q))) score += 30;
    if (cityLower.includes(q)) score += 20;
    if (stateLower.includes(q)) score += 15;
    if (catLower.includes(q)) score += 20;
    if (descLower.includes(q)) score += 10;

    // 4. Token-by-token matching (e.g. "misal pav pune", "forts near pune", "temples in varanasi")
    const allTokensMatch = tokens.every(
      (t) =>
        nameLower.includes(t) ||
        cityLower.includes(t) ||
        stateLower.includes(t) ||
        catLower.includes(t) ||
        keywords.some((k) => k.includes(t)) ||
        aliases.some((a) => a.includes(t))
    );

    if (allTokensMatch && tokens.length > 1) {
      score += 45;
    }

    if (score > 0) {
      scored.push({
        place: { ...place, source: 'local' },
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.place);
}

// Google Places Autocomplete Service Singleton
let autocompleteService: any = null;
let placesService: any = null;
let dummyDiv: HTMLDivElement | null = null;

function getAutocompleteService(): any {
  if (typeof window === 'undefined' || !window.google?.maps?.places) return null;
  if (!autocompleteService) {
    autocompleteService = new window.google.maps.places.AutocompleteService();
  }
  return autocompleteService;
}

function getPlacesService(): any {
  if (typeof window === 'undefined' || !window.google?.maps?.places) return null;
  if (!placesService) {
    if (!dummyDiv) {
      dummyDiv = document.createElement('div');
    }
    placesService = new window.google.maps.places.PlacesService(dummyDiv);
  }
  return placesService;
}

/**
 * Searches Google Places Autocomplete restricted to India
 */
export async function searchGooglePlaces(query: string, maxResults = 5): Promise<IndiaPlace[]> {
  const service = getAutocompleteService();
  if (!service) return [];

  return new Promise((resolve) => {
    try {
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
        },
        (predictions: any[], status: any) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }

          const results: IndiaPlace[] = predictions.slice(0, maxResults).map((p: any) => {
            const mainText = p.structured_formatting?.main_text || p.description;
            const secondaryText = p.structured_formatting?.secondary_text || '';
            const parts = secondaryText.split(',').map((s: string) => s.trim());
            const city = parts[0] || '';
            const state = parts[1] || 'India';

            return {
              id: `gplaces-${p.place_id}`,
              placeId: p.place_id,
              name: mainText,
              city,
              state,
              category: p.types?.includes('restaurant') || p.types?.includes('food') ? 'Food' : 'Location',
              type: p.types?.includes('food') ? 'FOOD' : 'LANDMARK',
              latitude: 0, // Resolved on selection
              longitude: 0,
              description: p.description,
              source: 'google',
            };
          });

          resolve(results);
        }
      );
    } catch {
      resolve([]);
    }
  });
}

/**
 * Resolves full coordinates for a Google Place prediction when selected
 */
export async function resolveGooglePlaceCoords(place: IndiaPlace): Promise<IndiaPlace> {
  if (place.latitude && place.longitude && place.latitude !== 0) {
    return place;
  }
  if (!place.placeId) return place;

  const service = getPlacesService();
  if (!service) return place;

  return new Promise((resolve) => {
    try {
      service.getDetails(
        {
          placeId: place.placeId,
          fields: ['geometry', 'name', 'formatted_address', 'types'],
        },
        (result: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
            const lat = result.geometry.location.lat();
            const lng = result.geometry.location.lng();
            resolve({
              ...place,
              latitude: lat,
              longitude: lng,
            });
          } else {
            resolve(place);
          }
        }
      );
    } catch {
      resolve(place);
    }
  });
}

/**
 * Hybrid Search: searches local India database first.
 * If fewer than 4 matches or if query contains broad context, merges with Google Places.
 */
export async function hybridSearchIndia(query: string): Promise<IndiaPlace[]> {
  const q = query.trim();
  if (!q) return [];

  // Step 1: Instant local results
  const localResults = searchLocalIndiaPlaces(q, 6);

  // If we have strong local matches (top match is exact or score >= 70) and >= 3 results, return local
  const hasStrongMatch = localResults.some(
    (r) => r.name.toLowerCase() === q.toLowerCase() || r.city.toLowerCase() === q.toLowerCase()
  );

  if (hasStrongMatch && localResults.length >= 3) {
    return localResults;
  }

  // Step 2: Query Google Places in background / fallback
  try {
    const googleResults = await searchGooglePlaces(q, 4);
    // Deduplicate by name similarity
    const existingNames = new Set(localResults.map((r) => r.name.toLowerCase()));
    const filteredGoogle = googleResults.filter((g) => !existingNames.has(g.name.toLowerCase()));
    return [...localResults, ...filteredGoogle];
  } catch {
    return localResults;
  }
}

/**
 * Maps place category/type to icon indicator
 */
export function getPlaceTypeIcon(type: IndiaPlaceType, category?: string): string {
  const cat = (category || '').toLowerCase();
  if (type === 'CITY' || type === 'STATE') return '📍';
  if (type === 'FOOD' || type === 'RESTAURANT' || cat.includes('food')) return '🍴';
  if (cat.includes('beach')) return '🏖️';
  if (cat.includes('temple') || cat.includes('spiritual')) return '🛕';
  if (cat.includes('nature') || cat.includes('hill') || cat.includes('lake')) return '🏔️';
  if (cat.includes('shopping') || cat.includes('market')) return '🛍️';
  if (cat.includes('fort') || cat.includes('heritage') || cat.includes('palace')) return '🏰';
  return '🔍';
}

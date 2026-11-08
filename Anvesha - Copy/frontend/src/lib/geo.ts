export interface Pt {
  x: number;
  y: number;
}

/** Your hotel on the stylised Pune map (Deccan Gymkhana). */
export const HOTEL: Pt & { name: string; area: string } = { x: 38, y: 58, name: 'The Deccan Courtyard', area: 'Deccan Gymkhana' };

/** Road distance in km between two map points (1 grid unit ≈ 100 m incl. road factor). */
export const distKm = (a: Pt, b: Pt) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 0.1 * 10) / 10;

export const travelMode = (k: number): 'walk' | 'auto' => (k <= 0.6 ? 'walk' : 'auto');

/** Minutes to get between points: walking under 600 m, else auto-rickshaw at city speed + pickup. */
export const travelMin = (k: number) => (k <= 0.6 ? Math.max(3, Math.round((k / 4.5) * 60)) : Math.round((k / 18) * 60) + 4);

export interface LatLng {
  lat: number;
  lng: number;
}

/** Your hotel coordinates on the real Pune map (Deccan Gymkhana). */
export const HOTEL_COORDS: LatLng = { lat: 18.5167, lng: 73.8415 };

/** Real Pune GPS coordinates for curated experiences */
export const EXPERIENCE_COORDS: Record<string, LatLng> = {
  'pune-food-walk': { lat: 18.5196, lng: 73.8553 },
  'shaniwar-wada-story': { lat: 18.5194, lng: 73.8553 },
  'mitti-pottery': { lat: 18.5089, lng: 73.8346 },
  'peth-mithai-studio': { lat: 18.5125, lng: 73.8518 },
  'kasba-ganpati': { lat: 18.5196, lng: 73.8553 },
  'dhol-tasha': { lat: 18.5173, lng: 73.8475 },
  'tulshibaug-market': { lat: 18.5158, lng: 73.8560 },
  'warli-workshop': { lat: 18.5042, lng: 73.8185 },
  'natya-sangeet': { lat: 18.5085, lng: 73.8505 },
  'irani-cafe-trail': { lat: 18.5135, lng: 73.8797 },
  'vetal-tekdi': { lat: 18.5246, lng: 73.8183 },
  'parvati-sunset': { lat: 18.4962, lng: 73.8475 },
  'aga-khan-freedom': { lat: 18.5523, lng: 73.9015 },
  'kp-live-music': { lat: 18.5362, lng: 73.8940 },
  'miniature-railway': { lat: 18.5015, lng: 73.8152 },
  'paithani-weaving': { lat: 18.5155, lng: 73.8540 },
};

/** Convert 0-100 canvas grid coordinates to real Pune GPS coordinates */
export function ptToLatLng(pt: Pt): LatLng {
  const lat = Math.round((18.57 - (pt.y / 100) * 0.092) * 10000) / 10000;
  const lng = Math.round((73.79 + (pt.x / 100) * 0.136) * 10000) / 10000;
  return { lat, lng };
}

/** Real GPS -> position on the 0-100 map grid (inverse of ptToLatLng), so grid-based code works for live places too */
export function latLngToPt(c: LatLng): Pt {
  return {
    x: Math.round(((c.lng - 73.79) / 0.136) * 100 * 100) / 100,
    y: Math.round(((18.57 - c.lat) / 0.092) * 100 * 100) / 100,
  };
}

/** Get GPS coordinates for an experience: its own real position, else the curated table, else the grid position */
export function getExperienceCoords(e: { id?: string; x: number; y: number; geo?: LatLng }): LatLng {
  if (e.geo) return e.geo;
  if (e.id && EXPERIENCE_COORDS[e.id]) {
    return EXPERIENCE_COORDS[e.id];
  }
  return ptToLatLng({ x: e.x, y: e.y });
}

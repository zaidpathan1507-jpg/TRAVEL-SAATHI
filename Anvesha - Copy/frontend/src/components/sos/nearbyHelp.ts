import type { NearbyEmergencyFacility } from './types';

// Haversine formula to calculate accurate distance between two points in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Searches for real nearby hospitals and police stations using Google Places API.
 * Only returns real results returned by the API; never fabricates fake locations.
 */
export async function searchNearbyHelp(
  lat: number,
  lng: number
): Promise<{ facilities: NearbyEmergencyFacility[]; error?: string }> {
  if (!navigator.onLine) {
    return { facilities: [], error: 'Device is offline. Real-time nearby facility lookup requires internet.' };
  }

  if (typeof window === 'undefined' || !window.google?.maps?.places?.PlacesService) {
    return { facilities: [], error: 'Google Places API is loading or not available.' };
  }

  return new Promise((resolve) => {
    try {
      const dummyDiv = document.createElement('div');
      const service = new window.google.maps.places.PlacesService(dummyDiv);
      const userLatLng = new window.google.maps.LatLng(lat, lng);

      const facilities: NearbyEmergencyFacility[] = [];
      let pendingRequests = 2;

      const finishIfDone = () => {
        pendingRequests--;
        if (pendingRequests <= 0) {
          // Sort by distance ascending and pick top 4 closest
          facilities.sort((a, b) => a.distanceKm - b.distanceKm);
          resolve({ facilities: facilities.slice(0, 4) });
        }
      };

      // 1. Search nearby hospitals
      service.nearbySearch(
        {
          location: userLatLng,
          radius: 6000,
          type: 'hospital',
        },
        (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach((place: any) => {
              if (place.geometry?.location && place.name) {
                const pLat = place.geometry.location.lat();
                const pLng = place.geometry.location.lng();
                facilities.push({
                  id: place.place_id || `hosp-${Math.random()}`,
                  name: place.name,
                  type: 'hospital',
                  latitude: pLat,
                  longitude: pLng,
                  distanceKm: calculateDistanceKm(lat, lng, pLat, pLng),
                  address: place.vicinity,
                  isOpen: place.opening_hours?.isOpen?.() ?? undefined,
                });
              }
            });
          }
          finishIfDone();
        }
      );

      // 2. Search nearby police stations
      service.nearbySearch(
        {
          location: userLatLng,
          radius: 6000,
          type: 'police',
        },
        (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach((place: any) => {
              if (place.geometry?.location && place.name) {
                const pLat = place.geometry.location.lat();
                const pLng = place.geometry.location.lng();
                facilities.push({
                  id: place.place_id || `pol-${Math.random()}`,
                  name: place.name,
                  type: 'police',
                  latitude: pLat,
                  longitude: pLng,
                  distanceKm: calculateDistanceKm(lat, lng, pLat, pLng),
                  address: place.vicinity,
                  isOpen: place.opening_hours?.isOpen?.() ?? undefined,
                });
              }
            });
          }
          finishIfDone();
        }
      );

      // Timeout safety in case callbacks never fire
      setTimeout(() => {
        if (pendingRequests > 0) {
          facilities.sort((a, b) => a.distanceKm - b.distanceKm);
          resolve({ facilities: facilities.slice(0, 4) });
        }
      }, 3500);
    } catch (err: any) {
      resolve({ facilities: [], error: err?.message || 'Failed to query nearby help.' });
    }
  });
}

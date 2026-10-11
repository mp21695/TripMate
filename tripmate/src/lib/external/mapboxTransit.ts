import { TransitMode } from '@prisma/client';

export interface TransitEstimate {
  mode: TransitMode;
  durationMinutes: number;
  distanceKm: number;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calculateTransit(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: TransitMode
): Promise<TransitEstimate> {
  const mapboxToken = process.env.MAPBOX_TOKEN;

  // Use straight-line calculation for TRAIN and FLIGHT or if MAPBOX_TOKEN is absent
  if (mode === 'TRAIN' || mode === 'FLIGHT' || !mapboxToken || mapboxToken.trim() === '') {
    const rawDistanceKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
    const distanceKm = Math.max(0.1, Math.round(rawDistanceKm * 10) / 10);

    let speedKmH = 35; // Default scooter/cab
    if (mode === 'FLIGHT') speedKmH = 600;
    else if (mode === 'TRAIN') speedKmH = 65;
    else if (mode === 'WALK') speedKmH = 4.5;

    const durationMinutes = Math.max(1, Math.round((distanceKm / speedKmH) * 60));
    return { mode, durationMinutes, distanceKm };
  }

  // Mapbox profile mapping
  const profile = mode === 'WALK' ? 'mapbox/walking' : 'mapbox/driving';
  const url = `https://api.mapbox.com/directions/v5/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?access_token=${mapboxToken}`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.max(0.1, Math.round((route.distance / 1000) * 10) / 10);
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));
        return { mode, durationMinutes, distanceKm };
      }
    }
  } catch (err) {
    console.error('Mapbox directions error, falling back to Haversine:', err);
  }

  // Fallback if Mapbox fails
  const rawDistanceKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
  const distanceKm = Math.max(0.1, Math.round(rawDistanceKm * 10) / 10);
  const durationMinutes = Math.max(1, Math.round((distanceKm / 35) * 60));
  return { mode, durationMinutes, distanceKm };
}

import { apiCache } from './cache';

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  photoUrl?: string;
}

let lastOsmRequestTime = 0;

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const cacheKey = `places:${query.trim().toLowerCase()}`;
  const cached = apiCache.get<PlaceResult[]>(cacheKey);
  if (cached) return cached;

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (googleApiKey && googleApiKey.trim() !== '') {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos',
        },
        body: JSON.stringify({ textQuery: query }),
      });

      if (response.ok) {
        const data = await response.json();
        const places: PlaceResult[] = (data.places || []).map((p: any) => {
          let photoUrl: string | undefined;
          if (p.photos && p.photos.length > 0) {
            photoUrl = `/api/places/photo-proxy?name=${encodeURIComponent(p.photos[0].name)}`;
          }
          return {
            id: p.id || `gplace-${Math.random()}`,
            name: p.displayName?.text || query,
            address: p.formattedAddress || '',
            lat: p.location?.latitude || 0,
            lng: p.location?.longitude || 0,
            rating: p.rating,
            photoUrl,
          };
        });

        apiCache.set(cacheKey, places, 600); // 10 minutes cache
        return places;
      }
    } catch (err) {
      console.error('Google Places API error, falling back to Nominatim:', err);
    }
  }

  // Fallback to OpenStreetMap Nominatim
  const now = Date.now();
  if (now - lastOsmRequestTime < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - (now - lastOsmRequestTime)));
  }
  lastOsmRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TripMate/1.0 (expeditions@tripmate.dev)',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const places: PlaceResult[] = (data || []).map((p: any) => ({
        id: `osm-${p.place_id}`,
        name: p.name || p.display_name.split(',')[0],
        address: p.display_name,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
      }));

      apiCache.set(cacheKey, places, 600);
      return places;
    }
  } catch (err) {
    console.error('OSM Nominatim error:', err);
  }

  return [];
}

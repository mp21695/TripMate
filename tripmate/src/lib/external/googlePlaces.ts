import { apiCache } from './cache';
import { generateStructuredAI, GeminiNotConfiguredError } from './geminiAI';
import { z } from 'zod';

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  photoUrl?: string;
  description?: string;
}

const geminiPlacesSchema = z.object({
  places: z.array(
    z.object({
      name: z.string(),
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      rating: z.number().optional(),
      description: z.string().optional(),
    })
  ),
});

let lastOsmRequestTime = 0;

export async function searchPlaces(query: string, category?: string): Promise<PlaceResult[]> {
  const normCategory = (category || 'all').toLowerCase();
  const cacheKey = `places:${query.trim().toLowerCase()}:${normCategory}`;
  const cached = apiCache.get<PlaceResult[]>(cacheKey);
  if (cached) return cached;

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (googleApiKey && googleApiKey.trim() !== '') {
    try {
      const textQuery = category ? `${query} ${category.toLowerCase()}` : query;
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos',
        },
        body: JSON.stringify({ textQuery }),
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

        if (places.length > 0) {
          apiCache.set(cacheKey, places, 600); // 10 minutes cache
          return places;
        }
      }
    } catch (err) {
      console.error('Google Places API error, falling back to AI/Nominatim:', err);
    }
  }

  // 2. Intelligent AI Discovery Fallback via Gemini (when GOOGLE_PLACES_API_KEY is not configured)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      const categoryContext = category
        ? `in category ${category} (e.g. ${
            category === 'FOOD'
              ? 'famous restaurants, cafes, street food spots, bakeries'
              : category === 'LODGING'
              ? 'top hotels, heritage havelis, luxury resorts, boutique stays, hostels'
              : category === 'TRANSIT'
              ? 'major railway stations, airport terminals, bus transit hubs, metro stops'
              : 'top tourist attractions, historic forts, palaces, viewpoints, cultural landmarks'
          })`
        : 'top tourist attractions, sights, restaurants, and places of interest';

      const prompt = `Search and curate 6 to 8 real, authentic, and highly-rated places for travelers in "${query}" ${categoryContext}.
For each location, provide:
1. Real name of the place
2. Authentic street address or neighborhood in ${query}
3. Accurate real-world latitude and longitude coordinates
4. Approximate traveler rating (e.g. 4.2 to 4.9)
5. A brief 1-sentence highlight or specialty description.`;

      const aiResult = await generateStructuredAI(
        prompt,
        geminiPlacesSchema,
        'You are an expert travel concierge and geospatial guide. Provide real, geographically accurate points of interest.'
      );

      if (aiResult.places && aiResult.places.length > 0) {
        const places: PlaceResult[] = aiResult.places.map((p, idx) => ({
          id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: p.name,
          address: p.address,
          lat: Number(p.lat),
          lng: Number(p.lng),
          rating: p.rating,
          description: p.description,
        }));

        apiCache.set(cacheKey, places, 600); // 10 minutes cache
        return places;
      }
    } catch (err) {
      if (!(err instanceof GeminiNotConfiguredError)) {
        console.warn('Gemini places discovery error, falling back to Nominatim:', err);
      }
    }
  }

  // 3. Fallback to OpenStreetMap Nominatim
  const now = Date.now();
  if (now - lastOsmRequestTime < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - (now - lastOsmRequestTime)));
  }
  lastOsmRequestTime = Date.now();

  try {
    let enrichedQuery = query;
    if (category) {
      if (category === 'FOOD') enrichedQuery = `${query} restaurants cafes`;
      else if (category === 'LODGING') enrichedQuery = `${query} hotels stays`;
      else if (category === 'TRANSIT') enrichedQuery = `${query} railway station airport`;
      else if (category === 'ATTRACTION') enrichedQuery = `${query} sights attractions`;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      enrichedQuery
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

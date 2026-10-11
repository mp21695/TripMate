import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/external/rateLimiter';
import {
  generateStructuredAI,
  GeminiNotConfiguredError,
  GeminiValidationError,
} from '@/lib/external/geminiAI';
import {
  verifyAndGeocodeItem,
  snapUnverifiedCoordinates,
  processDayItemsTransit,
} from '@/lib/external/aiPostProcess';
import { searchPlaces } from '@/lib/external/googlePlaces';

const draftRequestSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  days: z.number().int().min(1).max(14),
  budget: z.number().min(0),
  vibe: z.string().optional().default('Balanced & Scenic'),
});

const itemSchema = z.object({
  title: z.string(),
  category: z.enum(['ATTRACTION', 'FOOD', 'TRANSIT', 'LODGING', 'CUSTOM']),
  startTime: z.string(),
  endTime: z.string(),
  estimatedCost: z.number(),
  lat: z.number(),
  lng: z.number(),
  locationName: z.string(),
  notes: z.string().optional(),
  transitToNext: z
    .object({
      mode: z.enum(['SCOOTER', 'CAB', 'TRAIN', 'FLIGHT', 'WALK']),
      durationMinutes: z.number(),
      distanceKm: z.number(),
    })
    .optional(),
});

const draftResponseSchema = z.object({
  days: z.array(
    z.object({
      dayNumber: z.number(),
      title: z.string(),
      items: z.array(itemSchema),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { allowed } = checkRateLimit(user.id, 'ai_generate_draft', 5, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = draftRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { destination, days, budget, vibe } = parsed.data;

    const prompt = `Generate a realistic ${days}-day itinerary draft for ${destination}.
Budget: ₹${budget} total. Vibe: ${vibe}.
REQUIREMENTS:
- Use real, well-known named places only (e.g. specific cafes, restaurants, hotels, attractions).
- NEVER write placeholders like "(Example)", "(or similar)", or "(e.g., ...)". If unsure of an exact business name, use a descriptive generic name like "Beach cafe in Anjuna" or "Guesthouse near Palolem Beach".
- Provide real lat/lng coordinates for places in ${destination}, realistic costs in INR, and times in 12-hour AM/PM format (e.g., "10:30 AM").`;

    const systemInstruction = `You are an expert travel planner. Return JSON matching the schema with dayNumber, title, and items array. Never write placeholders like (Example) or (or similar).`;

    const result = await generateStructuredAI(prompt, draftResponseSchema, systemInstruction);

    // Resolve destination center for 40 km sanity check
    let destCenter: { lat: number; lng: number } | undefined;
    try {
      const places = await searchPlaces(destination);
      if (places.length > 0) {
        destCenter = { lat: places[0].lat, lng: places[0].lng };
      }
    } catch {
      // ignore
    }

    if (!destCenter) {
      const allLats = result.days.flatMap((d) => d.items.map((it) => it.lat)).filter(Boolean);
      const allLngs = result.days.flatMap((d) => d.items.map((it) => it.lng)).filter(Boolean);
      if (allLats.length > 0 && allLngs.length > 0) {
        destCenter = {
          lat: allLats.reduce((a, b) => a + b, 0) / allLats.length,
          lng: allLngs.reduce((a, b) => a + b, 0) / allLngs.length,
        };
      }
    }

    const bounds = destCenter ? { center: destCenter, maxDistanceKm: 40 } : undefined;

    // Post-processing: normalize times, geocode coordinates with 40km check, snap unverified, process transit
    for (const day of result.days) {
      for (const item of day.items) {
        await verifyAndGeocodeItem(item, destination, bounds);
      }
      snapUnverifiedCoordinates(day.items);
      await processDayItemsTransit(day.items);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 });
    }
    if (err instanceof GeminiValidationError) {
      return NextResponse.json(
        { error: 'AI could not produce a valid result, please try again' },
        { status: 502 }
      );
    }
    console.error('AI Draft generation error:', err);
    return NextResponse.json(
      { error: 'Failed to generate itinerary draft' },
      { status: 500 }
    );
  }
}

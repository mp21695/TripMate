import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/external/rateLimiter';
import {
  generateStructuredAI,
  GeminiNotConfiguredError,
  GeminiValidationError,
} from '@/lib/external/geminiAI';
import { verifyAndGeocodeItem, processDayItemsTransit } from '@/lib/external/aiPostProcess';

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
Provide real lat/lng coordinates for places in ${destination}, realistic costs in INR, and times in 12-hour AM/PM format (e.g., "10:30 AM").`;

    const systemInstruction = `You are an expert travel planner. Return JSON matching the schema with dayNumber, title, and items array.`;

    const result = await generateStructuredAI(prompt, draftResponseSchema, systemInstruction);

    // Post-processing: normalize times, geocode coordinates, and process transit
    for (const day of result.days) {
      for (const item of day.items) {
        await verifyAndGeocodeItem(item, destination);
      }
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

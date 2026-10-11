import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { checkRateLimit } from '@/lib/external/rateLimiter';
import {
  generateStructuredAI,
  GeminiNotConfiguredError,
  GeminiValidationError,
} from '@/lib/external/geminiAI';
import { verifyAndGeocodeItem } from '@/lib/external/aiPostProcess';
import { Role } from '@prisma/client';

const gapRequestSchema = z.object({
  tripId: z.string().min(1, 'tripId is required'),
  dayId: z.string().min(1, 'dayId is required'),
  windowStart: z.string(),
  windowEnd: z.string(),
  nearLat: z.number(),
  nearLng: z.number(),
});

const suggestionSchema = z.object({
  title: z.string(),
  category: z.enum(['ATTRACTION', 'FOOD', 'TRANSIT', 'LODGING', 'CUSTOM']),
  startTime: z.string(),
  endTime: z.string(),
  estimatedCost: z.number(),
  lat: z.number(),
  lng: z.number(),
  locationName: z.string(),
  notes: z.string().optional(),
});

const gapResponseSchema = z.object({
  suggestions: z.array(suggestionSchema).min(2).max(3),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = gapRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { tripId, dayId, windowStart, windowEnd, nearLat, nearLng } = parsed.data;

    // RBAC: Requires OWNER or EDITOR
    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const { allowed } = checkRateLimit(user.id, 'ai_suggest_gap', 10, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: {
          select: { id: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Verify dayId belongs to the trip
    const dayExists = trip.days.some((d) => d.id === dayId);
    if (!dayExists) {
      return NextResponse.json(
        { error: 'Invalid dayId: day does not belong to this trip' },
        { status: 400 }
      );
    }

    const prompt = `Suggest 2 to 3 places/activities to fill a time gap between ${windowStart} and ${windowEnd} near coordinates (${nearLat}, ${nearLng}) in ${trip.destination}.
Return realistic lat/lng coordinates nearby, costs in INR, and times formatted as AM/PM within the ${windowStart} to ${windowEnd} window.`;

    const systemInstruction = `You are a spatial travel assistant. Return JSON object with a 'suggestions' array containing 2 to 3 items.`;

    const result = await generateStructuredAI(prompt, gapResponseSchema, systemInstruction);

    // Post-processing: normalize times and geocode coordinates with coordsVerified
    for (const suggestion of result.suggestions) {
      await verifyAndGeocodeItem(suggestion, trip.destination);
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
    return handleRbacError(err);
  }
}

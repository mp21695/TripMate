import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { checkRateLimit } from '@/lib/external/rateLimiter';
import { generateStructuredAI, GeminiNotConfiguredError } from '@/lib/external/geminiAI';
import { Role } from '@prisma/client';

const copilotRequestSchema = z.object({
  tripId: z.string().min(1, 'tripId is required'),
  prompt: z.string().min(1, 'prompt is required'),
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

const copilotResponseSchema = z.object({
  dayId: z.string(),
  item: itemSchema,
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = copilotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { tripId, prompt } = parsed.data;

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR, Role.VIEWER]);

    const { allowed } = checkRateLimit(user.id, 'ai_copilot_suggest', 10, 60);
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
          select: { id: true, dayNumber: true, date: true, title: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const availableDays = trip.days.map((d) => `ID: "${d.id}" (Day ${d.dayNumber}: ${d.title})`).join('\n');

    const fullPrompt = `Destination: ${trip.destination}, ${trip.stateOrRegion} (Coordinates: ${trip.lat}, ${trip.lng}).
Available Trip Days:
${availableDays}

User Directive: "${prompt}"

Select the best matching dayId from the available days list, and create a single itinerary waypoint item.
Provide real lat/lng near ${trip.destination}, realistic cost in INR, and 12-hour AM/PM times.`;

    const systemInstruction = `You are AI Copilot for TripMate. Return JSON with 'dayId' (exact string ID from available list) and 'item'.`;

    const result = await generateStructuredAI(fullPrompt, copilotResponseSchema, systemInstruction);

    // Verify dayId returned belongs to trip
    const validDay = trip.days.find((d) => d.id === result.dayId);
    if (!validDay) {
      result.dayId = trip.days[0].id;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 });
    }
    return handleRbacError(err);
  }
}

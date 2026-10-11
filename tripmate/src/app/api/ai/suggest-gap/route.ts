import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { checkRateLimit } from '@/lib/external/rateLimiter';
import { generateStructuredAI, GeminiNotConfiguredError } from '@/lib/external/geminiAI';
import { Role } from '@prisma/client';

const gapRequestSchema = z.object({
  tripId: z.string().min(1),
  dayId: z.string().min(1),
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

    const { tripId, windowStart, windowEnd, nearLat, nearLng } = parsed.data;

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR, Role.VIEWER]);

    const { allowed } = checkRateLimit(user.id, 'ai_suggest_gap', 10, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const prompt = `Suggest 2 to 3 places/activities to fill a time gap between ${windowStart} and ${windowEnd} near coordinates (${nearLat}, ${nearLng}).
Return realistic lat/lng coordinates nearby, costs in INR, and times formatted as AM/PM within the ${windowStart} to ${windowEnd} window.`;

    const systemInstruction = `You are a spatial travel assistant. Return JSON object with a 'suggestions' array containing 2 to 3 items.`;

    const result = await generateStructuredAI(prompt, gapResponseSchema, systemInstruction);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 });
    }
    return handleRbacError(err);
  }
}

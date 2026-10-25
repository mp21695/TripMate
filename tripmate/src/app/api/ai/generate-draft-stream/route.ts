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

// Set execution timeout limit for multi-step AI generation
export const maxDuration = 120;

const draftStreamRequestSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  days: z.number().int().min(1).max(14),
  budget: z.number().min(0),
  vibe: z.string().optional().default('Balanced & Scenic'),
});

const outlineSchema = z.object({
  days: z.array(
    z.object({
      dayNumber: z.number().int().min(1),
      title: z.string().min(1),
    })
  ),
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

const dayItemsResponseSchema = z.object({
  items: z.array(itemSchema),
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
    const parsed = draftStreamRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 });
    }

    const { destination, days, budget, vibe } = parsed.data;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendLine = (data: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        };

        try {
          // 1. Geocode destination to resolve bounds center
          let destCenter: { lat: number; lng: number } | undefined;
          try {
            const places = await searchPlaces(destination);
            if (
              places.length > 0 &&
              typeof places[0].lat === 'number' &&
              typeof places[0].lng === 'number'
            ) {
              destCenter = { lat: places[0].lat, lng: places[0].lng };
            }
          } catch {
            // ignore
          }

          const bounds = destCenter ? { center: destCenter, maxDistanceKm: 70 } : undefined;

          // 2. Fast call: Generate High-Level Outline
          const outlinePrompt = `Create a concise ${days}-day itinerary outline for:
Destination: ${destination}
Budget: ₹${budget} total
Vibe: ${vibe}
Provide dayNumber (1 to ${days}) and a short thematic title for each day.`;

          const outlineSystemInstruction = `You are an expert travel planner. Return JSON with days array containing dayNumber and title for each day.`;

          const outline = await generateStructuredAI(
            outlinePrompt,
            outlineSchema,
            outlineSystemInstruction
          );

          // Flush outline immediately
          sendLine({ type: 'outline', days: outline.days });

          const dailyBudget = Math.round(budget / Math.max(1, days));

          // 3. Worker pool for individual days (at most 2 in parallel)
          let index = 0;
          const outlineDays = outline.days;

          const worker = async () => {
            while (index < outlineDays.length) {
              const currentDay = outlineDays[index++];

              try {
                const dayPrompt = `Generate 3 to 6 realistic itinerary items for Day ${currentDay.dayNumber} of a trip to ${destination}.
Day Focus: "${currentDay.title}".
Daily Budget: ~₹${dailyBudget} INR.
Vibe: ${vibe}.
REQUIREMENTS:
- Use real, well-known named places only in or near ${destination}.
- NEVER write placeholders like "(Example)", "(or similar)".
- Provide realistic lat/lng coordinates near ${destination}, realistic costs in INR, and times in 12-hour AM/PM format (e.g., "10:30 AM").`;

                const daySystemInstruction = `You are an expert itinerary builder. Return JSON with items array for the specified day.`;

                const dayResult = await generateStructuredAI(
                  dayPrompt,
                  dayItemsResponseSchema,
                  daySystemInstruction
                );

                // Post-process day items
                for (const item of dayResult.items) {
                  await verifyAndGeocodeItem(item, destination, bounds);
                }
                snapUnverifiedCoordinates(dayResult.items);
                await processDayItemsTransit(dayResult.items);

                sendLine({
                  type: 'day',
                  day: {
                    dayNumber: currentDay.dayNumber,
                    title: currentDay.title,
                    items: dayResult.items,
                  },
                });
              } catch (dayErr) {
                // If one day fails, send error for this dayNumber and continue
                sendLine({ type: 'error', dayNumber: currentDay.dayNumber });
              }
            }
          };

          // Run up to 2 workers concurrently
          const concurrency = Math.min(2, outlineDays.length);
          const workers = Array.from({ length: concurrency }, () => worker());
          await Promise.all(workers);

          // 4. Send done and close
          sendLine({ type: 'done' });
          controller.close();
        } catch (streamErr) {
          if (streamErr instanceof GeminiNotConfiguredError) {
            sendLine({ type: 'error', message: 'Gemini not configured' });
          } else if (streamErr instanceof GeminiValidationError) {
            sendLine({
              type: 'error',
              message: 'AI could not produce a valid result, please try again',
            });
          } else {
            sendLine({ type: 'error', message: 'Itinerary generation failed' });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
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
    console.error('Draft stream error:', err);
    return NextResponse.json(
      { error: 'Failed to start draft stream' },
      { status: 500 }
    );
  }
}

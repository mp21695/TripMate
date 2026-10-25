import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { calculateTransit } from '@/lib/external/mapboxTransit';
import {
  generateStructuredAI,
  GeminiNotConfiguredError,
  GeminiValidationError,
} from '@/lib/external/geminiAI';
import { Proposal, Change } from '@/lib/proposal';
import { Role, TransitMode } from '@prisma/client';

export const maxDuration = 60;

const explanationSchema = z.object({
  explanation: z.string().min(1),
});

function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(remaining)) {
      result.push([current, ...perm]);
    }
  }
  return result;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; dayId: string }> }
) {
  try {
    const { id: tripId, dayId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Role check: OWNER or EDITOR
    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const day = await prisma.day.findFirst({
      where: { id: dayId, tripId },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!day) {
      return NextResponse.json({ error: 'Day not found for this trip' }, { status: 404 });
    }

    // Check items with real coordinates
    const itemsWithCoords = day.items.filter(
      (i) =>
        typeof i.lat === 'number' &&
        typeof i.lng === 'number' &&
        !isNaN(i.lat) &&
        !isNaN(i.lng) &&
        !(i.lat === 0 && i.lng === 0)
    );

    if (itemsWithCoords.length < 3) {
      return NextResponse.json(
        {
          error:
            'Needs at least 3 items with real coordinates to optimize this day',
        },
        { status: 400 }
      );
    }

    const originalItems = day.items;
    const n = originalItems.length;

    // Fixed anchors: LODGING, TRANSIT, FOOD
    const isAnchor = (category: string) =>
      category === 'LODGING' || category === 'TRANSIT' || category === 'FOOD';

    const anchorIndices: number[] = [];
    const freeIndices: number[] = [];

    for (let i = 0; i < n; i++) {
      if (isAnchor(originalItems[i].category)) {
        anchorIndices.push(i);
      } else {
        freeIndices.push(i);
      }
    }

    // Precalculate transit between all pairs to enable fast permutation search
    const transitMatrix = new Map<string, number>();

    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const itA = originalItems[a];
        const itB = originalItems[b];

        let durationMinutes = 15; // default fallback
        try {
          const transit = await calculateTransit(
            { lat: itA.lat, lng: itA.lng },
            { lat: itB.lat, lng: itB.lng },
            itA.transitMode || TransitMode.CAB
          );
          durationMinutes = transit.durationMinutes;
        } catch {
          // ignore
        }
        transitMatrix.set(`${itA.id}->${itB.id}`, durationMinutes);
      }
    }

    const calculateSequenceDuration = (sequence: typeof originalItems): number => {
      let total = 0;
      for (let i = 0; i < sequence.length - 1; i++) {
        const key = `${sequence[i].id}->${sequence[i + 1].id}`;
        total += transitMatrix.get(key) || 0;
      }
      return total;
    };

    const beforeMinutes = calculateSequenceDuration(originalItems);

    // Free items to permute (brute force up to 8 free items)
    const freeItems = freeIndices.slice(0, 8).map((idx) => originalItems[idx]);
    const permutableIndices = freeIndices.slice(0, 8);

    let bestSequence = [...originalItems];
    let afterMinutes = beforeMinutes;

    if (freeItems.length >= 2) {
      const perms = getPermutations(freeItems);

      for (const perm of perms) {
        const candidate = [...originalItems];
        for (let i = 0; i < permutableIndices.length; i++) {
          candidate[permutableIndices[i]] = perm[i];
        }

        const candidateDuration = calculateSequenceDuration(candidate);
        if (candidateDuration < afterMinutes) {
          afterMinutes = candidateDuration;
          bestSequence = candidate;
        }
      }
    }

    // Check if already optimal or no improvement
    const isOrderUnchanged = bestSequence.every(
      (item, idx) => item.id === originalItems[idx].id
    );

    let proposal: Proposal | null = null;
    const timeSaved = beforeMinutes - afterMinutes;

    if (timeSaved > 0 && !isOrderUnchanged) {
      const changes: Change[] = [];

      for (let i = 0; i < n; i++) {
        const currentItemAtSlot = bestSequence[i];
        const originalItemAtSlot = originalItems[i];

        if (currentItemAtSlot.id !== originalItemAtSlot.id) {
          // Slot i keeps its time window; item takes the time of position i
          changes.push({
            type: 'move',
            itemId: currentItemAtSlot.id,
            toDayId: day.id,
            orderIndex: i,
          });

          changes.push({
            type: 'update',
            itemId: currentItemAtSlot.id,
            fields: {
              startTime: originalItemAtSlot.startTime,
              endTime: originalItemAtSlot.endTime,
            },
          });
        }
      }

      proposal = {
        summary: `Optimized Day ${day.dayNumber} itinerary saving ${timeSaved} minutes of travel time.`,
        changes: changes.slice(0, 20),
      };
    }

    // Generate 2-sentence explanation from Gemini based only on computed numbers
    let explanation: string;
    if (proposal && timeSaved > 0) {
      const fallbackExplanation = `Reordering activities reduces total travel time from ${beforeMinutes} minutes to ${afterMinutes} minutes, saving ${timeSaved} minutes. Fixed anchors including meals and lodging remain unchanged to preserve your scheduled bookings.`;

      try {
        const prompt = `Write exactly 2 concise sentences explaining an itinerary route optimization.
Computed Data:
- Day: Day ${day.dayNumber}
- Original transit time: ${beforeMinutes} minutes
- Optimized transit time: ${afterMinutes} minutes
- Travel time saved: ${timeSaved} minutes
- Constraints preserved: fixed anchors (meals, hotels) stayed in place.

RULES:
- Exactly 2 sentences.
- Based ONLY on the numbers provided above.
- NO emojis.`;

        const res = await generateStructuredAI(
          prompt,
          explanationSchema,
          'You are a travel logistics assistant. Return a JSON object with an explanation property containing exactly 2 concise sentences with no emojis.'
        );

        explanation = res.explanation.trim();
        // Ensure at most 2 sentences
        const sentences = explanation.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences.length > 2) {
          explanation = sentences.slice(0, 2).join(' ');
        }
      } catch {
        explanation = fallbackExplanation;
      }
    } else {
      explanation = `The current itinerary order is already optimal with a total transit time of ${beforeMinutes} minutes. No reordering is needed as all stops are already arranged for minimum travel distance.`;
    }

    return NextResponse.json(
      {
        proposal,
        beforeMinutes,
        afterMinutes,
        explanation,
      },
      { status: 200 }
    );
  } catch (err) {
    return handleRbacError(err);
  }
}

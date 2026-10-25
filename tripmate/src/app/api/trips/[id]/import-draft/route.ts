import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { recalculateDayTransit } from '@/lib/transitRecalc';
import { serializeTrip } from '@/lib/serializers';
import { ActivityCategory, Role, TransitMode } from '@prisma/client';

const draftItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['ATTRACTION', 'FOOD', 'TRANSIT', 'LODGING', 'CUSTOM']),
  startTime: z.string().min(1, 'startTime is required'),
  endTime: z.string().min(1, 'endTime is required'),
  estimatedCost: z.number().min(0).default(0),
  lat: z.number(),
  lng: z.number(),
  locationName: z.string().min(1, 'locationName is required'),
  bookingRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  coordsVerified: z.boolean().optional(),
  transitToNext: z
    .object({
      mode: z.enum(['SCOOTER', 'CAB', 'TRAIN', 'FLIGHT', 'WALK']),
      durationMinutes: z.number(),
      distanceKm: z.number(),
    })
    .optional()
    .nullable(),
});

const importDraftSchema = z.object({
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1),
        title: z.string().min(1, 'Day title is required'),
        items: z.array(draftItemSchema).max(15, 'Maximum 15 items per day allowed'),
      })
    )
    .max(14, 'Maximum 14 days allowed'),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = importDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Must be OWNER or EDITOR (VIEWER gets 403)
    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: {
          include: {
            items: {
              select: { id: true, orderIndex: true },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const affectedDayIds: string[] = [];

    // All database updates and creations in ONE prisma.$transaction
    await prisma.$transaction(
      async (tx) => {
        for (const incomingDay of parsed.data.days) {
          // Match day by dayNumber and ignore unknown ones
          const existingDay = trip.days.find((d) => d.dayNumber === incomingDay.dayNumber);
          if (!existingDay) {
            continue;
          }

          affectedDayIds.push(existingDay.id);

          // Update day title
          await tx.day.update({
            where: { id: existingDay.id },
            data: { title: incomingDay.title },
          });

          // Compute base orderIndex after any existing items
          const baseOrderIndex = existingDay.items.length;

          // Insert new items with orderIndex after existing ones, stripping coordsVerified
          for (let i = 0; i < incomingDay.items.length; i++) {
            const item = incomingDay.items[i];
            await tx.itineraryItem.create({
              data: {
                dayId: existingDay.id,
                title: item.title,
                category: item.category as ActivityCategory,
                startTime: item.startTime,
                endTime: item.endTime,
                estimatedCost: item.estimatedCost,
                lat: item.lat,
                lng: item.lng,
                locationName: item.locationName,
                bookingRef: item.bookingRef || null,
                notes: item.notes || null,
                orderIndex: baseOrderIndex + i,
                transitMode: item.transitToNext?.mode
                  ? (item.transitToNext.mode as TransitMode)
                  : null,
                transitMinutes: item.transitToNext?.durationMinutes ?? null,
                transitKm: item.transitToNext?.distanceKm ?? null,
                // coordsVerified is stripped
              },
            });
          }
        }
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    // Best-effort recalculate transit for affected days
    for (const dayId of affectedDayIds) {
      try {
        await recalculateDayTransit(dayId);
      } catch (err) {
        // Best-effort transit recalculation, ignore errors
      }
    }

    // Return the full trip through the serializer
    const fullTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: { include: { user: true } },
        days: {
          include: {
            items: true,
          },
        },
        checklist: { include: { assignedTo: true } },
        expenses: { include: { paidBy: true } },
        notes: { include: { author: true } },
      },
    });

    return NextResponse.json(
      { trip: serializeTrip(fullTrip!) },
      { status: 200 }
    );
  } catch (err) {
    return handleRbacError(err);
  }
}

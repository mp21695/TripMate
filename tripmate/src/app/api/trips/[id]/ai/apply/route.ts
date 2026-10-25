import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { recalculateDayTransit } from '@/lib/transitRecalc';
import { serializeTrip } from '@/lib/serializers';
import { changeSchema } from '@/lib/proposal';
import { ActivityCategory, Role } from '@prisma/client';

export const maxDuration = 60;

const applyRequestSchema = z.object({
  changes: z
    .array(changeSchema)
    .min(1, 'At least one change is required')
    .max(20, 'Maximum 20 changes allowed'),
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

    // Role check: OWNER or EDITOR
    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const body = await req.json();
    const parsed = applyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const validDayIds = new Set(trip.days.map((d) => d.id));
    const itemMap = new Map(
      trip.days.flatMap((d) => d.items.map((i) => [i.id, i]))
    );

    // Re-check EVERY ID belongs to this trip; never trust the client
    for (const change of parsed.data.changes) {
      if (change.type === 'add') {
        if (!validDayIds.has(change.dayId)) {
          return NextResponse.json(
            { error: `Invalid dayId "${change.dayId}" does not belong to trip` },
            { status: 400 }
          );
        }
      } else if (change.type === 'move') {
        if (!itemMap.has(change.itemId)) {
          return NextResponse.json(
            { error: `Invalid itemId "${change.itemId}" does not belong to trip` },
            { status: 400 }
          );
        }
        if (!validDayIds.has(change.toDayId)) {
          return NextResponse.json(
            { error: `Invalid toDayId "${change.toDayId}" does not belong to trip` },
            { status: 400 }
          );
        }
      } else if (change.type === 'update') {
        if (!itemMap.has(change.itemId)) {
          return NextResponse.json(
            { error: `Invalid itemId "${change.itemId}" does not belong to trip` },
            { status: 400 }
          );
        }
      } else if (change.type === 'delete') {
        if (!itemMap.has(change.itemId)) {
          return NextResponse.json(
            { error: `Invalid itemId "${change.itemId}" does not belong to trip` },
            { status: 400 }
          );
        }
      }
    }

    const affectedDayIds = new Set<string>();

    // Apply ALL changes in ONE prisma.$transaction
    await prisma.$transaction(
      async (tx) => {
        for (const change of parsed.data.changes) {
          if (change.type === 'add') {
            affectedDayIds.add(change.dayId);
            await tx.itineraryItem.create({
              data: {
                dayId: change.dayId,
                title: change.item.title,
                category: change.item.category as ActivityCategory,
                startTime: change.item.startTime,
                endTime: change.item.endTime,
                estimatedCost: change.item.estimatedCost,
                lat: change.item.lat,
                lng: change.item.lng,
                locationName: change.item.locationName,
                bookingRef: change.item.bookingRef || null,
                notes: change.item.notes || null,
                orderIndex: change.orderIndex ?? 9999,
              },
            });
          } else if (change.type === 'move') {
            const item = itemMap.get(change.itemId)!;
            affectedDayIds.add(item.dayId);
            affectedDayIds.add(change.toDayId);

            await tx.itineraryItem.update({
              where: { id: change.itemId },
              data: {
                dayId: change.toDayId,
                orderIndex: change.orderIndex,
              },
            });
          } else if (change.type === 'update') {
            const item = itemMap.get(change.itemId)!;
            affectedDayIds.add(item.dayId);

            await tx.itineraryItem.update({
              where: { id: change.itemId },
              data: {
                ...(change.fields.title !== undefined ? { title: change.fields.title } : {}),
                ...(change.fields.category !== undefined
                  ? { category: change.fields.category as ActivityCategory }
                  : {}),
                ...(change.fields.startTime !== undefined
                  ? { startTime: change.fields.startTime }
                  : {}),
                ...(change.fields.endTime !== undefined
                  ? { endTime: change.fields.endTime }
                  : {}),
                ...(change.fields.estimatedCost !== undefined
                  ? { estimatedCost: change.fields.estimatedCost }
                  : {}),
                ...(change.fields.lat !== undefined ? { lat: change.fields.lat } : {}),
                ...(change.fields.lng !== undefined ? { lng: change.fields.lng } : {}),
                ...(change.fields.locationName !== undefined
                  ? { locationName: change.fields.locationName }
                  : {}),
                ...(change.fields.notes !== undefined
                  ? { notes: change.fields.notes }
                  : {}),
                ...(change.fields.bookingRef !== undefined
                  ? { bookingRef: change.fields.bookingRef }
                  : {}),
              },
            });
          } else if (change.type === 'delete') {
            const item = itemMap.get(change.itemId)!;
            affectedDayIds.add(item.dayId);

            await tx.itineraryItem.delete({
              where: { id: change.itemId },
            });
          }
        }

        // Renumber orderIndex contiguously (0..n-1) for each affected day
        for (const dayId of affectedDayIds) {
          const dayItems = await tx.itineraryItem.findMany({
            where: { dayId },
            orderBy: { orderIndex: 'asc' },
          });

          for (let i = 0; i < dayItems.length; i++) {
            if (dayItems[i].orderIndex !== i) {
              await tx.itineraryItem.update({
                where: { id: dayItems[i].id },
                data: { orderIndex: i },
              });
            }
          }
        }
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );

    // After the transaction, best-effort recalculate transit for affected days
    for (const dayId of affectedDayIds) {
      try {
        await recalculateDayTransit(dayId);
      } catch (err) {
        // ignore best-effort transit recalculation failure
      }
    }

    // Return the full updated trip through the serializer
    const fullTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: { include: { user: true } },
        days: {
          include: {
            items: { orderBy: { orderIndex: 'asc' } },
          },
          orderBy: { dayNumber: 'asc' },
        },
        checklist: { include: { assignedTo: true } },
        expenses: { include: { paidBy: true } },
        notes: { include: { author: true } },
      },
    });

    if (!fullTrip) {
      return NextResponse.json({ error: 'Trip not found after update' }, { status: 500 });
    }

    return NextResponse.json({ trip: serializeTrip(fullTrip as any) }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

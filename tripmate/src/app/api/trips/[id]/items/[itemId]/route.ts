import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeItem } from '@/lib/serializers';
import { Role, ActivityCategory, TransitMode } from '@prisma/client';

const updateItemSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum(['ATTRACTION', 'FOOD', 'TRANSIT', 'LODGING', 'CUSTOM']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  locationName: z.string().optional(),
  bookingRef: z.string().optional(),
  notes: z.string().optional(),
  transitToNext: z
    .object({
      mode: z.enum(['SCOOTER', 'CAB', 'TRAIN', 'FLIGHT', 'WALK']),
      durationMinutes: z.number(),
      distanceKm: z.number(),
    })
    .optional()
    .nullable(),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: tripId, itemId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const existingItem = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      include: { day: true },
    });

    if (!existingItem || existingItem.day.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Item does not belong to this trip' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.category && { category: data.category as ActivityCategory }),
        ...(data.startTime && { startTime: data.startTime }),
        ...(data.endTime && { endTime: data.endTime }),
        ...(data.estimatedCost !== undefined && { estimatedCost: data.estimatedCost }),
        ...(data.lat !== undefined && { lat: data.lat }),
        ...(data.lng !== undefined && { lng: data.lng }),
        ...(data.locationName && { locationName: data.locationName }),
        ...(data.bookingRef !== undefined && { bookingRef: data.bookingRef }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.transitToNext === null
          ? { transitMode: null, transitMinutes: null, transitKm: null }
          : data.transitToNext
          ? {
              transitMode: data.transitToNext.mode as TransitMode,
              transitMinutes: data.transitToNext.durationMinutes,
              transitKm: data.transitToNext.distanceKm,
            }
          : {}),
      },
    });

    return NextResponse.json({ item: serializeItem(updated) }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: tripId, itemId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const existingItem = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      include: { day: true },
    });

    if (!existingItem || existingItem.day.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Item does not belong to this trip' },
        { status: 404 }
      );
    }

    await prisma.itineraryItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

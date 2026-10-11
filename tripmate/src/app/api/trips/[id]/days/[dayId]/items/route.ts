import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeItem } from '@/lib/serializers';
import { Role, ActivityCategory, TransitMode } from '@prisma/client';

const createItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['ATTRACTION', 'FOOD', 'TRANSIT', 'LODGING', 'CUSTOM']),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  estimatedCost: z.number().min(0),
  lat: z.number(),
  lng: z.number(),
  locationName: z.string().min(1),
  bookingRef: z.string().optional(),
  notes: z.string().optional(),
  transitToNext: z
    .object({
      mode: z.enum(['SCOOTER', 'CAB', 'TRAIN', 'FLIGHT', 'WALK']),
      durationMinutes: z.number(),
      distanceKm: z.number(),
    })
    .optional(),
});

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

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const day = await prisma.day.findUnique({
      where: { id: dayId },
    });

    if (!day || day.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Day does not belong to this trip' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const maxItem = await prisma.itineraryItem.findFirst({
      where: { dayId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const nextOrderIndex = maxItem ? maxItem.orderIndex + 1 : 0;

    const newItem = await prisma.itineraryItem.create({
      data: {
        dayId,
        title: data.title,
        category: data.category as ActivityCategory,
        startTime: data.startTime,
        endTime: data.endTime,
        estimatedCost: data.estimatedCost,
        lat: data.lat,
        lng: data.lng,
        locationName: data.locationName,
        bookingRef: data.bookingRef,
        notes: data.notes,
        orderIndex: nextOrderIndex,
        transitMode: data.transitToNext?.mode as TransitMode | undefined,
        transitMinutes: data.transitToNext?.durationMinutes,
        transitKm: data.transitToNext?.distanceKm,
      },
    });

    return NextResponse.json({ item: serializeItem(newItem) }, { status: 201 });
  } catch (err) {
    return handleRbacError(err);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { calculateTransit } from '@/lib/external/mapboxTransit';
import { serializeDay } from '@/lib/serializers';
import { Role, TransitMode } from '@prisma/client';

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
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!day || day.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Day does not belong to this trip' },
        { status: 404 }
      );
    }

    const items = day.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (i < items.length - 1) {
        const nextItem = items[i + 1];
        const mode = item.transitMode || TransitMode.SCOOTER;

        const transit = await calculateTransit(
          { lat: item.lat, lng: item.lng },
          { lat: nextItem.lat, lng: nextItem.lng },
          mode
        );

        await prisma.itineraryItem.update({
          where: { id: item.id },
          data: {
            transitMode: transit.mode,
            transitMinutes: transit.durationMinutes,
            transitKm: transit.distanceKm,
          },
        });
      } else {
        // Clear transit for the last item of the day
        await prisma.itineraryItem.update({
          where: { id: item.id },
          data: {
            transitMode: null,
            transitMinutes: null,
            transitKm: null,
          },
        });
      }
    }

    const updatedDay = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json(
      { day: serializeDay(updatedDay!) },
      { status: 200 }
    );
  } catch (err) {
    return handleRbacError(err);
  }
}

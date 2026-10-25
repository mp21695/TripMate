import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { recalculateDayTransit } from '@/lib/transitRecalc';
import { serializeDay } from '@/lib/serializers';
import { Role } from '@prisma/client';

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

    await recalculateDayTransit(dayId);

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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { Role } from '@prisma/client';

const reorderSchema = z.object({
  moves: z.array(
    z.object({
      itemId: z.string().min(1),
      dayId: z.string().min(1),
      orderIndex: z.number().int().min(0),
    })
  ).min(1, 'At least one move is required'),
});

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { moves } = parsed.data;

    // Fetch all days belonging to this trip
    const tripDays = await prisma.day.findMany({
      where: { tripId },
      select: { id: true },
    });
    const validDayIds = new Set(tripDays.map((d) => d.id));

    // Verify all target dayIds belong to this trip
    for (const move of moves) {
      if (!validDayIds.has(move.dayId)) {
        return NextResponse.json(
          { error: `Day ${move.dayId} does not belong to trip ${tripId}` },
          { status: 400 }
        );
      }
    }

    // Fetch all requested items
    const moveItemIds = moves.map((m) => m.itemId);
    const existingItems = await prisma.itineraryItem.findMany({
      where: { id: { in: moveItemIds } },
      include: { day: true },
    });

    // Ensure every move item was found and belongs to this trip
    if (existingItems.length !== moveItemIds.length) {
      return NextResponse.json(
        { error: 'One or more items specified in moves were not found' },
        { status: 400 }
      );
    }

    for (const item of existingItems) {
      if (item.day.tripId !== tripId) {
        return NextResponse.json(
          { error: `Item ${item.id} does not belong to trip ${tripId}` },
          { status: 400 }
        );
      }
    }

    // Apply all moves inside ONE single atomic transaction
    await prisma.$transaction(
      moves.map((move) =>
        prisma.itineraryItem.update({
          where: { id: move.itemId },
          data: {
            dayId: move.dayId,
            orderIndex: move.orderIndex,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Reordered items successfully' }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

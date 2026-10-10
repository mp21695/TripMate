import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeTrip, FullPrismaTrip } from '@/lib/serializers';
import { Role, Visibility } from '@prisma/client';

const fullTripInclude = {
  members: { include: { user: true } },
  days: { include: { items: true } },
  checklist: { include: { assignedTo: true } },
  expenses: { include: { paidBy: true } },
  notes: { include: { author: true } },
};

const updateTripSchema = z.object({
  title: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  stateOrRegion: z.string().min(1).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  totalBudget: z.number().min(0).optional(),
  currency: z.string().optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).optional(),
  coverImage: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR, Role.VIEWER]);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: fullTripInclude,
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const serialized = serializeTrip(trip as unknown as FullPrismaTrip);
    return NextResponse.json({ trip: serialized }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

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

    await requireTripRole(user.id, tripId, [Role.OWNER]);

    const body = await req.json();
    const parsed = updateTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    if (updates.startDate && updates.endDate) {
      if (new Date(updates.endDate) < new Date(updates.startDate)) {
        return NextResponse.json(
          { error: 'endDate cannot be before startDate' },
          { status: 400 }
        );
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.destination && { destination: updates.destination }),
        ...(updates.stateOrRegion && { stateOrRegion: updates.stateOrRegion }),
        ...(updates.startDate && { startDate: updates.startDate }),
        ...(updates.endDate && { endDate: updates.endDate }),
        ...(updates.totalBudget !== undefined && { totalBudget: updates.totalBudget }),
        ...(updates.currency && { currency: updates.currency }),
        ...(updates.visibility && { visibility: updates.visibility as Visibility }),
        ...(updates.coverImage && { coverImage: updates.coverImage }),
        ...(updates.lat !== undefined && { lat: updates.lat }),
        ...(updates.lng !== undefined && { lng: updates.lng }),
      },
      include: fullTripInclude,
    });

    const serialized = serializeTrip(updatedTrip as unknown as FullPrismaTrip);
    return NextResponse.json({ trip: serialized }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER]);

    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({ message: 'Trip deleted successfully' }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

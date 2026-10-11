import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

const joinSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = joinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid join request payload' },
        { status: 400 }
      );
    }

    const { token } = parsed.data;
    const payload = await verifyToken(token);

    if (
      !payload ||
      payload.purpose !== 'invite' ||
      payload.type !== 'trip_invite' ||
      typeof payload.tripId !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 400 }
      );
    }

    const tripId = payload.tripId;
    const inviteRole = payload.role as Role;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const existingMember = await prisma.tripMember.findUnique({
      where: {
        userId_tripId: {
          userId: user.id,
          tripId,
        },
      },
    });

    if (existingMember) {
      const currentRank = ROLE_RANK[existingMember.role];
      const inviteRank = ROLE_RANK[inviteRole] || 1;

      let finalRole = existingMember.role;
      if (inviteRank > currentRank) {
        finalRole = inviteRole;
        await prisma.tripMember.update({
          where: { id: existingMember.id },
          data: { role: finalRole },
        });
      }

      return NextResponse.json(
        {
          message: 'Already a member',
          tripId,
          role: finalRole,
        },
        { status: 200 }
      );
    }

    const newMember = await prisma.tripMember.create({
      data: {
        userId: user.id,
        tripId,
        role: inviteRole,
      },
    });

    return NextResponse.json(
      {
        message: 'Joined trip successfully',
        tripId,
        role: newMember.role,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

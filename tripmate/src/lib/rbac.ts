import { Role } from '@prisma/client';
import { prisma } from './prisma';
import { NextResponse } from 'next/server';

export class RbacError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'RbacError';
  }
}

// Role hierarchy rank: OWNER (3) > EDITOR (2) > VIEWER (1)
const ROLE_RANK: Record<Role, number> = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
};

export async function requireTripRole(
  userId: string,
  tripId: string,
  allowedRoles: Role[]
): Promise<Role> {
  if (!userId) {
    throw new RbacError('Unauthenticated', 401);
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true },
  });

  if (!trip) {
    throw new RbacError('Trip not found', 404);
  }

  const member = await prisma.tripMember.findUnique({
    where: {
      userId_tripId: {
        userId,
        tripId,
      },
    },
    select: { role: true },
  });

  if (!member) {
    throw new RbacError('Access denied: You are not a member of this trip', 403);
  }

  const userRoleRank = ROLE_RANK[member.role];
  const requiredRank = Math.min(...allowedRoles.map((r) => ROLE_RANK[r]));

  if (userRoleRank < requiredRank) {
    throw new RbacError(
      `Permission denied: Requires one of [${allowedRoles.join(', ')}] role`,
      403
    );
  }

  return member.role;
}

export function handleRbacError(err: unknown) {
  if (err instanceof RbacError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error('Unhandled RBAC error:', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

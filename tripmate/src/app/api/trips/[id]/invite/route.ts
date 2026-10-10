import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, signToken } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { Role } from '@prisma/client';

const inviteSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
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

    await requireTripRole(user.id, tripId, [Role.OWNER]);

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invite role. Must be EDITOR or VIEWER' },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    const inviteToken = await signToken(
      {
        tripId,
        role,
        type: 'trip_invite',
      },
      '7d'
    );

    const link = `/join?token=${inviteToken}`;
    return NextResponse.json({ link }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

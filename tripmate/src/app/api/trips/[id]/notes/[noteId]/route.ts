import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { Role } from '@prisma/client';

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id: tripId, noteId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const existing = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!existing || existing.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Note does not belong to this trip' },
        { status: 404 }
      );
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

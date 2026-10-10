import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeChecklist } from '@/lib/serializers';
import { Role, ChecklistCategory, Priority } from '@prisma/client';

const updateChecklistSchema = z.object({
  isCompleted: z.boolean().optional(),
  text: z.string().min(1).optional(),
  category: z.enum(['DOCUMENTS', 'CLOTHING', 'MEDICINES', 'ELECTRONICS', 'BEACH/GEAR']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  assignedToId: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; checkId: string }> }
) {
  try {
    const { id: tripId, checkId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const existing = await prisma.checklistItem.findUnique({
      where: { id: checkId },
    });

    if (!existing || existing.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Checklist item does not belong to this trip' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = updateChecklistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const dbCategory = data.category
      ? ((data.category === 'BEACH/GEAR' ? 'BEACH_GEAR' : data.category) as ChecklistCategory)
      : undefined;

    const updated = await prisma.checklistItem.update({
      where: { id: checkId },
      data: {
        ...(data.isCompleted !== undefined && { isCompleted: data.isCompleted }),
        ...(data.text && { text: data.text }),
        ...(dbCategory && { category: dbCategory }),
        ...(data.priority && { priority: data.priority as Priority }),
        ...(data.assignedToId && { assignedToId: data.assignedToId }),
      },
      include: { assignedTo: true },
    });

    return NextResponse.json({ item: serializeChecklist(updated) }, { status: 200 });
  } catch (err) {
    return handleRbacError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; checkId: string }> }
) {
  try {
    const { id: tripId, checkId } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const existing = await prisma.checklistItem.findUnique({
      where: { id: checkId },
    });

    if (!existing || existing.tripId !== tripId) {
      return NextResponse.json(
        { error: 'Checklist item does not belong to this trip' },
        { status: 404 }
      );
    }

    await prisma.checklistItem.delete({
      where: { id: checkId },
    });

    return NextResponse.json(
      { message: 'Checklist item deleted successfully' },
      { status: 200 }
    );
  } catch (err) {
    return handleRbacError(err);
  }
}

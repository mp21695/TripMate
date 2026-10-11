import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeChecklist } from '@/lib/serializers';
import { Role, ChecklistCategory, Priority } from '@prisma/client';

const createChecklistSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  category: z.enum(['DOCUMENTS', 'CLOTHING', 'MEDICINES', 'ELECTRONICS', 'BEACH/GEAR']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM'),
  assignedToId: z.string().optional(),
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

    await requireTripRole(user.id, tripId, [Role.OWNER, Role.EDITOR]);

    const body = await req.json();
    const parsed = createChecklistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { text, category, priority, assignedToId } = parsed.data;

    const dbCategory = (category === 'BEACH/GEAR' ? 'BEACH_GEAR' : category) as ChecklistCategory;
    const targetAssignedToId = assignedToId || user.id;

    const newItem = await prisma.checklistItem.create({
      data: {
        tripId,
        text,
        category: dbCategory,
        priority: priority as Priority,
        assignedToId: targetAssignedToId,
        isCompleted: false,
      },
      include: { assignedTo: true },
    });

    return NextResponse.json({ item: serializeChecklist(newItem) }, { status: 201 });
  } catch (err) {
    return handleRbacError(err);
  }
}

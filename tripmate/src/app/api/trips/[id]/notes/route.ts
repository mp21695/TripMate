import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeNote } from '@/lib/serializers';
import { Role, NoteColor } from '@prisma/client';

const createNoteSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  color: z.enum(['yellow', 'pink', 'blue', 'green']).optional().default('yellow'),
  authorId: z.string().optional(),
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
    const parsed = createNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { text, color, authorId } = parsed.data;
    const targetAuthorId = authorId || user.id;

    const rotations = [-3, -2, -1, 1, 2, 3];
    const rotation = rotations[Math.floor(Math.random() * rotations.length)];

    const newNote = await prisma.note.create({
      data: {
        tripId,
        text,
        color: color as NoteColor,
        rotation,
        createdAt: new Date().toISOString(),
        authorId: targetAuthorId,
      },
      include: { author: true },
    });

    return NextResponse.json({ note: serializeNote(newNote) }, { status: 201 });
  } catch (err) {
    return handleRbacError(err);
  }
}

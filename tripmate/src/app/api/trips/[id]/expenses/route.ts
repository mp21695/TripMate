import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireTripRole, handleRbacError } from '@/lib/rbac';
import { serializeExpense } from '@/lib/serializers';
import { Role, ExpenseCategory } from '@prisma/client';

const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().min(0, 'Amount must be >= 0'),
  category: z.enum(['FOOD', 'STAY', 'TRANSIT', 'ACTIVITIES', 'MISC']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  paidById: z.string().optional(),
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
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { title, amount, category, date, paidById } = parsed.data;
    const targetPaidById = paidById || user.id;

    const newExpense = await prisma.expense.create({
      data: {
        tripId,
        title,
        amount,
        category: category as ExpenseCategory,
        date,
        paidById: targetPaidById,
      },
      include: { paidBy: true },
    });

    return NextResponse.json({ expense: serializeExpense(newExpense) }, { status: 201 });
  } catch (err) {
    return handleRbacError(err);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { serializeTrip, FullPrismaTrip } from '@/lib/serializers';
import { Role } from '@prisma/client';

const fullTripInclude = {
  members: { include: { user: true } },
  days: { include: { items: true } },
  checklist: { include: { assignedTo: true } },
  expenses: { include: { paidBy: true } },
  notes: { include: { author: true } },
};

const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  destination: z.string().min(1, 'Destination is required'),
  stateOrRegion: z.string().min(1, 'State or region is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid startDate format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid endDate format (YYYY-MM-DD)'),
  totalBudget: z.number().min(0, 'Budget must be >= 0'),
  currency: z.string().optional().default('INR'),
  lat: z.number(),
  lng: z.number(),
  coverImage: z.string().optional(),
});

function generateDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startStr);
  const end = new Date(endStr);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    include: fullTripInclude,
    orderBy: { createdAt: 'desc' },
  });

  const serialized = (trips as unknown as FullPrismaTrip[]).map(serializeTrip);
  return NextResponse.json({ trips: serialized }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      title,
      destination,
      stateOrRegion,
      startDate,
      endDate,
      totalBudget,
      currency,
      lat,
      lng,
      coverImage,
    } = parsed.data;

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: 'endDate cannot be before startDate' },
        { status: 400 }
      );
    }

    const dates = generateDateRange(startDate, endDate);

    const trip = await prisma.trip.create({
      data: {
        title,
        destination,
        stateOrRegion,
        startDate,
        endDate,
        totalBudget,
        currency: currency || 'INR',
        lat,
        lng,
        coverImage,
        members: {
          create: {
            userId: user.id,
            role: Role.OWNER,
          },
        },
        days: {
          create: dates.map((dateStr, idx) => ({
            dayNumber: idx + 1,
            date: dateStr,
            title: `Day ${idx + 1}`,
          })),
        },
      },
      include: fullTripInclude,
    });

    const serialized = serializeTrip(trip as unknown as FullPrismaTrip);
    return NextResponse.json({ trip: serialized }, { status: 201 });
  } catch (err) {
    console.error('Create trip error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

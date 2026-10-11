import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { calculateTransit } from '@/lib/external/mapboxTransit';
import { TransitMode } from '@prisma/client';

const transitSchema = z.object({
  from: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  to: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  mode: z.enum(['SCOOTER', 'CAB', 'TRAIN', 'FLIGHT', 'WALK']),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = transitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { from, to, mode } = parsed.data;
    const result = await calculateTransit(from, to, mode as TransitMode);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('Transit API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

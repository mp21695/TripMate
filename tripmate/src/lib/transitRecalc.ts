import { prisma } from '@/lib/prisma';
import { calculateTransit } from '@/lib/external/mapboxTransit';
import { TransitMode } from '@prisma/client';

export async function recalculateDayTransit(dayId: string): Promise<void> {
  const day = await prisma.day.findUnique({
    where: { id: dayId },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!day || !day.items) return;

  const items = day.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (i < items.length - 1) {
      const nextItem = items[i + 1];
      const mode = item.transitMode || TransitMode.SCOOTER;

      const transit = await calculateTransit(
        { lat: item.lat, lng: item.lng },
        { lat: nextItem.lat, lng: nextItem.lng },
        mode
      );

      await prisma.itineraryItem.update({
        where: { id: item.id },
        data: {
          transitMode: transit.mode,
          transitMinutes: transit.durationMinutes,
          transitKm: transit.distanceKm,
        },
      });
    } else {
      // Clear transit for the last item of the day
      await prisma.itineraryItem.update({
        where: { id: item.id },
        data: {
          transitMode: null,
          transitMinutes: null,
          transitKm: null,
        },
      });
    }
  }
}

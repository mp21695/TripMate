import { PrismaClient, Role, ActivityCategory, TransitMode, ChecklistCategory, Priority, ExpenseCategory, NoteColor } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_TRIPS } from '../src/data/mockTrips';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.note.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.itineraryItem.deleteMany({});
  await prisma.day.deleteMany({});
  await prisma.tripMember.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('demo1234', 10);

  // Collect all unique members from mockTrips
  const memberMap = new Map<string, { name: string; avatar?: string; upiId?: string; email: string }>();

  for (const trip of INITIAL_TRIPS) {
    for (const member of trip.members) {
      const firstName = member.name.split(' ')[0].replace('(You)', '').trim().toLowerCase();
      const email = `${firstName}@tripmate.dev`;
      if (!memberMap.has(email)) {
        memberMap.set(email, {
          name: member.name,
          avatar: member.avatar,
          upiId: member.upiId,
          email,
        });
      }
    }
  }

  const createdUsers = new Map<string, string>(); // email -> userId

  for (const [email, uData] of memberMap.entries()) {
    const user = await prisma.user.create({
      data: {
        email: uData.email,
        name: uData.name,
        passwordHash,
        avatar: uData.avatar,
        upiId: uData.upiId,
        travelStyle: 'Explorer',
      },
    });
    createdUsers.set(email, user.id);
  }

  // Helper function to find userId by name match
  function findUserIdByName(nameStr: string): string | undefined {
    const cleanSearchName = nameStr.split(' ')[0].replace('(You)', '').trim().toLowerCase();
    for (const [email, id] of createdUsers.entries()) {
      if (email.startsWith(cleanSearchName)) {
        return id;
      }
    }
    // Fallback to first user if unmatched
    return Array.from(createdUsers.values())[0];
  }

  console.log('Seeding trips...');
  for (const tripData of INITIAL_TRIPS) {
    const trip = await prisma.trip.create({
      data: {
        id: tripData.id,
        title: tripData.title,
        destination: tripData.destination,
        stateOrRegion: tripData.stateOrRegion,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        coverImage: tripData.coverImage,
        lat: tripData.coordinates.lat,
        lng: tripData.coordinates.lng,
        totalBudget: tripData.totalBudget,
        currency: tripData.currency || 'INR',
        visibility: 'SHARED',
      },
    });

    // Seed Trip Members
    for (const m of tripData.members) {
      const userId = findUserIdByName(m.name);
      if (userId) {
        await prisma.tripMember.create({
          data: {
            tripId: trip.id,
            userId,
            role: (m.role as Role) || Role.VIEWER,
          },
        });
      }
    }

    // Seed Days & Itinerary Items
    for (const dayData of tripData.days) {
      const day = await prisma.day.create({
        data: {
          id: dayData.id,
          tripId: trip.id,
          dayNumber: dayData.dayNumber,
          date: dayData.date,
          title: dayData.title,
        },
      });

      for (let i = 0; i < dayData.items.length; i++) {
        const item = dayData.items[i];
        await prisma.itineraryItem.create({
          data: {
            id: item.id,
            dayId: day.id,
            title: item.title,
            category: item.category as ActivityCategory,
            startTime: item.startTime,
            endTime: item.endTime,
            estimatedCost: item.estimatedCost,
            lat: item.lat,
            lng: item.lng,
            locationName: item.locationName,
            bookingRef: item.bookingRef,
            notes: item.notes,
            orderIndex: i,
            transitMode: item.transitToNext?.mode as TransitMode | undefined,
            transitMinutes: item.transitToNext?.durationMinutes,
            transitKm: item.transitToNext?.distanceKm,
          },
        });
      }
    }

    // Seed Checklist Items
    for (const c of tripData.checklist) {
      const categoryMapped = (c.category === 'BEACH/GEAR' ? 'BEACH_GEAR' : c.category) as ChecklistCategory;
      const assignedToId = c.assignedToName ? findUserIdByName(c.assignedToName) : undefined;

      await prisma.checklistItem.create({
        data: {
          id: c.id,
          tripId: trip.id,
          text: c.text,
          category: categoryMapped,
          isCompleted: c.isCompleted,
          priority: c.priority as Priority,
          assignedToId,
        },
      });
    }

    // Seed Expenses
    for (const e of tripData.expenses) {
      const paidById = findUserIdByName(e.paidByName);
      if (paidById) {
        await prisma.expense.create({
          data: {
            id: e.id,
            tripId: trip.id,
            title: e.title,
            amount: e.amount,
            category: e.category as ExpenseCategory,
            paidById,
            date: e.date,
          },
        });
      }
    }

    // Seed Notes
    for (const n of tripData.notes) {
      const authorId = findUserIdByName(n.authorName);
      if (authorId) {
        await prisma.note.create({
          data: {
            id: n.id,
            tripId: trip.id,
            authorId,
            text: n.text,
            color: n.color as NoteColor,
            rotation: n.rotation,
            createdAt: n.createdAt,
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

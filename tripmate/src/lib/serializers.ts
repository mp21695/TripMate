import {
  Trip as PrismaTrip,
  TripMember as PrismaTripMember,
  User as PrismaUser,
  Day as PrismaDay,
  ItineraryItem as PrismaItineraryItem,
  ChecklistItem as PrismaChecklistItem,
  Expense as PrismaExpense,
  Note as PrismaNote,
} from '@prisma/client';

import {
  Trip,
  TripMember,
  DayPlan,
  ItineraryItem,
  ChecklistItem,
  Expense,
  ScrapbookNote,
  ActivityCategory,
  TransitMode,
} from '@/types';

type MemberWithUser = PrismaTripMember & { user: PrismaUser };
type DayWithItems = PrismaDay & { items: PrismaItineraryItem[] };
type ChecklistWithAssigned = PrismaChecklistItem & { assignedTo?: PrismaUser | null };
type ExpenseWithPayer = PrismaExpense & { paidBy: PrismaUser };
type NoteWithAuthor = PrismaNote & { author: PrismaUser };

export type FullPrismaTrip = PrismaTrip & {
  members: MemberWithUser[];
  days: DayWithItems[];
  checklist: ChecklistWithAssigned[];
  expenses: ExpenseWithPayer[];
  notes: NoteWithAuthor[];
};

export function serializeItem(item: PrismaItineraryItem): ItineraryItem {
  const result: ItineraryItem = {
    id: item.id,
    dayId: item.dayId,
    title: item.title,
    category: item.category as ActivityCategory,
    startTime: item.startTime,
    endTime: item.endTime,
    estimatedCost: item.estimatedCost,
    lat: item.lat,
    lng: item.lng,
    locationName: item.locationName,
    bookingRef: item.bookingRef || undefined,
    notes: item.notes || undefined,
  };

  if (item.transitMode) {
    result.transitToNext = {
      mode: item.transitMode as TransitMode,
      durationMinutes: item.transitMinutes || 0,
      distanceKm: item.transitKm || 0,
    };
  }

  return result;
}

export function serializeDay(day: DayWithItems): DayPlan {
  const sortedItems = [...day.items].sort((a, b) => a.orderIndex - b.orderIndex);
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    date: day.date,
    title: day.title,
    items: sortedItems.map(serializeItem),
  };
}

export function serializeMember(m: MemberWithUser): TripMember {
  return {
    id: m.userId,
    name: m.user.name,
    avatar:
      m.user.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: m.role,
    isOnline: false,
    upiId: m.user.upiId || undefined,
  };
}

export function serializeChecklist(c: ChecklistWithAssigned): ChecklistItem {
  const categoryMapped =
    c.category === 'BEACH_GEAR' ? 'BEACH/GEAR' : (c.category as ChecklistItem['category']);

  return {
    id: c.id,
    text: c.text,
    category: categoryMapped,
    isCompleted: c.isCompleted,
    assignedToName: c.assignedTo?.name || 'Unassigned',
    priority: c.priority,
  };
}

export function serializeExpense(e: ExpenseWithPayer): Expense {
  return {
    id: e.id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    paidByName: e.paidBy.name,
    paidByUpi: e.paidBy.upiId || undefined,
    date: e.date,
  };
}

export function serializeNote(n: NoteWithAuthor): ScrapbookNote {
  return {
    id: n.id,
    authorName: n.author.name,
    text: n.text,
    createdAt: n.createdAt,
    color: n.color,
    rotation: n.rotation,
  };
}

export function serializeTrip(trip: FullPrismaTrip): Trip {
  const sortedDays = [...trip.days].sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    stateOrRegion: trip.stateOrRegion,
    startDate: trip.startDate,
    endDate: trip.endDate,
    totalBudget: trip.totalBudget,
    currency: trip.currency,
    coverImage:
      trip.coverImage ||
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=80',
    coordinates: {
      lat: trip.lat,
      lng: trip.lng,
    },
    members: trip.members.map(serializeMember),
    days: sortedDays.map(serializeDay),
    checklist: trip.checklist.map(serializeChecklist),
    expenses: trip.expenses.map(serializeExpense),
    notes: trip.notes.map(serializeNote),
  };
}

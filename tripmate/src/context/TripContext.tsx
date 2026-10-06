'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Trip, ItineraryItem, ChecklistItem, Expense, ScrapbookNote } from '../types';
import { INITIAL_TRIPS } from '../data/mockTrips';

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  setActiveTripId: (id: string) => void;
  createTrip: (trip: Omit<Trip, 'id' | 'members' | 'days' | 'checklist' | 'expenses' | 'notes' | 'weatherSummary'>) => string;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  // Itinerary items
  reorderItems: (tripId: string, dayId: string, activeId: string, overId: string) => void;
  addItem: (tripId: string, dayId: string, item: Omit<ItineraryItem, 'id' | 'dayId'>) => void;
  deleteItem: (tripId: string, dayId: string, itemId: string) => void;
  // Checklist
  toggleChecklist: (tripId: string, itemId: string) => void;
  addChecklist: (tripId: string, item: Omit<ChecklistItem, 'id' | 'isCompleted'>) => void;
  deleteChecklist: (tripId: string, itemId: string) => void;
  // Expenses
  addExpense: (tripId: string, expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (tripId: string, expenseId: string) => void;
  // Notes
  addNote: (tripId: string, authorName: string, text: string, color: ScrapbookNote['color']) => void;
  deleteNote: (tripId: string, noteId: string) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const STORAGE_KEY = 'tripmate_data_v1';

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [activeTripId, setActiveTripId] = useState<string>('goa-2026');

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrips(parsed);
        }
      }
    } catch {
      // fallback to initial
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {
      // ignore
    }
  }, [trips]);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || null;

  const createTrip = (data: Omit<Trip, 'id' | 'members' | 'days' | 'checklist' | 'expenses' | 'notes' | 'weatherSummary'>) => {
    const newId = `trip-${Date.now()}`;
    const newTrip: Trip = {
      ...data,
      id: newId,
      weatherSummary: {
        temp: 26,
        condition: 'Clear Skies',
        icon: '☀️',
      },
      members: [
        {
          id: 'user-me',
          name: 'Kabir (You)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          role: 'OWNER',
          isOnline: true,
          upiId: 'kabir@oksbi',
        },
      ],
      days: [
        {
          id: `day-${Date.now()}-1`,
          dayNumber: 1,
          date: data.startDate,
          title: 'Day 1: Arrival & Exploration',
          items: [],
        },
        {
          id: `day-${Date.now()}-2`,
          dayNumber: 2,
          date: data.endDate,
          title: 'Day 2: Local Sights & Highlights',
          items: [],
        },
      ],
      checklist: [
        { id: `c-${Date.now()}-1`, text: 'ID Proofs / Driver License', category: 'DOCUMENTS', isCompleted: false, assignedToName: 'Kabir (You)', priority: 'HIGH' },
        { id: `c-${Date.now()}-2`, text: 'First Aid Kit & Motion sickness tablets', category: 'MEDICINES', isCompleted: false, assignedToName: 'Kabir (You)', priority: 'MEDIUM' },
      ],
      expenses: [],
      notes: [
        { id: `n-${Date.now()}-1`, authorName: 'Kabir', text: 'Welcome to our collaborative trip! Add places you want to visit.', createdAt: 'Just now', color: 'yellow', rotation: -2 },
      ],
    };

    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(newId);
    return newId;
  };

  const updateTrip = (id: string, updates: Partial<Trip>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const reorderItems = (tripId: string, dayId: string, activeId: string, overId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          days: trip.days.map((day) => {
            if (day.id !== dayId) return day;
            const items = [...day.items];
            const oldIndex = items.findIndex((i) => i.id === activeId);
            const newIndex = items.findIndex((i) => i.id === overId);
            if (oldIndex === -1 || newIndex === -1) return day;
            const [movedItem] = items.splice(oldIndex, 1);
            items.splice(newIndex, 0, movedItem);
            return { ...day, items };
          }),
        };
      })
    );
  };

  const addItem = (tripId: string, dayId: string, itemData: Omit<ItineraryItem, 'id' | 'dayId'>) => {
    const newItem: ItineraryItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dayId,
    };

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          days: trip.days.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              items: [...day.items, newItem],
            };
          }),
        };
      })
    );
  };

  const deleteItem = (tripId: string, dayId: string, itemId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          days: trip.days.map((day) => {
            if (day.id !== dayId) return day;
            return {
              ...day,
              items: day.items.filter((i) => i.id !== itemId),
            };
          }),
        };
      })
    );
  };

  const toggleChecklist = (tripId: string, itemId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          checklist: trip.checklist.map((c) =>
            c.id === itemId ? { ...c, isCompleted: !c.isCompleted } : c
          ),
        };
      })
    );
  };

  const addChecklist = (tripId: string, itemData: Omit<ChecklistItem, 'id' | 'isCompleted'>) => {
    const newItem: ChecklistItem = {
      ...itemData,
      id: `check-${Date.now()}`,
      isCompleted: false,
    };
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, checklist: [...trip.checklist, newItem] };
      })
    );
  };

  const deleteChecklist = (tripId: string, itemId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, checklist: trip.checklist.filter((c) => c.id !== itemId) };
      })
    );
  };

  const addExpense = (tripId: string, expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, expenses: [newExpense, ...trip.expenses] };
      })
    );
  };

  const deleteExpense = (tripId: string, expenseId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, expenses: trip.expenses.filter((e) => e.id !== expenseId) };
      })
    );
  };

  const addNote = (tripId: string, authorName: string, text: string, color: ScrapbookNote['color']) => {
    const rotations = [-3, -2, -1, 1, 2, 3];
    const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];
    const newNote: ScrapbookNote = {
      id: `note-${Date.now()}`,
      authorName,
      text,
      createdAt: 'Just now',
      color,
      rotation: randomRotation,
    };
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, notes: [newNote, ...trip.notes] };
      })
    );
  };

  const deleteNote = (tripId: string, noteId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, notes: trip.notes.filter((n) => n.id !== noteId) };
      })
    );
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        setActiveTripId,
        createTrip,
        updateTrip,
        deleteTrip,
        reorderItems,
        addItem,
        deleteItem,
        toggleChecklist,
        addChecklist,
        deleteChecklist,
        addExpense,
        deleteExpense,
        addNote,
        deleteNote,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}

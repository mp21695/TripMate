'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Trip, ItineraryItem, ChecklistItem, Expense, ScrapbookNote, User } from '../types';
import { INITIAL_TRIPS } from '../data/mockTrips';

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  currentUser: User | null;
  isLoading: boolean;
  setActiveTripId: (id: string) => void;
  refreshUser: () => Promise<void>;
  refreshTrips: () => Promise<void>;
  refreshTrip: (id: string) => Promise<void>;
  createTrip: (trip: Omit<Trip, 'id' | 'members' | 'days' | 'checklist' | 'expenses' | 'notes' | 'weatherSummary'>) => Promise<string>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  // Itinerary items
  reorderItems: (tripId: string, dayId: string, activeId: string, overId: string) => Promise<void>;
  addItem: (tripId: string, dayId: string, item: Omit<ItineraryItem, 'id' | 'dayId'>) => Promise<void>;
  deleteItem: (tripId: string, dayId: string, itemId: string) => Promise<void>;
  // Checklist
  toggleChecklist: (tripId: string, itemId: string) => Promise<void>;
  addChecklist: (tripId: string, item: Omit<ChecklistItem, 'id' | 'isCompleted'>) => Promise<void>;
  deleteChecklist: (tripId: string, itemId: string) => Promise<void>;
  // Expenses
  addExpense: (tripId: string, expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (tripId: string, expenseId: string) => Promise<void>;
  // Notes
  addNote: (tripId: string, authorName: string, text: string, color: ScrapbookNote['color']) => Promise<void>;
  deleteNote: (tripId: string, noteId: string) => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

const STORAGE_KEY = 'tripmate_data_v1';

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);
  const [activeTripId, setActiveTripId] = useState<string>('goa-2026');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch current user
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          return;
        }
      }
      setCurrentUser(null);
    } catch (err) {
      console.warn('Failed to fetch current user:', err);
    }
  }, []);

  // Fetch all trips belonging to current user
  const refreshTrips = useCallback(async () => {
    try {
      const res = await fetch('/api/trips');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.trips) && data.trips.length > 0) {
          setTrips(data.trips);
          // If active trip is not among fetched trips, default to first
          if (!data.trips.some((t: Trip) => t.id === activeTripId)) {
            setActiveTripId(data.trips[0].id);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch trips from API:', err);
    }
  }, [activeTripId]);

  // Fetch single trip with latest details
  const refreshTrip = useCallback(async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.trip) {
          setTrips((prev) => {
            const exists = prev.some((t) => t.id === tripId);
            if (exists) {
              return prev.map((t) => (t.id === tripId ? data.trip : t));
            }
            return [data.trip, ...prev];
          });
        }
      }
    } catch (err) {
      console.warn(`Failed to refresh trip ${tripId}:`, err);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      try {
        // Hydrate from localStorage first for instant UI
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setTrips(parsed);
          }
        }
      } catch {
        // fallback to initial
      }

      await refreshUser();
      await refreshTrips();

      if (isMounted) {
        setIsLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [refreshUser, refreshTrips]);

  // Save to localStorage whenever trips update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {
      // ignore
    }
  }, [trips]);

  // Whenever activeTripId changes, fetch latest trip data from backend
  useEffect(() => {
    if (activeTripId) {
      refreshTrip(activeTripId);
    }
  }, [activeTripId, refreshTrip]);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || null;

  const createTrip = async (data: Omit<Trip, 'id' | 'members' | 'days' | 'checklist' | 'expenses' | 'notes' | 'weatherSummary'>): Promise<string> => {
    const tempId = `trip-${Date.now()}`;
    const newTripPlaceholder: Trip = {
      ...data,
      id: tempId,
      weatherSummary: {
        temp: 26,
        condition: 'Clear Skies',
        icon: '☀️',
      },
      members: [
        {
          id: currentUser?.id || 'user-me',
          name: currentUser?.name || 'Explorer (You)',
          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          role: 'OWNER',
          isOnline: false,
          upiId: currentUser?.upiId || 'tripmate@upi',
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
      ],
      checklist: [],
      expenses: [],
      notes: [],
    };

    setTrips((prev) => [newTripPlaceholder, ...prev]);
    setActiveTripId(tempId);

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          destination: data.destination,
          stateOrRegion: data.stateOrRegion,
          startDate: data.startDate,
          endDate: data.endDate,
          totalBudget: data.totalBudget,
          currency: data.currency || 'INR',
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
          coverImage: data.coverImage,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.trip) {
          setTrips((prev) => prev.map((t) => (t.id === tempId ? result.trip : t)));
          setActiveTripId(result.trip.id);
          return result.trip.id;
        }
      }
    } catch (err) {
      console.warn('Backend createTrip call failed, using local copy:', err);
    }

    return tempId;
  };

  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    try {
      await fetch(`/api/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Backend updateTrip failed:', err);
    }
  };

  const deleteTrip = async (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend deleteTrip failed:', err);
    }
  };

  const reorderItems = async (tripId: string, dayId: string, activeId: string, overId: string) => {
    let reorderedDayItems: ItineraryItem[] = [];

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
            reorderedDayItems = items;
            return { ...day, items };
          }),
        };
      })
    );

    if (reorderedDayItems.length > 0) {
      try {
        const moves = reorderedDayItems.map((item, index) => ({
          itemId: item.id,
          dayId,
          orderIndex: index,
        }));
        await fetch(`/api/trips/${tripId}/items/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moves }),
        });
      } catch (err) {
        console.warn('Backend reorderItems failed:', err);
      }
    }
  };

  const addItem = async (tripId: string, dayId: string, itemData: Omit<ItineraryItem, 'id' | 'dayId'>) => {
    const tempId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ItineraryItem = {
      ...itemData,
      id: tempId,
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

    try {
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          // Replace tempId with actual server-generated id
          setTrips((prev) =>
            prev.map((trip) => {
              if (trip.id !== tripId) return trip;
              return {
                ...trip,
                days: trip.days.map((day) => {
                  if (day.id !== dayId) return day;
                  return {
                    ...day,
                    items: day.items.map((it) => (it.id === tempId ? data.item : it)),
                  };
                }),
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn('Backend addItem failed:', err);
    }
  };

  const deleteItem = async (tripId: string, dayId: string, itemId: string) => {
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

    try {
      await fetch(`/api/trips/${tripId}/items/${itemId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend deleteItem failed:', err);
    }
  };

  const toggleChecklist = async (tripId: string, itemId: string) => {
    let nextStatus = false;

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          checklist: trip.checklist.map((c) => {
            if (c.id === itemId) {
              nextStatus = !c.isCompleted;
              return { ...c, isCompleted: nextStatus };
            }
            return c;
          }),
        };
      })
    );

    try {
      await fetch(`/api/trips/${tripId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: nextStatus }),
      });
    } catch (err) {
      console.warn('Backend toggleChecklist failed:', err);
    }
  };

  const addChecklist = async (tripId: string, itemData: Omit<ChecklistItem, 'id' | 'isCompleted'>) => {
    const tempId = `check-${Date.now()}`;
    const newItem: ChecklistItem = {
      ...itemData,
      id: tempId,
      isCompleted: false,
    };

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, checklist: [...trip.checklist, newItem] };
      })
    );

    try {
      const res = await fetch(`/api/trips/${tripId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: itemData.text,
          category: itemData.category,
          priority: itemData.priority,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          setTrips((prev) =>
            prev.map((trip) => {
              if (trip.id !== tripId) return trip;
              return {
                ...trip,
                checklist: trip.checklist.map((c) => (c.id === tempId ? data.item : c)),
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn('Backend addChecklist failed:', err);
    }
  };

  const deleteChecklist = async (tripId: string, itemId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, checklist: trip.checklist.filter((c) => c.id !== itemId) };
      })
    );

    try {
      await fetch(`/api/trips/${tripId}/checklist/${itemId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend deleteChecklist failed:', err);
    }
  };

  const addExpense = async (tripId: string, expenseData: Omit<Expense, 'id'>) => {
    const tempId = `exp-${Date.now()}`;
    const newExpense: Expense = {
      ...expenseData,
      id: tempId,
    };

    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, expenses: [newExpense, ...trip.expenses] };
      })
    );

    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseData.title,
          amount: expenseData.amount,
          category: expenseData.category,
          date: expenseData.date,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.expense) {
          setTrips((prev) =>
            prev.map((trip) => {
              if (trip.id !== tripId) return trip;
              return {
                ...trip,
                expenses: trip.expenses.map((e) => (e.id === tempId ? data.expense : e)),
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn('Backend addExpense failed:', err);
    }
  };

  const deleteExpense = async (tripId: string, expenseId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, expenses: trip.expenses.filter((e) => e.id !== expenseId) };
      })
    );

    try {
      await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend deleteExpense failed:', err);
    }
  };

  const addNote = async (tripId: string, authorName: string, text: string, color: ScrapbookNote['color']) => {
    const rotations = [-3, -2, -1, 1, 2, 3];
    const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];
    const tempId = `note-${Date.now()}`;
    const newNote: ScrapbookNote = {
      id: tempId,
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

    try {
      const res = await fetch(`/api/trips/${tripId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, color }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.note) {
          setTrips((prev) =>
            prev.map((trip) => {
              if (trip.id !== tripId) return trip;
              return {
                ...trip,
                notes: trip.notes.map((n) => (n.id === tempId ? data.note : n)),
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn('Backend addNote failed:', err);
    }
  };

  const deleteNote = async (tripId: string, noteId: string) => {
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id !== tripId) return trip;
        return { ...trip, notes: trip.notes.filter((n) => n.id !== noteId) };
      })
    );

    try {
      await fetch(`/api/trips/${tripId}/notes/${noteId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend deleteNote failed:', err);
    }
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        currentUser,
        isLoading,
        setActiveTripId,
        refreshUser,
        refreshTrips,
        refreshTrip,
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

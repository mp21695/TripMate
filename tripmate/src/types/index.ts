export type ActivityCategory = 'ATTRACTION' | 'FOOD' | 'TRANSIT' | 'LODGING' | 'CUSTOM';

export type TransitMode = 'SCOOTER' | 'CAB' | 'TRAIN' | 'FLIGHT' | 'WALK';

export interface ItineraryItem {
  id: string;
  dayId: string;
  title: string;
  category: ActivityCategory;
  startTime: string;
  endTime: string;
  estimatedCost: number; // in INR (₹)
  lat: number;
  lng: number;
  locationName: string;
  bookingRef?: string;
  notes?: string;
  transitToNext?: {
    mode: TransitMode;
    durationMinutes: number;
    distanceKm: number;
  };
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  items: ItineraryItem[];
}

export interface TripMember {
  id: string;
  name: string;
  avatar: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  isOnline: boolean;
  upiId?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  category: 'DOCUMENTS' | 'CLOTHING' | 'MEDICINES' | 'ELECTRONICS' | 'BEACH/GEAR';
  isCompleted: boolean;
  assignedToName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Expense {
  id: string;
  title: string;
  amount: number; // in INR (₹)
  category: 'FOOD' | 'STAY' | 'TRANSIT' | 'ACTIVITIES' | 'MISC';
  paidByName: string;
  paidByUpi?: string;
  date: string;
}

export interface ScrapbookNote {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
  color: 'yellow' | 'pink' | 'blue' | 'green';
  rotation: number;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  stateOrRegion: string;
  startDate: string;
  endDate: string;
  totalBudget: number; // in INR (₹)
  currency: string;
  coverImage: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  weatherSummary: {
    temp: number;
    condition: string;
    icon: string;
  };
  members: TripMember[];
  days: DayPlan[];
  checklist: ChecklistItem[];
  expenses: Expense[];
  notes: ScrapbookNote[];
}

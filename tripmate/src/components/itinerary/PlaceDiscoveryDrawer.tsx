'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTrip } from '@/context/TripContext';
import {
  Search,
  X,
  MapPin,
  Star,
  Plus,
  Loader2,
  Sparkles,
  AlertCircle,
  Check,
  Landmark,
  Utensils,
  Hotel,
  Compass,
} from 'lucide-react';
import { ActivityCategory } from '@/types';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  photoUrl?: string;
  description?: string;
}

interface PlaceDiscoveryDrawerProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  days?: import('@/types').DayPlan[];
  activeDayId?: string;
}

const CATEGORY_CONFIG: Record<
  ActivityCategory,
  {
    label: string;
    icon: typeof Landmark;
    chips: string[];
    defaultDuration: string;
    defaultCost: number;
    badgeLabel: string;
  }
> = {
  ATTRACTION: {
    label: 'Sightseeing',
    icon: Landmark,
    chips: ['Must-Visit Sights', 'Historic Forts', 'Palaces', 'Scenic Viewpoints', 'Bazaars'],
    defaultDuration: '2 HR STOP',
    defaultCost: 300,
    badgeLabel: 'Sightseeing',
  },
  FOOD: {
    label: 'Food & Dining',
    icon: Utensils,
    chips: ['Iconic Cafes', 'Street Food', 'Rooftop Dining', 'Traditional Sweets', 'Fine Dining'],
    defaultDuration: '1.5 HR STOP',
    defaultCost: 800,
    badgeLabel: 'Food & Drinks',
  },
  LODGING: {
    label: 'Stays & Villas',
    icon: Hotel,
    chips: ['Heritage Haveli', 'Luxury Palaces', 'Boutique Stays', 'Backpacker Hostels'],
    defaultDuration: 'CHECK-IN',
    defaultCost: 3500,
    badgeLabel: 'Stay / Villa',
  },
  TRANSIT: {
    label: 'Transit',
    icon: Compass,
    chips: ['Railway Station', 'Airport Terminals', 'Bus Transit Hub', 'Metro Hubs'],
    defaultDuration: 'TRANSIT STOP',
    defaultCost: 250,
    badgeLabel: 'Transit',
  },
  CUSTOM: {
    label: 'Custom',
    icon: Compass,
    chips: ['Popular Spots', 'Local Markets'],
    defaultDuration: 'CUSTOM STOP',
    defaultCost: 500,
    badgeLabel: 'Custom',
  },
};

export function PlaceDiscoveryDrawer({
  tripId,
  isOpen,
  onClose,
  destination,
  days: propDays,
  activeDayId,
}: PlaceDiscoveryDrawerProps) {
  const { trips, activeTrip, addItem } = useTrip();

  // Determine canonical trip matching tripId
  const currentTrip =
    trips.find((t) => t.id === tripId) ||
    (activeTrip?.id === tripId ? activeTrip : null) ||
    activeTrip;

  const resolvedTripId = currentTrip?.id || tripId;
  const days = propDays && propDays.length > 0 ? propDays : currentTrip?.days || activeTrip?.days || [];

  const [userQuery, setUserQuery] = useState<string | null>(null);
  const query = userQuery !== null ? userQuery : destination || '';
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingPlaceId, setIsAddingPlaceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overrideDayId, setOverrideDayId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('ATTRACTION');
  const [addedPlaceIds, setAddedPlaceIds] = useState<Record<string, boolean>>({});

  // Derive target day from activeDayId or first day, with user override support
  const activeOrFirstDayId =
    activeDayId && days.some((d) => d.id === activeDayId) ? activeDayId : days[0]?.id || '';
  const selectedDayId =
    overrideDayId && days.some((d) => d.id === overrideDayId) ? overrideDayId : activeOrFirstDayId;

  const executeSearch = useCallback(
    async (searchQuery: string, cat: ActivityCategory) => {
      const q = searchQuery.trim();
      if (!q) return;

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}`
        );
        if (res.status === 429) {
          setErrorMsg('Search rate limit reached (20/min). Please wait a moment and try again.');
          return;
        }
        if (res.status === 401) {
          setErrorMsg('Authentication expired. Please sign in again.');
          return;
        }
        if (!res.ok) {
          setErrorMsg('Failed to locate places. Try a different query or location.');
          return;
        }

        const data = await res.json();
        if (Array.isArray(data.places)) {
          setPlaces(data.places);
          if (data.places.length === 0) {
            setErrorMsg(`No locations found matching "${q}". Try searching for popular landmarks or cafes.`);
          }
        }
      } catch {
        setErrorMsg('Network error while searching places. Please verify your connection.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-discover places on drawer open if no places yet
  useEffect(() => {
    if (isOpen && destination) {
      const timer = setTimeout(() => {
        executeSearch(destination, selectedCategory);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, destination]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(query, selectedCategory);
  };

  const handleCategoryChange = (newCat: ActivityCategory) => {
    setSelectedCategory(newCat);
    executeSearch(query || destination || '', newCat);
  };

  const handleChipClick = (chip: string) => {
    const fullQuery = `${destination || ''} ${chip}`.trim();
    setUserQuery(fullQuery);
    executeSearch(fullQuery, selectedCategory);
  };

  const handleAddPlace = async (place: PlaceResult) => {
    const targetDayId = selectedDayId || (days.length > 0 ? days[0]?.id : null);
    if (!targetDayId) {
      setErrorMsg('No valid schedule day found to add this stop to.');
      return;
    }

    if (!resolvedTripId) {
      setErrorMsg('No valid trip identifier found.');
      return;
    }

    setIsAddingPlaceId(place.id);
    setErrorMsg(null);

    const config = CATEGORY_CONFIG[selectedCategory] || CATEGORY_CONFIG.ATTRACTION;

    try {
      await addItem(resolvedTripId, targetDayId, {
        title: place.name,
        category: selectedCategory,
        startTime: selectedCategory === 'FOOD' ? '01:00 PM' : '10:30 AM',
        endTime: selectedCategory === 'FOOD' ? '02:30 PM' : '12:30 PM',
        locationName: place.address || place.name,
        estimatedCost: config.defaultCost,
        lat: Number(place.lat),
        lng: Number(place.lng),
        notes: place.description || (place.rating ? `Rating: ${place.rating} ★` : undefined),
        transitToNext: {
          mode: 'SCOOTER',
          durationMinutes: 15,
          distanceKm: 4.5,
        },
      });

      setAddedPlaceIds((prev) => ({ ...prev, [place.id]: true }));
      setTimeout(() => {
        setAddedPlaceIds((prev) => ({ ...prev, [place.id]: false }));
      }, 2500);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 401) {
        setErrorMsg('Session expired (401). Please sign in again to add stops.');
      } else if (apiErr.status === 403) {
        setErrorMsg('Access denied (403): You must be an OWNER or EDITOR of this trip.');
      } else if (apiErr.status === 404) {
        setErrorMsg(apiErr.message || 'Trip or Day not found on the server (404).');
      } else if (apiErr.status === 500) {
        setErrorMsg('Server error (500) while creating stop. Please try again.');
      } else {
        setErrorMsg(apiErr.message || 'Network error occurred while adding stop.');
      }
    } finally {
      setIsAddingPlaceId(null);
    }
  };

  const activeConfig = CATEGORY_CONFIG[selectedCategory] || CATEGORY_CONFIG.ATTRACTION;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md sm:max-w-lg bg-[#111215] border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] uppercase text-[#8a8c8e] tracking-widest">
                GEOSPATIAL DISCOVERY
              </span>
              <span className="px-2 py-0.5 text-[9px] bg-white/10 text-white rounded-full font-mono flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                AI & Places
              </span>
            </div>
            <h3 className="font-serif text-2xl font-normal text-white mt-1">
              Explore & Add Stops
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8a8c8e] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-6 pt-4 pb-2 bg-[#14161a] border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {(['ATTRACTION', 'FOOD', 'LODGING', 'TRANSIT'] as ActivityCategory[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-medium shadow-md'
                    : 'bg-[#181b20] text-[#8a8c8e] hover:text-white border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Destination Filters */}
        <div className="p-6 border-b border-white/10 space-y-3.5 bg-[#14161a]">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={`Search ${activeConfig.label.toLowerCase()} in ${destination || 'destination'}...`}
              className="w-full bg-[#0c0e11] border border-white/10 rounded-full pl-10 pr-24 py-2.5 text-xs text-white focus:outline-hidden focus:border-white font-mono"
            />
            <Search className="w-4 h-4 text-[#8a8c8e] absolute left-3.5 top-3" />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-[10px] font-sans font-medium uppercase tracking-wider rounded-full transition-colors flex items-center space-x-1 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>SEARCH</span>
              )}
            </button>
          </form>

          {/* Quick Discovery Tag Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[9px] font-mono uppercase text-[#8a8c8e] shrink-0 mr-1">
              Top tags:
            </span>
            {activeConfig.chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 shrink-0 transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Target Day Selector */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[9px] font-mono uppercase text-[#8a8c8e] block mb-1">
                ADD TO SCHEDULE DAY
              </label>
              <select
                value={selectedDayId}
                onChange={(e) => setOverrideDayId(e.target.value)}
                className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-white font-mono"
              >
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber}: {d.title.split(':')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono uppercase text-[#8a8c8e] block mb-1">
                ACTIVITY CATEGORY
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value as ActivityCategory)}
                className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-white font-mono"
              >
                <option value="ATTRACTION">Sightseeing</option>
                <option value="FOOD">Food & Drinks</option>
                <option value="LODGING">Stay / Villa</option>
                <option value="TRANSIT">Transit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xs text-xs text-rose-300 font-mono flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isLoading && places.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 text-white/70 animate-spin mx-auto" />
              <p className="font-serif text-white text-base">Curating Top Spots...</p>
              <p className="text-[#8a8c8e] text-xs font-mono">
                Discovering authentic places with coordinates & ratings
              </p>
            </div>
          )}

          {places.length === 0 && !isLoading && !errorMsg && (
            <div className="text-center py-16">
              <Sparkles className="w-8 h-8 text-[#8a8c8e] mx-auto mb-3 opacity-60" />
              <p className="font-serif text-white text-base">Discover Curated Spots</p>
              <p className="text-[#8a8c8e] text-xs font-mono mt-1 max-w-xs mx-auto">
                Search or tap a category above to view real places in {destination || 'your destination'} and add them directly to your schedule.
              </p>
            </div>
          )}

          {places.map((place) => {
            const isAdded = addedPlaceIds[place.id];

            return (
              <div
                key={place.id}
                className="bg-[#16181d] border border-white/5 hover:border-white/20 rounded-xs p-4 transition-all duration-200 flex flex-col justify-between space-y-3 group shadow-lg"
              >
                <div className="flex items-start gap-3">
                  {/* Photo thumbnail */}
                  {place.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={place.photoUrl}
                      alt={place.name}
                      className="w-16 h-16 object-cover rounded-xs border border-white/10 shrink-0 bg-neutral-900"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xs bg-[#0c0e11] border border-white/10 flex items-center justify-center shrink-0 text-[#8a8c8e]">
                      <MapPin className="w-6 h-6 opacity-60" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-base text-white group-hover:text-white/90 truncate">
                        {place.name}
                      </h4>
                      {place.rating && (
                        <div className="flex items-center space-x-1 font-mono text-xs text-amber-400 shrink-0 ml-2">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{place.rating}</span>
                        </div>
                      )}
                    </div>

                    {place.description && (
                      <p className="text-[11px] text-neutral-300 font-sans mt-0.5 line-clamp-2 italic">
                        {place.description}
                      </p>
                    )}

                    <p className="text-[11px] font-mono text-[#8a8c8e] mt-1 line-clamp-2">
                      {place.address}
                    </p>

                    <div className="flex items-center space-x-2 mt-1.5 text-[9px] font-mono text-[#8a8c8e]">
                      <span>{Number(place.lat).toFixed(4)}° N</span>
                      <span>•</span>
                      <span>{Number(place.lng).toFixed(4)}° E</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-mono uppercase text-[#8a8c8e]">
                      {activeConfig.defaultDuration}
                    </span>
                    <span className="text-[9px] font-mono text-white/50">•</span>
                    <span className="text-[9px] font-mono text-white/70">
                      EST ₹{activeConfig.defaultCost}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddPlace(place)}
                    disabled={isAdded || isAddingPlaceId === place.id}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-500 text-black'
                        : isAddingPlaceId === place.id
                        ? 'bg-neutral-600 text-white cursor-wait opacity-80'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>ADDED TO DAY</span>
                      </>
                    ) : isAddingPlaceId === place.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>ADDING...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>ADD TO SCHEDULE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

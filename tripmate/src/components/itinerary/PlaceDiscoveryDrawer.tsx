'use client';

import React, { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import { Search, X, MapPin, Star, Plus, Loader2, Sparkles, AlertCircle, Check } from 'lucide-react';
import { ActivityCategory } from '@/types';

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  photoUrl?: string;
}

interface PlaceDiscoveryDrawerProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  destination: string;
}

export function PlaceDiscoveryDrawer({
  tripId,
  isOpen,
  onClose,
  destination,
}: PlaceDiscoveryDrawerProps) {
  const { activeTrip, addItem } = useTrip();
  const [query, setQuery] = useState(destination || '');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>(
    activeTrip?.days[0]?.id || ''
  );
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('ATTRACTION');
  const [addedPlaceIds, setAddedPlaceIds] = useState<Record<string, boolean>>({});

  if (!isOpen || !activeTrip) return null;

  const days = activeTrip.days;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}`);
      if (res.status === 429) {
        setErrorMsg('Search rate limit reached. Please wait a minute and try again.');
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        setErrorMsg('Failed to locate places. Try a different query or location.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      if (Array.isArray(data.places)) {
        setPlaces(data.places);
        if (data.places.length === 0) {
          setErrorMsg(`No locations found matching "${query}". Try searching for popular landmarks or cafes.`);
        }
      }
    } catch {
      setErrorMsg('Network error while searching places.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlace = async (place: PlaceResult) => {
    const targetDayId = selectedDayId || days[0]?.id;
    if (!targetDayId) return;

    await addItem(tripId, targetDayId, {
      title: place.name,
      category: selectedCategory,
      startTime: '11:00 AM',
      endTime: '01:00 PM',
      locationName: place.address || place.name,
      estimatedCost: selectedCategory === 'FOOD' ? 800 : 300,
      lat: place.lat,
      lng: place.lng,
      notes: place.rating ? `Google Rating: ${place.rating} ★` : undefined,
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
  };

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
              <span className="px-2 py-0.5 text-[9px] bg-white/10 text-white rounded-full font-mono">
                Places API
              </span>
            </div>
            <h3 className="font-serif text-2xl font-normal text-white mt-1">
              Explore & Add Stops
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8a8c8e] hover:text-white rounded-full hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Destination Filters */}
        <div className="p-6 border-b border-white/10 space-y-4 bg-[#14161a]">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cafes, viewpoints, stays, forts..."
              className="w-full bg-[#0c0e11] border border-white/10 rounded-full pl-10 pr-24 py-2.5 text-xs text-white focus:outline-hidden focus:border-white font-mono"
            />
            <Search className="w-4 h-4 text-[#8a8c8e] absolute left-3.5 top-3" />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-[10px] font-sans font-medium uppercase tracking-wider rounded-full transition-colors flex items-center space-x-1"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span>SEARCH</span>
              )}
            </button>
          </form>

          {/* Target Day & Category Quick Selector */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[9px] font-mono uppercase text-[#8a8c8e] block mb-1">
                ADD TO SCHEDULE DAY
              </label>
              <select
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
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
                CATEGORY
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ActivityCategory)}
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

          {places.length === 0 && !isLoading && !errorMsg && (
            <div className="text-center py-16">
              <Sparkles className="w-8 h-8 text-[#8a8c8e] mx-auto mb-3 opacity-60" />
              <p className="font-serif text-white text-base">Find Verified Spots</p>
              <p className="text-[#8a8c8e] text-xs font-mono mt-1 max-w-xs mx-auto">
                Search above for landmarks in {destination || 'your destination'} to view photos, addresses, and add to your itinerary with real coordinates.
              </p>
            </div>
          )}

          {places.map((place) => {
            const isAdded = addedPlaceIds[place.id];

            return (
              <div
                key={place.id}
                className="bg-[#16181d] border border-white/5 hover:border-white/20 rounded-xs p-4 transition-all duration-200 flex flex-col justify-between space-y-3 group"
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

                    <p className="text-[11px] font-mono text-[#8a8c8e] mt-1 line-clamp-2">
                      {place.address}
                    </p>

                    <div className="flex items-center space-x-2 mt-1.5 text-[9px] font-mono text-[#8a8c8e]">
                      <span>{place.lat.toFixed(4)}° N</span>
                      <span>•</span>
                      <span>{place.lng.toFixed(4)}° E</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase text-[#8a8c8e]">
                    PRESET 2 HR STOP
                  </span>

                  <button
                    onClick={() => handleAddPlace(place)}
                    disabled={isAdded}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>ADDED TO DAY</span>
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

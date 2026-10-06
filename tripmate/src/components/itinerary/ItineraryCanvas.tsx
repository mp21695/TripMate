'use client';

import React, { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ActivityCard } from './ActivityCard';
import { InteractiveMap } from './InteractiveMap';
import { ItineraryItem, ActivityCategory } from '@/types';
import { Plus, Calendar, MapPin, Sparkles, X, Compass } from 'lucide-react';

export function ItineraryCanvas({ tripId }: { tripId: string }) {
  const { activeTrip, reorderItems, addItem, deleteItem } = useTrip();
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding an activity
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('ATTRACTION');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [locationName, setLocationName] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('500');
  const [notes, setNotes] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!activeTrip) return null;

  const currentDay = activeTrip.days[activeDayIndex] || activeTrip.days[0];
  const items = currentDay ? currentDay.items : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && currentDay) {
      reorderItems(tripId, currentDay.id, String(active.id), String(over.id));
    }
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentDay) return;

    const baseLat = activeTrip.coordinates.lat + (Math.random() - 0.5) * 0.08;
    const baseLng = activeTrip.coordinates.lng + (Math.random() - 0.5) * 0.08;

    addItem(tripId, currentDay.id, {
      title: title.trim(),
      category,
      startTime,
      endTime,
      locationName: locationName.trim() || `${title} (${activeTrip.destination})`,
      estimatedCost: parseFloat(estimatedCost) || 0,
      lat: baseLat,
      lng: baseLng,
      notes: notes.trim(),
      transitToNext: {
        mode: 'SCOOTER',
        durationMinutes: 15,
        distanceKm: 5,
      },
    });

    setTitle('');
    setLocationName('');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Day Selector & Crew Presence */}
      <div className="bg-[#14161a] border border-white/10 p-4 rounded-xs shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Day Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1">
          {activeTrip.days.map((day, idx) => (
            <button
              key={day.id}
              onClick={() => setActiveDayIndex(idx)}
              className={`px-4 py-2 rounded-xs font-mono text-xs transition-all shrink-0 flex items-center space-x-2 ${
                activeDayIndex === idx
                  ? 'bg-white text-black font-medium'
                  : 'bg-[#181b20] text-[#8a8c8e] hover:text-white border border-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>DAY {day.dayNumber}</span>
              <span className="text-[10px] opacity-70">({day.items.length})</span>
            </button>
          ))}
        </div>

        {/* Live Collaborators Presence */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex -space-x-2 overflow-hidden">
            {activeTrip.members.map((member) => (
              <div
                key={member.id}
                className="relative inline-block w-7 h-7 rounded-full ring-2 ring-[#14161a] overflow-hidden"
                title={`${member.name} (${member.isOnline ? 'Active' : 'Offline'})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                {member.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-black" />
                )}
              </div>
            ))}
          </div>
          <span className="text-[10px] font-mono text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            ● LIVE COLLABORATION
          </span>
        </div>
      </div>

      {/* Split View: Left Timeline (Drag-and-Drop) + Right Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Day Itinerary Items */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="font-serif text-2xl sm:text-3xl text-white font-normal">
                {currentDay ? currentDay.title : 'Day Schedule'}
              </h3>
              <p className="text-xs text-[#8a8c8e] mt-0.5 font-mono">
                {currentDay ? currentDay.date : ''} • Drag to reorder schedule
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 bg-white text-black hover:bg-neutral-200 font-sans font-medium px-4 py-2 rounded-full text-xs tracking-wider uppercase transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD STOP</span>
            </button>
          </div>

          {/* Dnd Sortable Context */}
          {items.length === 0 ? (
            <div className="bg-[#14161a] border border-dashed border-white/10 rounded-xs p-12 text-center">
              <Compass className="w-8 h-8 text-[#8a8c8e] mx-auto mb-2 opacity-60" />
              <h4 className="font-serif text-white text-base">
                No stops scheduled for this day yet
              </h4>
              <p className="text-[#8a8c8e] text-xs mt-1 max-w-sm mx-auto font-mono">
                Click &ldquo;Add Stop&rdquo; above to append cafes, viewpoints, or stays.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onDelete={(id) => currentDay && deleteItem(tripId, currentDay.id, id)}
                      onHover={(id) => setHoveredCardId(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right Column: Interactive Map */}
        <div className="lg:col-span-5 sticky top-24">
          <InteractiveMap
            items={items}
            destinationName={activeTrip.destination}
            activeItemId={hoveredCardId || undefined}
            onSelectPin={(id) => setHoveredCardId(id)}
          />
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#14161a] border border-white/20 rounded-xs max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="font-serif text-2xl text-white font-normal">
              Add Stop to {currentDay?.title.split(':')[0] || 'Day'}
            </h3>

            <form onSubmit={handleCreateActivity} className="space-y-4 mt-6">
              <div>
                <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                  ACTIVITY TITLE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sunset at Chapora Fort"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ActivityCategory)}
                    className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-white"
                  >
                    <option value="ATTRACTION">Sightseeing</option>
                    <option value="FOOD">Food & Drinks</option>
                    <option value="TRANSIT">Transit / Ride</option>
                    <option value="LODGING">Stay / Villa</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                    EST. COST (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="500"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                    START TIME
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                    END TIME
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                  LOCATION
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vagator Beach Road"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                  NOTES
                </label>
                <input
                  type="text"
                  placeholder="e.g. Carry sunglasses and camera"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-mono text-[#8a8c8e] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-white text-black font-sans text-xs tracking-wider uppercase px-5 py-2.5 rounded-full font-medium"
                >
                  Add to Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

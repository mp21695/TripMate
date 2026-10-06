'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItineraryItem, ActivityCategory } from '@/types';
import { GripVertical, Clock, MapPin, Trash2, ExternalLink, Utensils, Mountain, Car, Hotel, Compass } from 'lucide-react';

interface ActivityCardProps {
  item: ItineraryItem;
  index: number;
  onDelete: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export function ActivityCard({ item, index, onDelete, onHover }: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const getCategoryBadge = (cat: ActivityCategory) => {
    switch (cat) {
      case 'FOOD':
        return { label: 'CULINARY', icon: Utensils, color: 'text-orange-400 bg-orange-950/20 border-orange-800/30' };
      case 'ATTRACTION':
        return { label: 'SIGHTSEEING', icon: Mountain, color: 'text-[#ffb000] bg-[#ffb000]/10 border-[#ffb000]/30' };
      case 'TRANSIT':
        return { label: 'TRANSIT', icon: Car, color: 'text-sky-400 bg-sky-950/20 border-sky-800/30' };
      case 'LODGING':
        return { label: 'HAVELI / STAY', icon: Hotel, color: 'text-purple-400 bg-purple-950/20 border-purple-800/30' };
      default:
        return { label: 'ACTIVITY', icon: Compass, color: 'text-[#8d8a83] bg-neutral-900 border-neutral-800' };
    }
  };

  const badge = getCategoryBadge(item.category);
  const BadgeIcon = badge.icon;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.locationName
  )}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Activity Card Editorial Container */}
      <div className="bg-[#111214] hover:bg-[#151619] border border-[rgba(255,255,255,0.08)] hover:border-[#ffb000]/60 rounded-sm p-4 sm:p-5 transition-all duration-200 shadow-xl hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          {/* Drag Grip & Waypoint Number */}
          <div className="flex items-center space-x-2 pt-0.5">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-[#8d8a83] hover:text-[#ffb000] hover:bg-neutral-900 rounded-xs transition-colors"
              title="Drag to reorder waypoint"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="w-6 h-6 rounded-xs bg-[#08090a] border border-[rgba(255,255,255,0.1)] flex items-center justify-center font-mono text-[10px] font-bold text-[#ffb000]">
              {index + 1}
            </div>
          </div>

          {/* Main Editorial Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Category Pill */}
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-2xs text-[9px] font-mono border uppercase tracking-wider ${badge.color}`}
              >
                <BadgeIcon className="w-2.5 h-2.5" />
                <span>{badge.label}</span>
              </span>

              {/* Time Slot */}
              <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-[#8d8a83]">
                <Clock className="w-3 h-3 text-[#ffb000]/70" />
                <span>
                  {item.startTime} — {item.endTime}
                </span>
              </span>

              {/* Booking Reference */}
              {item.bookingRef && (
                <span className="text-[9px] font-mono bg-[#161719] text-[#8d8a83] px-1.5 py-0.5 rounded-2xs border border-[rgba(255,255,255,0.06)]">
                  REF: {item.bookingRef}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="font-serif font-bold text-base text-[#f5f3ee] group-hover:text-[#ffb000] transition-colors">
              {item.title}
            </h4>

            {/* Location & Hyperlink */}
            <div className="flex items-center space-x-2 mt-1">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-[#8d8a83] hover:text-[#ffb000] transition-colors font-mono"
              >
                <MapPin className="w-3 h-3 text-[#ffb000]/70" />
                <span className="truncate max-w-[240px]">{item.locationName}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </div>

            {/* Editorial Notes */}
            {item.notes && (
              <p className="text-xs text-[#8d8a83] mt-2.5 bg-[#0a0b0d] p-2 rounded-xs border border-[rgba(255,255,255,0.04)] font-sans italic">
                &ldquo;{item.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Cost & Delete Action */}
          <div className="flex flex-col items-end space-y-3 shrink-0">
            <div className="font-mono text-xs font-bold text-[#f5f3ee] flex items-center bg-[#08090a] px-2 py-1 rounded-xs border border-[rgba(255,255,255,0.08)]">
              <span className="text-[#ffb000] text-[10px] mr-1">₹</span>
              <span>{item.estimatedCost.toLocaleString('en-IN')}</span>
            </div>

            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-[#8d8a83] hover:text-rose-400 hover:bg-rose-950/20 rounded-xs transition-colors"
              title="Remove waypoint"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Transit Connector Vector to Next Stop */}
      {item.transitToNext && (
        <div className="flex items-center space-x-2 my-2 ml-10">
          <div className="w-0.5 h-4 bg-[#ffb000]/50 ml-2" />
          <div className="inline-flex items-center space-x-2 bg-[#0c0d0e] border border-[rgba(255,255,255,0.08)] px-2.5 py-0.5 rounded-2xs text-[10px] font-mono text-[#8d8a83]">
            <span className="text-[#ffb000] font-bold">
              {item.transitToNext.mode === 'SCOOTER' && '🛵 SCOOTER ROUTE'}
              {item.transitToNext.mode === 'CAB' && '🚗 CAB TRANSIT'}
              {item.transitToNext.mode === 'WALK' && '🚶 SCENIC WALK'}
              {item.transitToNext.mode === 'TRAIN' && '🚂 RAILWAY'}
            </span>
            <span>•</span>
            <span>~{item.transitToNext.durationMinutes} MINS</span>
            <span>({item.transitToNext.distanceKm} KM)</span>
          </div>
        </div>
      )}
    </div>
  );
}

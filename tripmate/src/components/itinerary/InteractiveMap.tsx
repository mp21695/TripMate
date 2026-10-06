'use client';

import React, { useState } from 'react';
import { ItineraryItem } from '@/types';
import { Navigation, Compass, ExternalLink } from 'lucide-react';

interface InteractiveMapProps {
  items: ItineraryItem[];
  destinationName: string;
  activeItemId?: string;
  onSelectPin?: (id: string) => void;
}

export function InteractiveMap({
  items,
  destinationName,
  activeItemId,
  onSelectPin,
}: InteractiveMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Normalize lat/lng to a 0-100% SVG box for precise waypoint and arc positioning
  const lats = items.map((i) => i.lat);
  const lngs = items.map((i) => i.lng);

  const minLat = lats.length ? Math.min(...lats) - 0.05 : 15.0;
  const maxLat = lats.length ? Math.max(...lats) + 0.05 : 15.8;
  const minLng = lngs.length ? Math.min(...lngs) - 0.05 : 73.6;
  const maxLng = lngs.length ? Math.max(...lngs) + 0.05 : 74.2;

  const getCoordinatesPercent = (lat: number, lng: number) => {
    const latSpan = maxLat - minLat || 0.1;
    const lngSpan = maxLng - minLng || 0.1;
    const y = 84 - ((lat - minLat) / latSpan) * 68;
    const x = 16 + ((lng - minLng) / lngSpan) * 68;
    return { x: Math.max(12, Math.min(88, x)), y: Math.max(16, Math.min(84, y)) };
  };

  const currentHover = hoveredId || activeItemId;

  return (
    <div className="relative w-full h-[520px] lg:h-[660px] rounded-xs overflow-hidden border border-white/10 bg-[#0c0e11] shadow-2xl flex flex-col">
      {/* Top Map HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full flex items-center space-x-2 shadow-xl pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
          <span className="font-mono text-[10px] text-white font-medium tracking-widest uppercase">
            {destinationName} • ROUTE MAP
          </span>
          <span className="text-[9px] font-mono text-white/60 border border-white/10 px-1.5 py-0.5 rounded-full">
            {items.length} STOPS
          </span>
        </div>
      </div>

      {/* SVG Vector Map Rendering Canvas */}
      <div className="relative flex-1 w-full h-full bg-[#0c0e11] overflow-hidden select-none">
        {/* Subtle dot matrix grid */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

        {/* Route Lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#9a9a98" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Polyline Path */}
          {items.length > 1 && (
            <path
              d={items
                .map((item, index) => {
                  const { x, y } = getCoordinatesPercent(item.lat, item.lng);
                  return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                })
                .join(' ')}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              className="opacity-90"
            />
          )}
        </svg>

        {/* Waypoint Markers */}
        {items.map((item, index) => {
          const { x, y } = getCoordinatesPercent(item.lat, item.lng);
          const isSelected = currentHover === item.id;

          return (
            <div
              key={item.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-transform duration-300"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectPin?.(item.id)}
            >
              {/* Waypoint Circle */}
              <div
                className={`relative flex items-center justify-center cursor-pointer transition-all ${
                  isSelected ? 'scale-125 z-40' : 'hover:scale-115'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shadow-2xl transition-colors ${
                    isSelected
                      ? 'bg-white text-black ring-4 ring-white/30'
                      : 'bg-[#181b20] text-white border border-white/40 hover:border-white'
                  }`}
                >
                  {index + 1}
                </div>
              </div>

              {/* Waypoint Tooltip */}
              {isSelected && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-10 w-52 bg-[#14161a]/95 backdrop-blur-md border border-white/20 p-3 rounded-xs shadow-2xl pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-[9px] font-mono text-white/60 uppercase tracking-widest flex justify-between">
                    <span>STOP #{index + 1}</span>
                    <span>{item.startTime}</span>
                  </div>
                  <h5 className="font-serif font-normal text-sm text-white truncate mt-1">
                    {item.title}
                  </h5>
                  <p className="text-[10px] text-[#8a8c8e] truncate mt-0.5 font-mono">
                    {item.locationName}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-[#8a8c8e] pt-1.5 border-t border-white/10">
                    <span>EST: ₹{item.estimatedCost.toLocaleString('en-IN')}</span>
                    <span className="text-white flex items-center">
                      MAPS <ExternalLink className="w-2.5 h-2.5 ml-1" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Map Status Bar */}
      <div className="p-3 bg-[#14161a] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#8a8c8e]">
        <div className="flex items-center space-x-2">
          <Compass className="w-3 h-3 text-white/70" />
          <span>SYNCHRONIZED ROUTE • HOVER STOP TO HIGHLIGHT PIN</span>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            destinationName
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-white/80 flex items-center space-x-1"
        >
          <span>OPEN IN MAPS</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
}

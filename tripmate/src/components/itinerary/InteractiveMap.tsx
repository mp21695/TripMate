'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ItineraryItem } from '@/types';
import { Compass, ExternalLink, Loader2 } from 'lucide-react';
import { buildGoogleMapsDayRouteUrl, hasValidCoordinates } from '@/lib/maps/googleMapsRoute';

// Dynamically import LeafletRouteMap with SSR disabled to prevent window is not defined
const LeafletRouteMap = dynamic(
  () => import('./LeafletRouteMap').then((mod) => mod.LeafletRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#0c0e11] text-[#8a8c8e] font-mono text-xs space-y-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#ffb000]" />
        <span>Initializing interactive route map...</span>
      </div>
    ),
  }
);

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const validItems = items.filter(hasValidCoordinates);
  const dayRoute = buildGoogleMapsDayRouteUrl(items, destinationName);

  const handleOpenGoogleMaps = () => {
    if (!dayRoute.url) {
      setToastMessage(dayRoute.message || 'No valid coordinates found for this day.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }
    window.open(dayRoute.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[660px] rounded-xs overflow-hidden border border-white/10 bg-[#0c0e11] shadow-2xl flex flex-col group">
      {/* Top Map HUD Overlay - pointer-events-none on container, pointer-events-auto on interactive pills */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
        <div className="bg-[#14161a]/90 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full flex items-center space-x-2 shadow-xl pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb000] animate-pulse" />
          <span className="font-mono text-[10px] text-white font-medium tracking-widest uppercase">
            {destinationName} • ROUTE MAP
          </span>
          <span className="text-[9px] font-mono text-white/60 border border-white/10 px-1.5 py-0.5 rounded-full">
            {validItems.length} STOPS
          </span>
          <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-full hidden sm:inline-block">
            LEAFLET PAN & ZOOM
          </span>
        </div>
      </div>

      {/* Floating Toast Notification for Day Map feedback */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] bg-neutral-900/95 border border-[#ffb000]/40 text-[#ffb000] px-4 py-2 rounded-xs font-mono text-xs shadow-2xl animate-in fade-in slide-in-from-top-2 pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Leaflet Interactive Canvas */}
      <div className="relative flex-1 w-full h-full bg-[#0c0e11] overflow-hidden">
        <LeafletRouteMap
          items={items}
          destinationName={destinationName}
          activeItemId={activeItemId}
          onSelectPin={onSelectPin}
        />
      </div>

      {/* Bottom Map Status Bar */}
      <div className="p-3 bg-[#14161a] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#8a8c8e] z-[400] gap-2 flex-wrap">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 text-[#ffb000]" />
            <span className="hidden lg:inline">SYNCHRONIZED ROUTE</span>
            <span className="lg:hidden">ROUTE</span>
          </div>

          {/* Category Theme Indicators Legend */}
          <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-white/10 text-[9px] text-[#8a8c8e]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb000]"></span>
              <span>Attraction</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fb923c]"></span>
              <span>Food</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]"></span>
              <span>Stay</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span>
              <span>Transit</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]"></span>
              <span>Activity</span>
            </span>
          </div>
        </div>

        <button
          onClick={handleOpenGoogleMaps}
          className="text-white hover:text-[#ffb000] flex items-center space-x-1.5 font-medium transition-colors cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase ml-auto"
          title={dayRoute.url ? 'Open full day route in Google Maps' : (dayRoute.message || 'No valid stops to route')}
        >
          <span>OPEN DAY IN GOOGLE MAPS</span>
          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
        </button>
      </div>
    </div>
  );
}

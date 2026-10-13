'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryItem } from '@/types';
import { hasValidCoordinates, buildSinglePlaceMapUrl } from '@/lib/maps/googleMapsRoute';

interface LeafletRouteMapProps {
  items: ItineraryItem[];
  destinationName: string;
  activeItemId?: string;
  onSelectPin?: (id: string) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function LeafletRouteMap({
  items,
  activeItemId,
  onSelectPin,
}: LeafletRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // Add zoom controls positioned at bottom right
    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);

    // CartoDB Dark Matter tile layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    // Create layer group for dynamic markers and route polylines
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapRef.current = map;

    // Observe container resizing to automatically invalidate size
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // 2. Update Markers, Routes, and Bounds when items or order changes
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markersMapRef.current.clear();

    const validItems = items.filter(hasValidCoordinates);
    if (validItems.length === 0) {
      // Default viewpoint fallback (India center)
      map.setView([20.5937, 78.9629], 5);
      return;
    }

    const latlngs: L.LatLngExpression[] = validItems.map((item) => [
      item.lat,
      item.lng,
    ]);

    // Draw route lines connecting waypoints in exact itinerary order
    if (latlngs.length > 1) {
      // Outer ambient glow polyline
      L.polyline(latlngs, {
        color: '#ffffff',
        weight: 6,
        opacity: 0.15,
      }).addTo(layerGroup);

      // Core amber dashed route polyline
      L.polyline(latlngs, {
        color: '#ffb000',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 6',
      }).addTo(layerGroup);
    }

    // Add numbered waypoint markers in exact itinerary order
    validItems.forEach((item, index) => {
      const markerIcon = L.divIcon({
        className: 'tripmate-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110">
            <div class="tripmate-marker-badge w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shadow-2xl transition-all ${
              item.coordsVerified === false
                ? 'bg-[#181b20] text-amber-400 border border-amber-500/70 ring-2 ring-amber-500/20'
                : 'bg-[#181b20] text-white border border-white/40 hover:border-white hover:text-amber-300'
            }">
              ${index + 1}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const singleUrl = buildSinglePlaceMapUrl(item);
      const popupContent = `
        <div class="p-3 min-w-[200px] max-w-[260px] bg-[#14161a] text-white font-sans rounded-xs">
          <div class="text-[9px] font-mono text-[#ffb000] uppercase tracking-wider mb-0.5 flex justify-between">
            <span>STOP #${index + 1}</span>
            <span>${escapeHtml(item.startTime)}</span>
          </div>
          <div class="font-serif text-sm font-semibold text-white leading-tight mt-0.5">${escapeHtml(
            item.title
          )}</div>
          <div class="text-[10px] text-[#8a8c8e] font-mono mt-0.5 truncate">${escapeHtml(
            item.locationName
          )}</div>
          ${
            item.coordsVerified === false
              ? '<div class="mt-1 text-[9px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/30 px-1 py-0.5 rounded-2xs">⚠️ Approximate location</div>'
              : ''
          }
          <div class="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono">
            <span class="text-[#8a8c8e]">EST ₹${item.estimatedCost.toLocaleString(
              'en-IN'
            )}</span>
            <a href="${singleUrl}" target="_blank" rel="noopener noreferrer" class="text-white hover:text-[#ffb000] font-medium flex items-center gap-1">
              MAPS ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([item.lat, item.lng], {
        icon: markerIcon,
        zIndexOffset: index * 10,
      }).addTo(layerGroup);

      marker.bindPopup(popupContent, {
        className: 'tripmate-dark-popup',
        offset: [0, -14],
      });

      marker.on('click', () => {
        onSelectPin?.(item.id);
      });

      markersMapRef.current.set(item.id, marker);
    });

    // Fit map bounds to waypoints
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), {
        padding: [50, 50],
        maxZoom: 14,
        animate: true,
      });
    } else if (latlngs.length === 1) {
      map.setView(latlngs[0], 13);
    }
  }, [items, onSelectPin]);

  // 3. Highlight/Open Popup when activeItemId changes externally without resetting map bounds
  useEffect(() => {
    if (!activeItemId) return;
    markersMapRef.current.forEach((marker, id) => {
      const isSelected = id === activeItemId;
      const el = marker.getElement();
      if (el) {
        const badge = el.querySelector('.tripmate-marker-badge') as HTMLElement | null;
        if (badge) {
          if (isSelected) {
            badge.classList.add('bg-amber-400', 'text-black', 'ring-4', 'ring-amber-400/50', 'shadow-amber-500/50');
            badge.classList.remove('bg-[#181b20]', 'text-white');
          } else {
            badge.classList.remove('bg-amber-400', 'text-black', 'ring-4', 'ring-amber-400/50', 'shadow-amber-500/50');
            badge.classList.add('bg-[#181b20]', 'text-white');
          }
        }
      }
      marker.setZIndexOffset(isSelected ? 1000 : 0);
      if (isSelected && mapRef.current) {
        marker.openPopup();
      }
    });
  }, [activeItemId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[460px] bg-[#0c0e11] select-none"
    />
  );
}

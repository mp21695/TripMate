'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryItem, ActivityCategory } from '@/types';
import { hasValidCoordinates, buildSinglePlaceMapUrl } from '@/lib/maps/googleMapsRoute';
import { clusterItineraryItems } from '@/lib/maps/markerSpiderfy';

interface LeafletRouteMapProps {
  items: ItineraryItem[];
  destinationName: string;
  activeItemId?: string;
  onSelectPin?: (id: string) => void;
}

export interface CategoryTheme {
  primaryColor: string;
  badgeBorder: string;
  badgeText: string;
  badgeBg: string;
  glowShadow: string;
  pipColor: string;
  pillClass: string;
  label: string;
}

/**
 * Returns consistent category-themed design attributes matching TripMate's editorial design system.
 */
export function getCategoryTheme(category?: ActivityCategory): CategoryTheme {
  switch (category) {
    case 'FOOD':
      return {
        primaryColor: '#fb923c', // Warm Orange
        badgeBorder: 'border-orange-500',
        badgeText: 'text-orange-400',
        badgeBg: 'bg-[#14161a]',
        glowShadow: 'shadow-[0_0_12px_rgba(251,146,60,0.5)]',
        pipColor: '#fb923c',
        pillClass: 'text-orange-400 bg-orange-950/30 border-orange-800/40',
        label: 'CULINARY',
      };
    case 'TRANSIT':
      return {
        primaryColor: '#38bdf8', // Sky Blue / Cyan
        badgeBorder: 'border-sky-400',
        badgeText: 'text-sky-400',
        badgeBg: 'bg-[#14161a]',
        glowShadow: 'shadow-[0_0_12px_rgba(56,189,248,0.5)]',
        pipColor: '#38bdf8',
        pillClass: 'text-sky-400 bg-sky-950/30 border-sky-800/40',
        label: 'TRANSIT',
      };
    case 'LODGING':
      return {
        primaryColor: '#c084fc', // Purple / Violet
        badgeBorder: 'border-purple-400',
        badgeText: 'text-purple-400',
        badgeBg: 'bg-[#14161a]',
        glowShadow: 'shadow-[0_0_12px_rgba(192,132,252,0.5)]',
        pipColor: '#c084fc',
        pillClass: 'text-purple-400 bg-purple-950/30 border-purple-800/40',
        label: 'HAVELI / STAY',
      };
    case 'CUSTOM':
      return {
        primaryColor: '#34d399', // Emerald / Mint
        badgeBorder: 'border-emerald-400',
        badgeText: 'text-emerald-400',
        badgeBg: 'bg-[#14161a]',
        glowShadow: 'shadow-[0_0_12px_rgba(52,211,153,0.5)]',
        pipColor: '#34d399',
        pillClass: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40',
        label: 'ACTIVITY',
      };
    case 'ATTRACTION':
    default:
      return {
        primaryColor: '#ffb000', // Amber Gold
        badgeBorder: 'border-[#ffb000]',
        badgeText: 'text-[#ffb000]',
        badgeBg: 'bg-[#14161a]',
        glowShadow: 'shadow-[0_0_12px_rgba(255,176,0,0.5)]',
        pipColor: '#ffb000',
        pillClass: 'text-[#ffb000] bg-[#ffb000]/10 border-[#ffb000]/30',
        label: 'SIGHTSEEING',
      };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_4iqv_1_af53373c7c117ed354383153';

export function LeafletRouteMap({
  items,
  destinationName,
  activeItemId,
  onSelectPin,
}: LeafletRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const spiderfyLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Render markers, anchor dots, and connector lines using spiderfy layout with category-themed pins
  const renderMarkersAndSpiderfy = useCallback(() => {
    const map = mapRef.current;
    const spiderfyLayer = spiderfyLayerGroupRef.current;
    if (!map || !spiderfyLayer) return;

    spiderfyLayer.clearLayers();
    markersMapRef.current.clear();

    const validItems = items.filter(hasValidCoordinates);
    if (validItems.length === 0) return;

    // Cluster items using pure deterministic geographic spiderfy algorithm
    const clusters = clusterItineraryItems(validItems);

    clusters.forEach((cluster) => {
      // If this cluster has multiple colliding stops, render subtle true position anchor dot
      if (cluster.items.length > 1) {
        L.circleMarker(cluster.anchorPosition, {
          radius: 3.5,
          color: '#ffb000',
          fillColor: '#14161a',
          fillOpacity: 1,
          weight: 2,
          interactive: false,
        }).addTo(spiderfyLayer);
      }

      cluster.items.forEach((spiderfied) => {
        const { item, orderIndex, truePosition, visualPosition, isOffset } = spiderfied;
        const theme = getCategoryTheme(item.category);

        // Draw subtle connector line from true position to offset visual position in category color
        if (isOffset) {
          L.polyline([truePosition, visualPosition], {
            color: theme.primaryColor,
            weight: 1.5,
            opacity: 0.75,
            dashArray: '3, 4',
            interactive: false,
          }).addTo(spiderfyLayer);
        }

        // Category-themed numbered pin badge with category border and indicator pip
        const markerIcon = L.divIcon({
          className: 'tripmate-leaflet-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-115" title="Stop #${orderIndex + 1}: ${escapeHtml(item.title)} (${theme.label})">
              <div class="tripmate-marker-badge relative w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold border-2 ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} ${theme.glowShadow} transition-all duration-200 ${
                item.coordsVerified === false
                  ? 'border-dashed ring-2 ring-amber-500/40'
                  : ''
              }"
              data-item-id="${item.id}"
              data-category="${item.category}"
              data-color="${theme.primaryColor}">
                ${orderIndex + 1}
                <span class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0c0e11] shadow-xs" style="background-color: ${theme.pipColor};"></span>
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const singleUrl = buildSinglePlaceMapUrl(item, destinationName);
        const popupContent = `
          <div class="p-3 min-w-[210px] max-w-[270px] bg-[#14161a] text-white font-sans rounded-xs shadow-2xl">
            <div class="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-white/10">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded-2xs text-[9px] font-mono border uppercase tracking-wider ${theme.pillClass}">
                ${theme.label}
              </span>
              <span class="text-[9px] font-mono text-[#8a8c8e] uppercase whitespace-nowrap">
                STOP #${orderIndex + 1} • ${escapeHtml(item.startTime)}
              </span>
            </div>
            <div class="font-serif text-sm font-semibold text-white leading-tight mt-1">${escapeHtml(
              item.title
            )}</div>
            <div class="text-[10px] text-[#8a8c8e] font-mono mt-0.5 truncate">${escapeHtml(
              item.locationName
            )}</div>
            ${
              isOffset
                ? '<div class="mt-1.5 text-[9px] font-mono text-amber-400/90 bg-amber-950/30 border border-amber-800/30 px-1.5 py-0.5 rounded-2xs flex items-center gap-1"><span>📍</span><span>Nearby stop (offset for clarity)</span></div>'
                : ''
            }
            ${
              item.coordsVerified === false
                ? '<div class="mt-1 text-[9px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/30 px-1.5 py-0.5 rounded-2xs flex items-center gap-1"><span>⚠️</span><span>Approximate location</span></div>'
                : ''
            }
            <div class="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] font-mono">
              <span class="text-[#8a8c8e]">EST ₹${item.estimatedCost.toLocaleString(
                'en-IN'
              )}</span>
              <a href="${singleUrl}" target="_blank" rel="noopener noreferrer" class="text-white hover:text-[#ffb000] font-medium flex items-center gap-1 transition-colors">
                MAPS ↗
              </a>
            </div>
          </div>
        `;

        const marker = L.marker(visualPosition, {
          icon: markerIcon,
          zIndexOffset: orderIndex * 10,
        }).addTo(spiderfyLayer);

        marker.bindPopup(popupContent, {
          className: 'tripmate-dark-popup',
          offset: [0, -14],
        });

        marker.on('click', () => {
          onSelectPin?.(item.id);
        });

        markersMapRef.current.set(item.id, marker);
      });
    });
  }, [items, destinationName, onSelectPin]);

  // 1. Initialize Leaflet Map Instance with guaranteed valid center & zoom
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [15.2993, 74.1240], // Safe initial center (Goa / India)
      zoom: 7,
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

    // CartoDB Dark Matter tile layer authenticated with CARTO API key
    const cartoTileUrl = CARTO_API_KEY
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(cartoTileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Create separate layer groups for route lines and markers/connectors
    const routesLayer = L.layerGroup().addTo(map);
    const spiderfyLayer = L.layerGroup().addTo(map);

    routesLayerGroupRef.current = routesLayer;
    spiderfyLayerGroupRef.current = spiderfyLayer;
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
      routesLayerGroupRef.current = null;
      spiderfyLayerGroupRef.current = null;
    };
  }, []);

  // 2. Update Routes (using REAL coordinates), Markers (spiderfied), and Bounds when items change
  useEffect(() => {
    const map = mapRef.current;
    const routesLayer = routesLayerGroupRef.current;
    if (!map || !routesLayer) return;

    routesLayer.clearLayers();

    const validItems = items.filter(hasValidCoordinates);
    if (validItems.length === 0) {
      spiderfyLayerGroupRef.current?.clearLayers();
      markersMapRef.current.clear();
      // Safe fallback center (Goa)
      map.setView([15.2993, 74.1240], 7);
      return;
    }

    // IMPORTANT: Draw route lines strictly using TRUE, UNTOUCHED coordinates
    const trueLatLngs: L.LatLngExpression[] = validItems.map((item) => [
      item.lat,
      item.lng,
    ]);

    // Set view or fitBounds FIRST before drawing overlays
    if (trueLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(trueLatLngs), {
        padding: [50, 50],
        maxZoom: 14,
        animate: false,
      });
    } else if (trueLatLngs.length === 1) {
      map.setView(trueLatLngs[0], 13);
    }

    if (trueLatLngs.length > 1) {
      // Outer ambient glow polyline
      L.polyline(trueLatLngs, {
        color: '#ffffff',
        weight: 6,
        opacity: 0.15,
      }).addTo(routesLayer);

      // Core amber dashed route polyline
      L.polyline(trueLatLngs, {
        color: '#ffb000',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 6',
      }).addTo(routesLayer);
    }

    // Render markers with visual spiderfy offsets and category-themed pins
    renderMarkersAndSpiderfy();
  }, [items, renderMarkersAndSpiderfy]);

  // 3. Highlight/Open Popup when activeItemId changes externally without resetting map bounds
  useEffect(() => {
    if (!activeItemId) {
      markersMapRef.current.forEach((marker) => {
        const el = marker.getElement();
        if (el) {
          const badge = el.querySelector('.tripmate-marker-badge') as HTMLElement | null;
          if (badge) {
            badge.style.transform = 'scale(1)';
            badge.style.backgroundColor = '#14161a';
            const catColor = badge.getAttribute('data-color') || '#ffb000';
            badge.style.color = catColor;
            badge.style.boxShadow = '';
            badge.classList.remove('ring-4', 'ring-white', 'z-50');
          }
        }
        marker.setZIndexOffset(0);
      });
      return;
    }

    markersMapRef.current.forEach((marker, id) => {
      const isSelected = id === activeItemId;
      const el = marker.getElement();
      if (el) {
        const badge = el.querySelector('.tripmate-marker-badge') as HTMLElement | null;
        if (badge) {
          const catColor = badge.getAttribute('data-color') || '#ffb000';
          if (isSelected) {
            badge.style.transform = 'scale(1.25)';
            badge.style.backgroundColor = catColor;
            badge.style.color = '#0c0e11';
            badge.style.boxShadow = `0 0 16px ${catColor}`;
            badge.classList.add('ring-4', 'ring-white', 'z-50');
          } else {
            badge.style.transform = 'scale(1)';
            badge.style.backgroundColor = '#14161a';
            badge.style.color = catColor;
            badge.style.boxShadow = '';
            badge.classList.remove('ring-4', 'ring-white', 'z-50');
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

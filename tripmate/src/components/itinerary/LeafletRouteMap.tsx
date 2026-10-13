'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryItem } from '@/types';
import { hasValidCoordinates, buildSinglePlaceMapUrl } from '@/lib/maps/googleMapsRoute';
import { clusterItineraryItems } from '@/lib/maps/markerSpiderfy';

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

const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_4iqv_1_af53373c7c117ed354383153';

export function LeafletRouteMap({
  items,
  activeItemId,
  onSelectPin,
}: LeafletRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const spiderfyLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Render markers, anchor dots, and connector lines using spiderfy layout
  const renderMarkersAndSpiderfy = useCallback(() => {
    const map = mapRef.current;
    const spiderfyLayer = spiderfyLayerGroupRef.current;
    if (!map || !spiderfyLayer) return;

    spiderfyLayer.clearLayers();
    markersMapRef.current.clear();

    const validItems = items.filter(hasValidCoordinates);
    if (validItems.length === 0) return;

    // Cluster items using the deterministic spiderfy algorithm
    const clusters = clusterItineraryItems(
      validItems,
      (ll) => map.latLngToLayerPoint(ll),
      (p) => {
        const ll = map.layerPointToLatLng(L.point(p.x, p.y));
        return [ll.lat, ll.lng];
      }
    );

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

        // Draw subtle connector line from true position to offset visual position
        if (isOffset) {
          L.polyline([truePosition, visualPosition], {
            color: '#ffb000',
            weight: 1.5,
            opacity: 0.65,
            dashArray: '3, 4',
            interactive: false,
          }).addTo(spiderfyLayer);
        }

        const markerIcon = L.divIcon({
          className: 'tripmate-leaflet-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110" title="Stop #${orderIndex + 1}: ${escapeHtml(item.title)}">
              <div class="tripmate-marker-badge w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shadow-2xl transition-all ${
                item.coordsVerified === false
                  ? 'bg-[#181b20] text-amber-400 border border-amber-500/70 ring-2 ring-amber-500/20'
                  : 'bg-[#181b20] text-white border border-white/40 hover:border-white hover:text-amber-300'
              }">
                ${orderIndex + 1}
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
              <span>STOP #${orderIndex + 1}</span>
              <span>${escapeHtml(item.startTime)}</span>
            </div>
            <div class="font-serif text-sm font-semibold text-white leading-tight mt-0.5">${escapeHtml(
              item.title
            )}</div>
            <div class="text-[10px] text-[#8a8c8e] font-mono mt-0.5 truncate">${escapeHtml(
              item.locationName
            )}</div>
            ${
              isOffset
                ? '<div class="mt-1 text-[9px] font-mono text-amber-400/80 bg-amber-950/30 border border-amber-800/30 px-1 py-0.5 rounded-2xs">📍 Nearby stop (offset for clarity)</div>'
                : ''
            }
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
  }, [items, onSelectPin]);

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

  // 2. Listen for zoom events to recalculate spiderfy offsets at new scale
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleZoom = () => {
      renderMarkersAndSpiderfy();
    };

    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [renderMarkersAndSpiderfy]);

  // 3. Update Routes (using REAL coordinates), Markers (spiderfied), and Bounds when items change
  useEffect(() => {
    const map = mapRef.current;
    const routesLayer = routesLayerGroupRef.current;
    if (!map || !routesLayer) return;

    routesLayer.clearLayers();

    const validItems = items.filter(hasValidCoordinates);
    if (validItems.length === 0) {
      spiderfyLayerGroupRef.current?.clearLayers();
      markersMapRef.current.clear();
      // Default viewpoint fallback (India center)
      map.setView([20.5937, 78.9629], 5);
      return;
    }

    // IMPORTANT: Draw route lines strictly using TRUE, UNTOUCHED coordinates
    const trueLatLngs: L.LatLngExpression[] = validItems.map((item) => [
      item.lat,
      item.lng,
    ]);

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

    // Render markers with visual spiderfy offsets and connector lines
    renderMarkersAndSpiderfy();

    // Fit map bounds to true waypoints
    if (trueLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(trueLatLngs), {
        padding: [50, 50],
        maxZoom: 14,
        animate: true,
      });
    } else if (trueLatLngs.length === 1) {
      map.setView(trueLatLngs[0], 13);
    }
  }, [items, renderMarkersAndSpiderfy]);

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

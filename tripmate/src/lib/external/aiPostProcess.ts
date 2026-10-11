import { TransitMode } from '@prisma/client';
import { searchPlaces } from './googlePlaces';
import { calculateTransit, haversineDistanceKm } from './mapboxTransit';

export { haversineDistanceKm };

export interface GeocodeBounds {
  center: { lat: number; lng: number };
  maxDistanceKm: number;
}

/**
 * Strips placeholders such as "(Example)", "(or similar)", "(or similar shack)"
 * and extra spaces from names.
 */
export function cleanPlaceName(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\s*\([^)]*(?:example|or similar|similar|placeholder)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Normalizes any time string to zero-padded "hh:mm AM/PM" (e.g. "09:00 AM", "01:30 PM").
 */
export function normalizeTime(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();

  // Match 12-hour format e.g. "9:00 AM", "09:00 AM", "9:00AM", "1:30 PM", "9 AM"
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = match12[2] || '00';
    const period = match12[3].toUpperCase();
    if (hour < 1) hour = 12;
    if (hour > 12) hour = ((hour - 1) % 12) + 1;
    const hourStr = hour.toString().padStart(2, '0');
    return `${hourStr}:${minute} ${period}`;
  }

  // Match 24-hour format e.g. "14:30", "09:00", "9:00", "00:15"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const rawHour = parseInt(match24[1], 10);
    const minute = match24[2];
    const period = rawHour >= 12 ? 'PM' : 'AM';
    let hour = rawHour % 12;
    if (hour === 0) hour = 12;
    const hourStr = hour.toString().padStart(2, '0');
    return `${hourStr}:${minute} ${period}`;
  }

  return trimmed;
}

/**
 * Tries to correct an item's coordinates by geocoding its locationName through
 * OSM Nominatim / places search biased to destination.
 * Checks distance sanity bounds (rejecting matches that exceed bounds.maxDistanceKm).
 * Keeps AI coordinates if geocoding finds nothing or is out of bounds, and sets coordsVerified.
 */
export async function verifyAndGeocodeItem(
  item: {
    title?: string;
    locationName: string;
    lat: number;
    lng: number;
    startTime: string;
    endTime: string;
    notes?: string;
    coordsVerified?: boolean;
    transitToNext?: any;
    [key: string]: any;
  },
  destination?: string,
  bounds?: GeocodeBounds
): Promise<void> {
  // Strip parentheticals like (Example), (or similar)
  if (item.title) item.title = cleanPlaceName(item.title);
  item.locationName = cleanPlaceName(item.locationName);
  if (item.notes) item.notes = cleanPlaceName(item.notes);

  // Normalize times
  item.startTime = normalizeTime(item.startTime);
  item.endTime = normalizeTime(item.endTime);

  const cleanLoc = item.locationName;
  const query = destination ? `${cleanLoc}, ${destination}` : cleanLoc;

  const isCandidateValid = (place: { lat: number; lng: number }): boolean => {
    if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return false;
    if (bounds) {
      const dist = haversineDistanceKm(bounds.center.lat, bounds.center.lng, place.lat, place.lng);
      if (dist > bounds.maxDistanceKm) {
        return false;
      }
    }
    return true;
  };

  try {
    const places = await searchPlaces(query);
    if (places && places.length > 0) {
      const match = places.find(isCandidateValid);
      if (match) {
        item.lat = match.lat;
        item.lng = match.lng;
        item.coordsVerified = true;
        return;
      }
    }
  } catch {
    // Fall back to cleanLoc alone
  }

  if (destination) {
    try {
      const places = await searchPlaces(cleanLoc);
      if (places && places.length > 0) {
        const match = places.find(isCandidateValid);
        if (match) {
          item.lat = match.lat;
          item.lng = match.lng;
          item.coordsVerified = true;
          return;
        }
      }
    } catch {
      // Fall back
    }
  }

  // Keep AI coordinates
  item.coordsVerified = false;
}

/**
 * When coordinates are unverified, snaps them to the nearest coordsVerified item
 * of the same day if one exists within 10 km, otherwise keeps the AI value.
 * coordsVerified remains false.
 */
export function snapUnverifiedCoordinates(
  items: Array<{
    lat: number;
    lng: number;
    coordsVerified?: boolean;
    [key: string]: any;
  }>,
  referenceVerifiedItems?: Array<{ lat: number; lng: number }>
): void {
  const verifiedList: Array<{ lat: number; lng: number }> = [
    ...items.filter((it) => it.coordsVerified === true),
    ...(referenceVerifiedItems || []),
  ];

  if (verifiedList.length === 0) return;

  for (const item of items) {
    if (!item.coordsVerified) {
      let nearest: { lat: number; lng: number } | null = null;
      let minDistance = Infinity;

      for (const verified of verifiedList) {
        const dist = haversineDistanceKm(item.lat, item.lng, verified.lat, verified.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = verified;
        }
      }

      if (nearest && minDistance <= 10) {
        item.lat = nearest.lat;
        item.lng = nearest.lng;
      }
      item.coordsVerified = false;
    }
  }
}

/**
 * Handles transit for an ordered list of day items:
 * - Removes transitToNext from the last item of each day.
 * - If MAPBOX_TOKEN is set, recomputes transit with calculateTransit helper.
 * - Otherwise drops transitToNext entirely.
 */
export async function processDayItemsTransit(
  items: Array<{
    lat: number;
    lng: number;
    transitToNext?: {
      mode: TransitMode | string;
      durationMinutes: number;
      distanceKm: number;
    } | null;
    [key: string]: any;
  }>
): Promise<void> {
  if (!items || items.length === 0) return;

  const mapboxToken = process.env.MAPBOX_TOKEN;
  const hasMapbox = Boolean(mapboxToken && mapboxToken.trim() !== '');

  if (!hasMapbox) {
    // Drop transitToNext entirely
    for (const item of items) {
      delete item.transitToNext;
    }
    return;
  }

  // If MAPBOX_TOKEN is set, recompute transit between consecutive items
  for (let i = 0; i < items.length - 1; i++) {
    const current = items[i];
    const next = items[i + 1];

    let mode: TransitMode = TransitMode.CAB;
    if (current.transitToNext && typeof current.transitToNext.mode === 'string') {
      const parsedMode = current.transitToNext.mode.toUpperCase();
      if (Object.values(TransitMode).includes(parsedMode as TransitMode)) {
        mode = parsedMode as TransitMode;
      }
    }

    current.transitToNext = await calculateTransit(
      { lat: current.lat, lng: current.lng },
      { lat: next.lat, lng: next.lng },
      mode
    );
  }

  // Remove transitToNext from the last item of the day
  delete items[items.length - 1].transitToNext;
}

import { TransitMode } from '@prisma/client';
import { searchPlaces } from './googlePlaces';
import { calculateTransit } from './mapboxTransit';

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
 * Keeps AI coordinates if geocoding finds nothing, and sets coordsVerified.
 */
export async function verifyAndGeocodeItem(
  item: {
    locationName: string;
    lat: number;
    lng: number;
    startTime: string;
    endTime: string;
    coordsVerified?: boolean;
    transitToNext?: any;
    [key: string]: any;
  },
  destination?: string
): Promise<void> {
  // Normalize times
  item.startTime = normalizeTime(item.startTime);
  item.endTime = normalizeTime(item.endTime);

  const query = destination ? `${item.locationName}, ${destination}` : item.locationName;

  try {
    const places = await searchPlaces(query);
    if (places && places.length > 0 && typeof places[0].lat === 'number' && typeof places[0].lng === 'number') {
      item.lat = places[0].lat;
      item.lng = places[0].lng;
      item.coordsVerified = true;
      return;
    }
  } catch {
    // Fall back to locationName alone
  }

  if (destination) {
    try {
      const places = await searchPlaces(item.locationName);
      if (places && places.length > 0 && typeof places[0].lat === 'number' && typeof places[0].lng === 'number') {
        item.lat = places[0].lat;
        item.lng = places[0].lng;
        item.coordsVerified = true;
        return;
      }
    } catch {
      // Fall back
    }
  }

  // Keep AI coordinates
  item.coordsVerified = false;
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

    let mode = TransitMode.CAB;
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

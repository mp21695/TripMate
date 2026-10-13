import { ItineraryItem } from '@/types';

export interface DayRouteResult {
  url: string | null;
  validStopsCount: number;
  message?: string;
}

/**
 * Validates whether an itinerary item has usable coordinates.
 */
export function hasValidCoordinates(item: ItineraryItem): boolean {
  return (
    typeof item.lat === 'number' &&
    typeof item.lng === 'number' &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lng) &&
    (item.lat !== 0 || item.lng !== 0)
  );
}

/**
 * Builds an official Google Maps Directions URL for a day's ordered itinerary stops.
 *
 * Rules:
 * - Preserves the exact itinerary order
 * - Ignores stops without valid coordinates
 * - Origin: first valid stop
 * - Destination: final valid stop
 * - Waypoints: intermediate stops (up to Google Maps limit of 9-10 web waypoints)
 * - Travel mode: driving
 * - Fully URL-encoded
 */
export function buildGoogleMapsDayRouteUrl(items: ItineraryItem[]): DayRouteResult {
  const validItems = items.filter(hasValidCoordinates);

  if (validItems.length === 0) {
    return {
      url: null,
      validStopsCount: 0,
      message: 'No stops with valid coordinates found for this day.',
    };
  }

  if (validItems.length === 1) {
    const single = validItems[0];
    const loc = `${single.lat.toFixed(6)},${single.lng.toFixed(6)}`;
    return {
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`,
      validStopsCount: 1,
      message: 'Only 1 stop scheduled. Opening destination in Google Maps.',
    };
  }

  const originItem = validItems[0];
  const destinationItem = validItems[validItems.length - 1];
  const intermediateStops = validItems.slice(1, validItems.length - 1);

  const originParam = `${originItem.lat.toFixed(6)},${originItem.lng.toFixed(6)}`;
  const destinationParam = `${destinationItem.lat.toFixed(6)},${destinationItem.lng.toFixed(6)}`;

  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    originParam
  )}&destination=${encodeURIComponent(destinationParam)}&travelmode=driving`;

  if (intermediateStops.length > 0) {
    // Google Maps universal web URL reliably supports up to 9 intermediate waypoints
    const safeWaypoints = intermediateStops.slice(0, 9);
    const waypointsParam = safeWaypoints
      .map((item) => `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`)
      .join('|');
    url += `&waypoints=${encodeURIComponent(waypointsParam)}`;
  }

  return {
    url,
    validStopsCount: validItems.length,
  };
}

/**
 * Builds a single-location Google Maps link for an individual stop.
 */
export function buildSinglePlaceMapUrl(item: ItineraryItem): string {
  if (hasValidCoordinates(item)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`
    )}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.locationName || item.title
  )}`;
}

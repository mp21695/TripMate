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
 * Checks whether an itinerary item has either valid coordinates or a usable textual location.
 */
export function hasRoutableLocation(item: ItineraryItem): boolean {
  return (
    hasValidCoordinates(item) ||
    Boolean(item.locationName && item.locationName.trim().length > 0) ||
    Boolean(item.title && item.title.trim().length > 0)
  );
}

/**
 * Formats an itinerary item into a Google Maps query parameter.
 * Prefers exact numeric coordinates when valid; otherwise falls back to locationName or title.
 */
export function formatGoogleMapsStop(item: ItineraryItem): string {
  if (hasValidCoordinates(item)) {
    return `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
  }
  const query = item.locationName?.trim() || item.title?.trim() || '';
  return encodeURIComponent(query);
}

/**
 * Builds an official Google Maps Directions URL for a day's ordered itinerary stops.
 *
 * Rules:
 * - Preserves the exact itinerary order
 * - Filters for routable stops (valid coordinates or place names)
 * - Origin: first valid stop
 * - Destination: final valid stop
 * - Waypoints: intermediate stops (up to Google Maps limit of 9 web waypoints)
 * - CRITICAL: Waypoints must be separated by literal pipe '|' characters, not '%7C',
 *   otherwise Google Maps treats the joined waypoints as a single invalid location query.
 * - Travel mode: driving
 */
export function buildGoogleMapsDayRouteUrl(items: ItineraryItem[]): DayRouteResult {
  const routableItems = items.filter(hasRoutableLocation);

  if (routableItems.length === 0) {
    return {
      url: null,
      validStopsCount: 0,
      message: 'No stops with valid coordinates or location names found for this day.',
    };
  }

  if (routableItems.length === 1) {
    const single = routableItems[0];
    const locParam = formatGoogleMapsStop(single);
    return {
      url: `https://www.google.com/maps/search/?api=1&query=${locParam}`,
      validStopsCount: 1,
      message: 'Only 1 stop scheduled. Opening destination in Google Maps.',
    };
  }

  const originItem = routableItems[0];
  const destinationItem = routableItems[routableItems.length - 1];
  const intermediateStops = routableItems.slice(1, routableItems.length - 1);

  const originParam = formatGoogleMapsStop(originItem);
  const destinationParam = formatGoogleMapsStop(destinationItem);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`;

  if (intermediateStops.length > 0) {
    // Google Maps universal web URL reliably supports up to 9 intermediate waypoints
    const safeWaypoints = intermediateStops.slice(0, 9);
    // Crucial: Waypoints must be delimited by literal '|' without encoding the pipe itself.
    const waypointsParam = safeWaypoints.map(formatGoogleMapsStop).join('|');
    url += `&waypoints=${waypointsParam}`;
  }

  return {
    url,
    validStopsCount: routableItems.length,
  };
}

/**
 * Builds a single-location Google Maps link for an individual stop.
 */
export function buildSinglePlaceMapUrl(item: ItineraryItem): string {
  if (hasValidCoordinates(item)) {
    return `https://www.google.com/maps/search/?api=1&query=${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.locationName || item.title
  )}`;
}

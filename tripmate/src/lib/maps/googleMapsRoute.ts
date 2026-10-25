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
 * Resolves a human-readable, geocodable place query for an itinerary stop.
 * Prevents Google Maps from reverse-geocoding raw coordinates into random homestays/residential buildings.
 */
export function getResolvedPlaceQuery(
  item: ItineraryItem,
  destinationContext?: string
): string {
  const title = (item.title || '').trim();
  const loc = (item.locationName || '').trim();

  let placeName = '';
  // Extract place from action title: "Late Breakfast at Artjuna Cafe" -> "Artjuna Cafe"
  const atMatch = title.match(/(?:at|in|near|to|from|through)\s+([^,]+)/i);
  if (atMatch && atMatch[1]) {
    placeName = atMatch[1].trim();
  } else {
    placeName = title;
  }

  // Strip common activity prefixes
  placeName = placeName
    .replace(
      /^(pick\s+up\s+scooters?(\s+at)?|late\s+breakfast(\s+at)?|cliffside\s+dinner(\s+at)?|sunset\s+viewpoint(\s+at)?|sunset\s+at|early\s+sunrise\s+tea(\s+at)?|photo\s+walk(\s+through)?|traditional\s+goan\s+thali(\s+at)?|4x4\s+departure\s+from|check-?in\s+at|kayak\s+&\s+secret\s+beach\s+at|visit(\s+to)?|explore)\s+/i,
      ''
    )
    .trim();

  // If locationName is a specific landmark (e.g. "Thivim Railway Station"), prefer it
  const isLandmark = /(station|airport|junction|fort|palace|temple|monastery|stupa|sanctuary|resort)/i.test(loc);
  if (isLandmark && loc) {
    placeName = loc;
  }

  let candidate = placeName || loc || title;

  // Add locality context if available and not redundant
  if (loc && !candidate.toLowerCase().includes(loc.toLowerCase())) {
    const cleanLoc = loc.split('/')[0].replace(/\([^)]*\)/g, '').trim();
    if (cleanLoc && !candidate.toLowerCase().includes(cleanLoc.toLowerCase())) {
      candidate = `${candidate}, ${cleanLoc}`;
    }
  }

  // Add regional destination context if provided (e.g. "Goa", "Jaipur", "Spiti", "Manali")
  if (destinationContext) {
    let region = destinationContext;
    if (destinationContext.includes('Goa')) region = 'Goa';
    else if (destinationContext.includes('Jaipur')) region = 'Jaipur';
    else if (destinationContext.includes('Spiti')) region = 'Spiti';
    else if (destinationContext.includes('Manali')) region = 'Manali';
    else if (destinationContext.includes('Udaipur')) region = 'Udaipur';
    else if (destinationContext.includes('Jodhpur')) region = 'Jodhpur';
    else region = destinationContext.split('&')[0].split(',')[0].trim();

    if (region && !candidate.toLowerCase().includes(region.toLowerCase())) {
      candidate = `${candidate}, ${region}`;
    }
  }

  if (!candidate && hasValidCoordinates(item)) {
    return `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
  }

  return candidate;
}

/**
 * Formats an itinerary item into a Google Maps query parameter.
 * Uses resolved place names with regional context to ensure Google Maps identifies
 * the true intended venue (attraction, restaurant, fort, station) rather than
 * reverse-geocoding coordinates to neighboring homestays.
 */
export function formatGoogleMapsStop(
  item: ItineraryItem,
  destinationContext?: string
): string {
  const query = getResolvedPlaceQuery(item, destinationContext);
  if (query) {
    return encodeURIComponent(query);
  }
  if (hasValidCoordinates(item)) {
    return `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
  }
  return '';
}

/**
 * Builds an official Google Maps Directions URL for a day's ordered itinerary stops.
 *
 * Rules:
 * - Preserves the exact itinerary order
 * - Filters for routable stops (valid place names or coordinates)
 * - Origin: first valid stop (resolved to venue/place name)
 * - Destination: final valid stop (resolved to venue/place name)
 * - Waypoints: intermediate stops (up to Google Maps limit of 9 web waypoints)
 * - Waypoints are delimited by literal pipe '|' so Google Maps parses each stop distinctly
 * - Travel mode: driving
 */
export function buildGoogleMapsDayRouteUrl(
  items: ItineraryItem[],
  destinationContext?: string
): DayRouteResult {
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
    const locParam = formatGoogleMapsStop(single, destinationContext);
    return {
      url: `https://www.google.com/maps/search/?api=1&query=${locParam}`,
      validStopsCount: 1,
      message: 'Only 1 stop scheduled. Opening destination in Google Maps.',
    };
  }

  const originItem = routableItems[0];
  const destinationItem = routableItems[routableItems.length - 1];
  const intermediateStops = routableItems.slice(1, routableItems.length - 1);

  const originParam = formatGoogleMapsStop(originItem, destinationContext);
  const destinationParam = formatGoogleMapsStop(destinationItem, destinationContext);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`;

  if (intermediateStops.length > 0) {
    // Google Maps universal web URL reliably supports up to 9 intermediate waypoints
    const safeWaypoints = intermediateStops.slice(0, 9);
    // Crucial: Waypoints must be delimited by literal '|' without encoding the pipe itself.
    const waypointsParam = safeWaypoints
      .map((item) => formatGoogleMapsStop(item, destinationContext))
      .join('|');
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
export function buildSinglePlaceMapUrl(
  item: ItineraryItem,
  destinationContext?: string
): string {
  const query = getResolvedPlaceQuery(item, destinationContext);
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  if (hasValidCoordinates(item)) {
    return `https://www.google.com/maps/search/?api=1&query=${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    item.locationName || item.title
  )}`;
}

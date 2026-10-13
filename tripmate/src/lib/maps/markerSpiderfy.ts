import { ItineraryItem } from '@/types';
import { hasValidCoordinates } from './googleMapsRoute';

export interface SpiderfiedItem {
  item: ItineraryItem;
  orderIndex: number; // 0-based index in the day's itinerary
  truePosition: [number, number]; // [lat, lng]
  visualPosition: [number, number]; // [lat, lng]
  isOffset: boolean;
  clusterSize: number;
  clusterIndex: number; // index within this collision cluster (0 to clusterSize - 1)
}

export interface CollisionCluster {
  id: string;
  anchorPosition: [number, number]; // [lat, lng]
  items: SpiderfiedItem[];
}

/**
 * Calculates geographic distance in meters between two lat/lng pairs using the Haversine formula.
 */
export function getGeoDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Threshold in meters under which two stops are considered geographically overlapping/colliding.
 * Typical city venues across the street are > 50m apart, while duplicate or same-resort
 * stops are <= 35m apart.
 */
export const COLLISION_GEO_THRESHOLD_METERS = 35;

/**
 * Checks whether two stops collide geographically.
 */
export function areItemsColliding(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): boolean {
  const geoDist = getGeoDistanceMeters(a.lat, a.lng, b.lat, b.lng);
  return geoDist <= COLLISION_GEO_THRESHOLD_METERS;
}

/**
 * Computes deterministic geographic offset (lat, lng) for a stop within a collision cluster.
 * 
 * Rules:
 * - 1 stop: no offset (stays at true position)
 * - 2 stops: offset horizontally in opposite directions (East & West)
 * - 3 stops: equilateral triangle around center (North, South-East, South-West)
 * - 4+ stops: radial circular pattern around center
 */
export function computeSpiderfyOffsetLatLng(
  anchorLat: number,
  anchorLng: number,
  clusterSize: number,
  indexInCluster: number
): [number, number] {
  if (clusterSize <= 1) {
    return [anchorLat, anchorLng];
  }

  let distanceMeters = 24;
  let angleRad = 0;

  if (clusterSize === 2) {
    // 2 stops: offset horizontally in opposite directions by 26 meters
    distanceMeters = 26;
    angleRad = indexInCluster === 0 ? Math.PI : 0; // West (180 deg) and East (0 deg)
  } else if (clusterSize === 3) {
    // 3 stops: equilateral triangle around center
    distanceMeters = 28;
    if (indexInCluster === 0) {
      angleRad = Math.PI / 2; // North (90 deg)
    } else if (indexInCluster === 1) {
      angleRad = -Math.PI / 6; // South-East (-30 deg)
    } else {
      angleRad = (-5 * Math.PI) / 6; // South-West (-150 deg)
    }
  } else {
    // 4+ stops: radial circular pattern
    distanceMeters = Math.min(42, 28 + (clusterSize - 4) * 3);
    angleRad = Math.PI / 2 - (indexInCluster * 2 * Math.PI) / clusterSize;
  }

  // Convert distance in meters to deltaLat and deltaLng in degrees
  // 1 degree latitude ~ 111,139 meters
  // 1 degree longitude ~ 111,139 * cos(lat) meters
  const latRad = (anchorLat * Math.PI) / 180;
  const metersPerDegLat = 111139;
  const metersPerDegLng = 111139 * Math.max(0.2, Math.cos(latRad));

  const deltaNorth = distanceMeters * Math.sin(angleRad);
  const deltaEast = distanceMeters * Math.cos(angleRad);

  const offsetLat = anchorLat + deltaNorth / metersPerDegLat;
  const offsetLng = anchorLng + deltaEast / metersPerDegLng;

  return [offsetLat, offsetLng];
}

/**
 * Groups valid itinerary stops into collision clusters and computes deterministic visual offsets.
 * Pure function independent of Leaflet map lifecycle or pixel origin.
 * Preserves exact itinerary ordering and original coordinates.
 */
export function clusterItineraryItems(items: ItineraryItem[]): CollisionCluster[] {
  const valid = items
    .map((item, orderIndex) => ({ item, orderIndex }))
    .filter(({ item }) => hasValidCoordinates(item));

  if (valid.length === 0) return [];

  const visited = new Set<number>();
  const clusters: CollisionCluster[] = [];

  for (let i = 0; i < valid.length; i++) {
    if (visited.has(i)) continue;

    const clusterIndices: number[] = [i];
    visited.add(i);

    // BFS to find all connected colliding items
    const queue = [i];
    while (queue.length > 0) {
      const currIdx = queue.shift()!;
      const curr = valid[currIdx];

      for (let j = 0; j < valid.length; j++) {
        if (!visited.has(j)) {
          const target = valid[j];
          if (areItemsColliding(curr.item, target.item)) {
            visited.add(j);
            clusterIndices.push(j);
            queue.push(j);
          }
        }
      }
    }

    // Sort cluster items strictly by original itinerary orderIndex (deterministic)
    clusterIndices.sort((a, b) => valid[a].orderIndex - valid[b].orderIndex);

    // Compute anchor coordinate (center of mass of the cluster)
    const anchorLat =
      clusterIndices.reduce((sum, idx) => sum + valid[idx].item.lat, 0) /
      clusterIndices.length;
    const anchorLng =
      clusterIndices.reduce((sum, idx) => sum + valid[idx].item.lng, 0) /
      clusterIndices.length;

    const clusterSize = clusterIndices.length;

    const spiderfiedItems: SpiderfiedItem[] = clusterIndices.map((idx, clusterIndex) => {
      const { item, orderIndex } = valid[idx];
      const truePos: [number, number] = [item.lat, item.lng];

      if (clusterSize === 1) {
        return {
          item,
          orderIndex,
          truePosition: truePos,
          visualPosition: truePos,
          isOffset: false,
          clusterSize: 1,
          clusterIndex: 0,
        };
      }

      // Compute deterministic geographic offset
      const visualPos = computeSpiderfyOffsetLatLng(
        anchorLat,
        anchorLng,
        clusterSize,
        clusterIndex
      );

      return {
        item,
        orderIndex,
        truePosition: truePos,
        visualPosition: visualPos,
        isOffset: true,
        clusterSize,
        clusterIndex,
      };
    });

    clusters.push({
      id: `cluster-${i}-${clusterIndices.join('-')}`,
      anchorPosition: [anchorLat, anchorLng],
      items: spiderfiedItems,
    });
  }

  return clusters;
}

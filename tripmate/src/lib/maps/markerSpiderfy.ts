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
 * Computes deterministic pixel offset for a stop within a collision cluster.
 * 
 * Rules:
 * - 1 stop: no offset (dx = 0, dy = 0)
 * - 2 stops: opposite directions (left & right)
 * - 3 stops: equilateral triangle around center (top, bottom-right, bottom-left)
 * - 4+ stops: radial / circular pattern around center
 */
export function computeSpiderfyOffsetPixels(
  clusterSize: number,
  indexInCluster: number
): { dx: number; dy: number } {
  if (clusterSize <= 1) {
    return { dx: 0, dy: 0 };
  }

  if (clusterSize === 2) {
    // 2 stops: offset horizontally in opposite directions by 32px
    const radius = 32;
    return indexInCluster === 0
      ? { dx: -radius, dy: 0 }
      : { dx: radius, dy: 0 };
  }

  if (clusterSize === 3) {
    // 3 stops: equilateral triangle around center
    // Stop 0: Top (-90 deg)
    // Stop 1: Bottom Right (30 deg)
    // Stop 2: Bottom Left (150 deg)
    const radius = 34;
    if (indexInCluster === 0) {
      return { dx: 0, dy: -radius };
    }
    if (indexInCluster === 1) {
      const angle = Math.PI / 6; // 30 deg
      return {
        dx: Math.round(radius * Math.cos(angle)),
        dy: Math.round(radius * Math.sin(angle)),
      };
    }
    return {
      dx: -Math.round(radius * Math.cos(Math.PI / 6)),
      dy: Math.round(radius * Math.sin(Math.PI / 6)),
    };
  }

  // 4+ stops: radial circular pattern
  const radius = Math.min(54, 36 + (clusterSize - 4) * 4);
  const angle = -Math.PI / 2 + (indexInCluster * 2 * Math.PI) / clusterSize;
  return {
    dx: Math.round(radius * Math.cos(angle)),
    dy: Math.round(radius * Math.sin(angle)),
  };
}

export const MAX_GEO_COLLISION_METERS = 50; // max geographic distance to consider nearby places
export const PIXEL_COLLISION_THRESHOLD = 32; // pixel overlap threshold on screen

/**
 * Determines whether two stops collide geographically or visually on the map canvas.
 */
export function areItemsColliding(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  latLngToLayerPoint: (ll: [number, number]) => { x: number; y: number }
): boolean {
  const geoDist = getGeoDistanceMeters(a.lat, a.lng, b.lat, b.lng);

  // Exact identical coordinates (distance < 1 meter) always collide
  if (geoDist < 1.0) return true;

  // Stops further than MAX_GEO_COLLISION_METERS are separate venues across town and never collide
  if (geoDist > MAX_GEO_COLLISION_METERS) return false;

  // Stops within 50m: check whether their pixel projection on screen causes visual overlap
  const pA = latLngToLayerPoint([a.lat, a.lng]);
  const pB = latLngToLayerPoint([b.lat, b.lng]);
  const pixelDist = Math.hypot(pA.x - pB.x, pA.y - pB.y);
  return pixelDist < PIXEL_COLLISION_THRESHOLD;
}

/**
 * Groups valid itinerary stops into collision clusters and computes deterministic visual offsets.
 * Preserves exact itinerary ordering and original coordinates.
 */
export function clusterItineraryItems(
  items: ItineraryItem[],
  latLngToLayerPoint: (ll: [number, number]) => { x: number; y: number },
  layerPointToLatLng: (p: { x: number; y: number }) => [number, number]
): CollisionCluster[] {
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
          if (areItemsColliding(curr.item, target.item, latLngToLayerPoint)) {
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

    const anchorPixel = latLngToLayerPoint([anchorLat, anchorLng]);
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

      // Compute visual offset in pixels
      const { dx, dy } = computeSpiderfyOffsetPixels(clusterSize, clusterIndex);
      const visualPixel = { x: anchorPixel.x + dx, y: anchorPixel.y + dy };
      const visualPos = layerPointToLatLng(visualPixel);

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

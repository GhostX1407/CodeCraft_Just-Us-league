/**
 * RAAHI — DISTANCE & HAVERSINE CALCULATION
 *
 * Deterministic geographic distance and non-linear distance factor calculation.
 * Independent of external map providers, Leaflet, or browser APIs.
 * Grounded in docs/spec.md (Sections 25, 26).
 */

import { Coordinates } from '../types';

/**
 * Mean Earth radius in kilometers as locked in spec.md.
 */
export const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes geographic distance in kilometers between two coordinates using the Haversine formula.
 * Handles edge cases such as identical points, poles, and wrap-around safely.
 *
 * @param from Origin coordinates (e.g. ambulance location)
 * @param to Destination coordinates (e.g. hospital location)
 * @returns Distance in kilometers (>= 0)
 */
export function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
  if (from.lat === to.lat && from.lng === to.lng) {
    return 0;
  }

  const lat1Rad = toRadians(from.lat);
  const lat2Rad = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  // Clamp 'a' to [0, 1] to prevent floating point inaccuracies causing NaN in Math.sqrt
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distanceKm = EARTH_RADIUS_KM * c;
  return Math.max(0, distanceKm);
}

/**
 * Calculates the non-linear distance factor according to the frozen formula in spec.md:
 *
 *   distance_factor = max(0.35, 1 / (1 + distance_km / 5))
 *
 * Properties:
 *   0 km  -> 1.00
 *   5 km  -> 0.50
 *   10 km -> 0.333 clamped to 0.35
 *
 * @param distanceKm Distance in kilometers
 * @returns Distance factor clamped between 0.35 and 1.00
 */
export function calculateDistanceFactor(distanceKm: number): number {
  const safeDistance = Math.max(0, distanceKm);
  const factor = 1 / (1 + safeDistance / 5);
  return Math.min(1.0, Math.max(0.35, factor));
}

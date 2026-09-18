import { describe, expect, it } from 'vitest';
import {
  calculateDistanceFactor,
  calculateHaversineDistance,
  EARTH_RADIUS_KM,
  toRadians,
} from '../src/matching/distance';

describe('Distance & Haversine Calculations', () => {
  it('verifies Earth radius constant is 6371 km', () => {
    expect(EARTH_RADIUS_KM).toBe(6371);
  });

  it('converts degrees to radians correctly', () => {
    expect(toRadians(0)).toBe(0);
    expect(toRadians(180)).toBeCloseTo(Math.PI);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
  });

  it('returns 0 for identical origin and destination coordinates', () => {
    const point = { lat: 21.1702, lng: 72.8311 };
    const dist = calculateHaversineDistance(point, point);
    expect(dist).toBe(0);
  });

  it('calculates accurate distance between known points', () => {
    // Surat coordinates: ~21.1702, 72.8311 to ~21.2000, 72.8500 (~3.8 km)
    const from = { lat: 21.1702, lng: 72.8311 };
    const to = { lat: 21.2000, lng: 72.8500 };
    const dist = calculateHaversineDistance(from, to);
    expect(dist).toBeGreaterThan(3.5);
    expect(dist).toBeLessThan(4.5);
  });

  it('calculates exact distance factors according to spec.md (Section 26)', () => {
    // 0 km -> 1.00
    expect(calculateDistanceFactor(0)).toBe(1.0);

    // 5 km -> 1 / (1 + 5/5) = 1 / 2 = 0.50
    expect(calculateDistanceFactor(5)).toBe(0.5);

    // 10 km -> 1 / (1 + 10/5) = 1/3 = 0.333... clamped to 0.35
    expect(calculateDistanceFactor(10)).toBe(0.35);

    // 50 km -> clamped to 0.35
    expect(calculateDistanceFactor(50)).toBe(0.35);

    // Negative distance protection
    expect(calculateDistanceFactor(-5)).toBe(1.0);
  });

  it('guarantees distance factor is always between 0.35 and 1.00', () => {
    for (let d = 0; d <= 200; d += 2.5) {
      const factor = calculateDistanceFactor(d);
      expect(factor).toBeGreaterThanOrEqual(0.35);
      expect(factor).toBeLessThanOrEqual(1.0);
    }
  });
});

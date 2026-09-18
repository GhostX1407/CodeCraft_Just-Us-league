/**
 * Matching Adapter for P1 / P2 Contract Integration
 * 
 * Provides the integration bridge between P1's deterministic matching domain
 * and P2's request orchestration layer, per docs/spec.md and team work distribution.
 * 
 * Owned by Person 2.
 */

import { Case, Hospital, CandidateScore, MatchScoreBreakdown } from './types';
import { classifyFreshness, getFreshnessFactor } from './timestampUtils';

export interface MatchingEngineInterface {
  rankCandidates(caseData: Case, hospitals: Hospital[]): CandidateScore[];
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates
 * Formula from docs/spec.md: R = 6371 km
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Computes deterministic distance factor:
 * distance_factor = max(0.35, 1 / (1 + distance_km / 5)) (docs/spec.md §9)
 */
export function calculateDistanceFactor(distanceKm: number): number {
  const factor = 1 / (1 + distanceKm / 5);
  return Math.round(Math.max(0.35, factor) * 100) / 100;
}

/**
 * Computes ER load factor:
 * score 1 -> 1.00, score 2 -> 0.88, score 3 -> 0.76, score 4 -> 0.64, score 5 -> 0.52 (docs/spec.md §9)
 */
export function calculateLoadFactor(erLoadScore: number): number {
  const loadMap: Record<number, number> = {
    1: 1.0,
    2: 0.88,
    3: 0.76,
    4: 0.64,
    5: 0.52,
  };
  return loadMap[erLoadScore] || 0.52;
}

export class DefaultMatchingEngine implements MatchingEngineInterface {
  /**
   * Deterministic matching implementation conforming to docs/spec.md §21-25
   */
  rankCandidates(caseData: Case, hospitals: Hospital[]): CandidateScore[] {
    const candidates: CandidateScore[] = [];

    const origin = caseData.ambulance_location || { lat: 21.1702, lng: 72.8311 };
    const needed = caseData.need_profile;

    for (const hospital of hospitals) {
      // 1. Hard Eligibility Filter (spec.md §21)
      let eligible = true;
      const reasons: string[] = [];

      // Check required specialists
      for (const spec of needed.specialists_needed) {
        if (!hospital.specialists_on_call.map((s) => s.toLowerCase()).includes(spec.toLowerCase())) {
          eligible = false;
          reasons.push(`Missing specialist: ${spec}`);
        }
      }

      // Check capability flags
      for (const flag of needed.capability_flags) {
        const flagLower = flag.toLowerCase();
        if (flagLower === 'trauma_team' && !hospital.trauma_team_on_shift) {
          eligible = false;
          reasons.push('Trauma team unavailable');
        }
        if (flagLower === 'icu' && hospital.icu_beds_free <= 0) {
          eligible = false;
          reasons.push('No ICU beds free');
        }
        if (flagLower === 'ventilator' && hospital.ventilators_free <= 0) {
          eligible = false;
          reasons.push('No ventilators free');
        }
      }

      // Check blood stock
      if (needed.blood_type_needed) {
        const stock = hospital.blood_stock[needed.blood_type_needed] || 0;
        if (stock <= 0) {
          eligible = false;
          reasons.push(`No ${needed.blood_type_needed} blood stock`);
        }
      }

      // 2. Compute Scoring Factors
      const distanceKm = calculateHaversineDistanceKm(
        origin.lat,
        origin.lng,
        hospital.lat,
        hospital.lng
      );
      const distanceFactor = calculateDistanceFactor(distanceKm);
      const loadFactor = calculateLoadFactor(hospital.er_load_score);
      const freshness = classifyFreshness(hospital.last_updated_at);
      const freshnessFactor = getFreshnessFactor(freshness);
      const capabilityFactor = eligible ? 1.0 : 0.0;

      // Final score formula: capability_factor * distance_factor * load_factor * freshness_factor * 100
      const finalScore = Math.round(
        capabilityFactor * distanceFactor * loadFactor * freshnessFactor * 100 * 10
      ) / 10;

      const breakdown: MatchScoreBreakdown = {
        capability_match_pct: eligible ? 100 : 0,
        distance_km: distanceKm,
        distance_factor: distanceFactor,
        load_factor: loadFactor,
        staleness_factor: freshnessFactor,
        final_score: finalScore,
      };

      const reason = eligible
        ? `${hospital.name} — Capabilities matched, ${distanceKm} km away`
        : `Ineligible: ${reasons.join(', ')}`;

      candidates.push({
        hospital,
        breakdown,
        reason,
        eligible,
      });
    }

    // Sort: eligible first, then by final_score desc, then by distance_km asc
    return candidates.sort((a, b) => {
      if (a.eligible && !b.eligible) return -1;
      if (!a.eligible && b.eligible) return 1;
      if (b.breakdown.final_score !== a.breakdown.final_score) {
        return b.breakdown.final_score - a.breakdown.final_score;
      }
      return a.breakdown.distance_km - b.breakdown.distance_km;
    });
  }
}

let activeMatchingEngine: MatchingEngineInterface = new DefaultMatchingEngine();

export class MatchingAdapter {
  static setEngine(engine: MatchingEngineInterface) {
    activeMatchingEngine = engine;
  }

  static getEngine(): MatchingEngineInterface {
    return activeMatchingEngine;
  }

  /**
   * Ranks hospitals for a case, strictly excluding already attempted hospitals
   */
  static rankEligibleCandidates(
    caseData: Case,
    hospitals: Hospital[],
    excludedHospitalIds: string[] = []
  ): CandidateScore[] {
    const excludedSet = new Set(excludedHospitalIds);
    const availablePool = hospitals.filter((h) => !excludedSet.has(h.id));

    const ranked = activeMatchingEngine.rankCandidates(caseData, availablePool);
    return ranked.filter((r) => r.eligible);
  }
}

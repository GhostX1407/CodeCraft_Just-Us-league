/**
 * Matching Adapter for P1 / P2 Contract Integration
 * 
 * Thin integration layer over P1's canonical deterministic matching engine (rankHospitalsForCase).
 * Eliminates all duplicate scoring, distance, freshness, load, capability, and ranking formulas.
 * 
 * Grounded in docs/spec.md (§21-34), docs/data-model.md, and docs/api-contract.md.
 * Owned by Person 2 within the services layer.
 */

import {
  Case,
  Hospital,
  CandidateScore,
  MatchScoreBreakdown,
  MatchResult,
  RankingOptions,
} from './types';
import { rankHospitalsForCase } from '../matching';

export class InvalidAmbulanceLocationError extends Error {
  constructor(message: string = 'Case must have a valid ambulance_location with numeric lat and lng') {
    super(message);
    this.name = 'InvalidAmbulanceLocationError';
  }
}

/**
 * Validates that the case has an explicit, valid geographical location.
 * No silent fallback to Surat or any hardcoded default coordinates is permitted.
 */
export function validateAmbulanceLocation(location?: any): asserts location is { lat: number; lng: number } {
  if (
    !location ||
    typeof location !== 'object' ||
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number' ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng)
  ) {
    throw new InvalidAmbulanceLocationError(
      'Case ambulance_location is missing or contains invalid coordinates. Exact location is required for matching.'
    );
  }
}

/**
 * Maps P1 canonical MatchResult into P2 CandidateScore format.
 * Includes backwards-compatible staleness_factor alias matching freshness_factor.
 */
export function mapMatchResultToCandidateScore(
  result: MatchResult,
  hospital: Hospital
): CandidateScore {
  const breakdown: MatchScoreBreakdown = {
    capability_match_pct: result.capability_match_pct,
    distance_km: result.distance_km,
    distance_factor: result.distance_factor,
    load_factor: result.load_factor,
    freshness_factor: result.freshness_factor,
    staleness_factor: result.freshness_factor, // backwards-compatible alias
    final_score: result.final_score,
  };

  const primaryReason =
    result.reasons && result.reasons.length > 0
      ? result.reasons[0]
      : result.eligibility.eligible
      ? `${hospital.name} — Capabilities matched, ${result.distance_km} km away`
      : result.eligibility.reason || 'Ineligible';

  return {
    hospital,
    breakdown,
    reason: primaryReason,
    eligible: result.eligibility.eligible,
    rank: result.rank,
  };
}

export interface MatchingEngineInterface {
  rankCandidates(caseData: Case, hospitals: Hospital[], options?: RankingOptions): CandidateScore[];
}

/**
 * Authoritative matching engine delegate invoking P1's canonical rankHospitalsForCase().
 */
export class CanonicalMatchingEngineDelegate implements MatchingEngineInterface {
  rankCandidates(caseData: Case, hospitals: Hospital[], options: RankingOptions = {}): CandidateScore[] {
    // 1. Enforce strict location validation (no silent fallback coordinates)
    validateAmbulanceLocation(caseData.ambulance_location);

    // 2. Delegate to P1 canonical ranking engine
    // HOLD SEMANTICS: Persisted active holds already decrement hospital *_free counters,
    // so normal live matching does NOT pass committed_holds to prevent double-counting.
    const p1Options: RankingOptions = {
      include_ineligible: options.include_ineligible ?? true,
      already_attempted_hospital_ids: options.already_attempted_hospital_ids,
      committed_holds: options.committed_holds, // Only populated for virtual simulations (e.g. MCI)
      current_time: options.current_time,
    };

    const matchResults = rankHospitalsForCase(caseData, hospitals, p1Options);

    const hospitalMap = new Map<string, Hospital>();
    hospitals.forEach((h) => hospitalMap.set(h.id, h));

    return matchResults.map((result) => {
      const hospital = hospitalMap.get(result.hospital_id) || {
        id: result.hospital_id,
        name: result.hospital_name || result.hospital_id,
        lat: 0,
        lng: 0,
        trauma_team_on_shift: false,
        specialists_on_call: [],
        icu_beds_free: 0,
        ventilators_free: 0,
        blood_stock: {},
        er_load_score: 3,
        accepts_scheme_patients: true,
        last_updated_at: new Date().toISOString(),
        reliability_score: 1.0,
      };

      return mapMatchResultToCandidateScore(result, hospital);
    });
  }
}

let activeMatchingEngine: MatchingEngineInterface = new CanonicalMatchingEngineDelegate();

export class MatchingAdapter {
  static setEngine(engine: MatchingEngineInterface) {
    activeMatchingEngine = engine;
  }

  static getEngine(): MatchingEngineInterface {
    return activeMatchingEngine;
  }

  /**
   * Ranks candidate hospitals for a case, returning all candidates (eligible & ineligible).
   */
  static rankAllCandidates(
    caseData: Case,
    hospitals: Hospital[],
    options: RankingOptions = {}
  ): CandidateScore[] {
    return activeMatchingEngine.rankCandidates(caseData, hospitals, {
      ...options,
      include_ineligible: true,
    });
  }

  /**
   * Ranks hospitals for a case, strictly excluding already attempted hospitals and filtering to eligible candidates.
   */
  static rankEligibleCandidates(
    caseData: Case,
    hospitals: Hospital[],
    excludedHospitalIds: string[] = [],
    options: RankingOptions = {}
  ): CandidateScore[] {
    const candidates = activeMatchingEngine.rankCandidates(caseData, hospitals, {
      ...options,
      already_attempted_hospital_ids: excludedHospitalIds,
      include_ineligible: false,
    });

    const excludedSet = new Set(excludedHospitalIds);
    return candidates.filter((c) => c.eligible && !excludedSet.has(c.hospital.id));
  }
}


/**
 * RAAHI — SCORING, TIE-BREAKING & CANDIDATE RANKING ENGINE
 *
 * Pure, deterministic, explainable hospital ranking pipeline.
 * Computes multi-factor scores and breaks ties using the strict 5-tier rule.
 * Grounded in docs/spec.md (Sections 29, 30, 31, 32, 33, 34).
 */

import {
  Case,
  Hospital,
  MatchResult,
  MatchScoreBreakdown,
  RankingOptions,
} from '../types';
import { calculateDistanceFactor, calculateHaversineDistance } from './distance';
import { evaluateEligibility } from './eligibility';
import {
  calculateCapabilityMatch,
  calculateLoadFactor,
  evaluateFreshness,
} from './factors';

/**
 * Computes the canonical final score from individual factor components:
 *
 *   final_score = capability_factor × distance_factor × load_factor × freshness_factor × 100
 *
 * Rounded to 2 decimal places for display, clamped between 0 and 100.
 */
export function calculateFinalScore(
  capabilityFactor: number,
  distanceFactor: number,
  loadFactor: number,
  freshnessFactor: number
): number {
  const rawScore = capabilityFactor * distanceFactor * loadFactor * freshnessFactor * 100;
  const clamped = Math.min(100, Math.max(0, rawScore));
  return Math.round(clamped * 100) / 100;
}

/**
 * Compares two candidate MatchResults deterministically when final scores are identical.
 *
 * 5-tier tie-breaking hierarchy (spec.md Section 32):
 * 1. Higher capability_match_pct
 * 2. Fresher data (lower age_minutes)
 * 3. Lower distance_km
 * 4. Lower er_load_score
 * 5. Lexicographically smaller hospital_id
 *
 * @returns negative if a ranks before b, positive if b ranks before a, 0 if identical
 */
export function compareCandidatesTieBreak(a: MatchResult, b: MatchResult, hospitalMap: Map<string, Hospital>): number {
  // Primary: Final score descending
  const scoreDiff = b.final_score - a.final_score;
  if (Math.abs(scoreDiff) >= 0.005) {
    return scoreDiff;
  }

  // Tier 1: Higher capability percentage
  const capDiff = b.capability_match_pct - a.capability_match_pct;
  if (Math.abs(capDiff) >= 0.005) {
    return capDiff;
  }

  // Tier 2: Fresher hospital data (lower age in minutes)
  const ageDiff = a.freshness.age_minutes - b.freshness.age_minutes;
  if (Math.abs(ageDiff) >= 0.05) {
    return ageDiff;
  }

  // Tier 3: Lower distance in km
  const distDiff = a.distance_km - b.distance_km;
  if (Math.abs(distDiff) >= 0.005) {
    return distDiff;
  }

  // Tier 4: Lower ER load score
  const hospA = hospitalMap.get(a.hospital_id);
  const hospB = hospitalMap.get(b.hospital_id);
  const loadA = hospA?.er_load_score || 3;
  const loadB = hospB?.er_load_score || 3;
  if (loadA !== loadB) {
    return loadA - loadB;
  }

  // Tier 5: Lexicographically smaller hospital_id
  return a.hospital_id.localeCompare(b.hospital_id);
}

/**
 * Generates human-readable, deterministic explanation bullet points for a candidate match.
 */
export function generateMatchReasons(
  hospital: Hospital,
  breakdown: MatchScoreBreakdown,
  specialistsNeeded: string[]
): string[] {
  const reasons: string[] = [];

  // Specialists availability
  if (specialistsNeeded.length > 0) {
    const present = specialistsNeeded.filter((s) =>
      (hospital.specialists_on_call || []).some((h) => h.toLowerCase() === s.toLowerCase())
    );
    if (present.length === specialistsNeeded.length) {
      reasons.push(
        present.length === 1
          ? `${present[0].charAt(0).toUpperCase() + present[0].slice(1)} on duty`
          : `All required specialists (${present.join(', ')}) on call`
      );
    }
  }

  // Distance & Travel
  if (breakdown.distance_km < 3) {
    reasons.push(`Very close proximity (${breakdown.distance_km.toFixed(1)} km)`);
  } else {
    reasons.push(`Estimated distance: ${breakdown.distance_km.toFixed(1)} km`);
  }

  // Resource & Load
  if (hospital.icu_beds_free > 0) {
    reasons.push(`${hospital.icu_beds_free} ICU bed${hospital.icu_beds_free > 1 ? 's' : ''} available`);
  }
  if (hospital.er_load_score <= 2) {
    reasons.push('Low emergency department load');
  } else if (hospital.er_load_score === 3) {
    reasons.push('Moderate emergency department load');
  }

  if (hospital.trauma_team_on_shift) {
    reasons.push('Dedicated trauma resuscitation team ready');
  }

  return reasons;
}

/**
 * Executes the full deterministic hospital ranking pipeline for a given emergency case.
 *
 * Pipeline:
 * 1. Filter out already attempted hospitals (if rerouting).
 * 2. Evaluate hard capability eligibility gate.
 * 3. Calculate Haversine distance and distance factor.
 * 4. Calculate ER load factor.
 * 5. Derive telemetry freshness classification & factor.
 * 6. Calculate capability match percentage and factor.
 * 7. Calculate composite final score.
 * 8. Apply deterministic multi-tier tie-breaking.
 * 9. Assign ranks and generate explainable reasons.
 *
 * @param emergencyCase Active emergency Case containing location and need profile
 * @param hospitals Pool of candidate hospitals
 * @param options Optional overrides (current_time, already_attempted_hospital_ids, committed_holds, include_ineligible)
 * @returns Ordered array of MatchResult objects
 */
export function rankHospitalsForCase(
  emergencyCase: Case,
  hospitals: Hospital[],
  options: RankingOptions = {}
): MatchResult[] {
  const currentTime = options.current_time || Date.now();
  const attemptedIds = options.already_attempted_hospital_ids || [];
  const holdsMap = options.committed_holds || {};
  const includeIneligible = options.include_ineligible || false;

  const hospitalMap = new Map<string, Hospital>();
  hospitals.forEach((h) => hospitalMap.set(h.id, h));

  const eligibleCandidates: MatchResult[] = [];
  const ineligibleCandidates: MatchResult[] = [];

  for (const hospital of hospitals) {
    const holds = holdsMap[hospital.id];

    // 1. Evaluate eligibility
    const eligibility = evaluateEligibility(emergencyCase.need_profile, hospital, {
      holds,
      alreadyAttemptedHospitalIds: attemptedIds,
    });

    // 2. Freshness
    const freshness = evaluateFreshness(hospital.last_updated_at, currentTime);

    // 3. Distance
    const distanceKm = calculateHaversineDistance(
      emergencyCase.ambulance_location,
      { lat: hospital.lat, lng: hospital.lng }
    );
    const distanceFactor = calculateDistanceFactor(distanceKm);

    // 4. Load
    const loadFactor = calculateLoadFactor(hospital.er_load_score);

    // 5. Capability Match
    const { capability_match_pct, capability_factor } = calculateCapabilityMatch(
      emergencyCase.need_profile,
      hospital,
      holds
    );

    // 6. Final Score
    const finalScore = eligibility.eligible
      ? calculateFinalScore(capability_factor, distanceFactor, loadFactor, freshness.factor)
      : 0;

    const breakdown: MatchScoreBreakdown = {
      capability_match_pct,
      distance_km: Math.round(distanceKm * 100) / 100,
      distance_factor: distanceFactor,
      load_factor: loadFactor,
      freshness_factor: freshness.factor,
      final_score: finalScore,
    };

    const reasons = eligibility.eligible
      ? generateMatchReasons(
          hospital,
          breakdown,
          emergencyCase.need_profile.specialists_needed || []
        )
      : [eligibility.reason || 'Ineligible'];

    const result: MatchResult = {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      rank: 0, // Assigned after sorting
      capability_match_pct,
      distance_km: breakdown.distance_km,
      distance_factor: distanceFactor,
      load_factor: loadFactor,
      freshness_factor: freshness.factor,
      final_score: finalScore,
      eligibility,
      freshness,
      reasons,
    };

    if (eligibility.eligible) {
      eligibleCandidates.push(result);
    } else {
      ineligibleCandidates.push(result);
    }
  }

  // Sort eligible candidates using deterministic tie-breaking
  eligibleCandidates.sort((a, b) => compareCandidatesTieBreak(a, b, hospitalMap));

  // Assign ranks
  eligibleCandidates.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  if (!includeIneligible) {
    return eligibleCandidates;
  }

  // If including ineligible, assign ranks sequentially after eligible
  ineligibleCandidates.forEach((candidate, index) => {
    candidate.rank = eligibleCandidates.length + index + 1;
  });

  return [...eligibleCandidates, ...ineligibleCandidates];
}

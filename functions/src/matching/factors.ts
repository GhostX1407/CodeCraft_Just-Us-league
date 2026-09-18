/**
 * RAAHI — MATCHING FACTORS & SCORING COMPONENTS
 *
 * Implements ER load factor, data freshness classification & factor,
 * and multi-criteria capability match percentage calculation.
 * Grounded in docs/spec.md (Sections 22, 23, 24, 27, 28).
 */

import {
  CommittedResourceHolds,
  FreshnessInfo,
  FreshnessStatus,
  Hospital,
  NeedProfile,
} from '../types';

// ============================================================================
// 1. ER Load Factor
// ============================================================================

/**
 * Calculates ER load factor based on the hospital's self-reported load score (1 to 5).
 * Frozen formula in spec.md:
 *   load_factor = 1.00 - 0.12 * (er_load_score - 1)
 *
 * Mapping:
 *   1 -> 1.00
 *   2 -> 0.88
 *   3 -> 0.76
 *   4 -> 0.64
 *   5 -> 0.52
 *
 * @param erLoadScore Emergency department load score (1 to 5)
 * @returns Load factor bounded between 0.52 and 1.00
 */
export function calculateLoadFactor(erLoadScore: number): number {
  const numericScore = typeof erLoadScore === 'number' && !isNaN(erLoadScore) ? erLoadScore : 3;
  const clampedScore = Math.min(5, Math.max(1, Math.round(numericScore)));
  const factor = 1.0 - 0.12 * (clampedScore - 1);
  return Math.round(factor * 1000) / 1000;
}

// ============================================================================
// 2. Freshness Classification & Factor
// ============================================================================

/**
 * Parses diverse timestamp formats (Date, ISO string, milliseconds number, or Firestore-like object)
 * into numeric epoch milliseconds.
 */
export function parseTimestampToMs(timestamp: string | number | Date | unknown): number {
  if (!timestamp) {
    return 0;
  }
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    return isNaN(parsed) ? 0 : parsed;
  }
  // Firestore Timestamp with toMillis() or seconds/nanoseconds
  if (typeof timestamp === 'object' && timestamp !== null) {
    const ts = timestamp as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof ts.toMillis === 'function') {
      return ts.toMillis();
    }
    if (typeof ts.seconds === 'number') {
      return ts.seconds * 1000;
    }
    if (typeof ts._seconds === 'number') {
      return ts._seconds * 1000;
    }
  }
  return 0;
}

/**
 * Evaluates the freshness of hospital capability telemetry according to spec.md:
 *   <= 10 min       -> 'fresh',   factor = 1.00
 *   > 10 to 30 min  -> 'stale',   factor = 0.85
 *   > 30 min        -> 'unknown', factor = 0.70
 *
 * @param lastUpdatedAt Timestamp when hospital last updated its capabilities
 * @param currentTime Current reference time (defaults to Date.now())
 * @returns FreshnessInfo with status, age in minutes, factor, and original timestamp
 */
export function evaluateFreshness(
  lastUpdatedAt: string | number | Date,
  currentTime: number | Date = Date.now()
): FreshnessInfo {
  const currentMs = typeof currentTime === 'number' ? currentTime : currentTime.getTime();
  const updatedMs = parseTimestampToMs(lastUpdatedAt);

  const ageMs = Math.max(0, currentMs - updatedMs);
  const ageMinutes = ageMs / (1000 * 60);

  let status: FreshnessStatus;
  let factor: number;

  if (updatedMs === 0 || ageMinutes > 30) {
    status = 'unknown';
    factor = 0.7;
  } else if (ageMinutes > 10) {
    status = 'stale';
    factor = 0.85;
  } else {
    status = 'fresh';
    factor = 1.0;
  }

  return {
    status,
    age_minutes: Math.round(ageMinutes * 10) / 10,
    factor,
    last_updated_at: lastUpdatedAt,
  };
}

// ============================================================================
// 3. Hospital Capability Check Helper
// ============================================================================

/**
 * Checks whether a hospital satisfies a single capability flag, checking both
 * primary structured fields (trauma team, ICU, ventilator) and explicit or inferred flags.
 */
export function checkHospitalCapabilityFlag(
  hospital: Hospital,
  flag: string,
  holds?: CommittedResourceHolds
): boolean {
  const normalizedFlag = flag.toLowerCase().trim();

  if (normalizedFlag === 'trauma_team') {
    return Boolean(hospital.trauma_team_on_shift);
  }

  if (normalizedFlag === 'icu') {
    const activeIcuHolds = holds?.icu_holds || 0;
    return (hospital.icu_beds_free || 0) > activeIcuHolds;
  }

  if (normalizedFlag === 'ventilator' || normalizedFlag === 'ventilators') {
    const activeVentHolds = holds?.ventilator_holds || 0;
    return (hospital.ventilators_free || 0) > activeVentHolds;
  }

  // Explicit capability flags registered on the hospital document
  if (Array.isArray(hospital.capabilities)) {
    const hasExplicit = hospital.capabilities.some(
      (c) => c.toLowerCase().trim() === normalizedFlag
    );
    if (hasExplicit) return true;
  }

  // Inferred specialist/domain capability associations if not explicitly provided
  const specialists = (hospital.specialists_on_call || []).map((s) => s.toLowerCase().trim());
  if (normalizedFlag === 'ecg' && specialists.includes('cardiologist')) {
    return true;
  }
  if (normalizedFlag === 'maternity' && specialists.includes('obgyn')) {
    return true;
  }
  if (normalizedFlag === 'pediatric_emergency' && specialists.includes('pediatrician')) {
    return true;
  }

  return false;
}

// ============================================================================
// 4. Capability Match Percentage
// ============================================================================

/**
 * Computes the capability-match percentage (0–100%) and capability factor (0.0–1.0)
 * using the normalized three-group weighting defined in spec.md:
 *   - Specialists group = 40%
 *   - Capability flags group = 40%
 *   - Blood group = 20%
 *
 * Empty groups are excluded from the denominator, and the remaining weights are normalized to 100%.
 *
 * @param need NeedProfile requirements for the case
 * @param hospital Target Hospital capability profile
 * @param holds Active committed holds on hospital resources
 * @returns Object with capability_match_pct (0 to 100) and capability_factor (0.0 to 1.0)
 */
export function calculateCapabilityMatch(
  need: NeedProfile,
  hospital: Hospital,
  holds?: CommittedResourceHolds
): { capability_match_pct: number; capability_factor: number } {
  const hasSpecialistsReq = (need.specialists_needed || []).length > 0;
  const hasFlagsReq = (need.capability_flags || []).length > 0;
  const hasBloodReq = Boolean(need.blood_type_needed);

  // If no requirements at all, full match by default
  if (!hasSpecialistsReq && !hasFlagsReq && !hasBloodReq) {
    return { capability_match_pct: 100, capability_factor: 1.0 };
  }

  // Raw default group weights
  const rawSpecialistWeight = hasSpecialistsReq ? 40 : 0;
  const rawFlagsWeight = hasFlagsReq ? 40 : 0;
  const rawBloodWeight = hasBloodReq ? 20 : 0;
  const totalWeight = rawSpecialistWeight + rawFlagsWeight + rawBloodWeight;

  if (totalWeight === 0) {
    return { capability_match_pct: 100, capability_factor: 1.0 };
  }

  // Normalized group weights summing to 1.0
  const normSpecialistWeight = rawSpecialistWeight / totalWeight;
  const normFlagsWeight = rawFlagsWeight / totalWeight;
  const normBloodWeight = rawBloodWeight / totalWeight;

  let totalScoreFraction = 0;

  // 1. Specialists group match fraction
  if (hasSpecialistsReq) {
    const availableSpecialists = new Set(
      (hospital.specialists_on_call || []).map((s) => s.toLowerCase().trim())
    );
    const matchedCount = need.specialists_needed.filter((s) =>
      availableSpecialists.has(s.toLowerCase().trim())
    ).length;
    const specialistFraction = matchedCount / need.specialists_needed.length;
    totalScoreFraction += specialistFraction * normSpecialistWeight;
  }

  // 2. Capability flags group match fraction
  if (hasFlagsReq) {
    const matchedFlagsCount = need.capability_flags.filter((flag) =>
      checkHospitalCapabilityFlag(hospital, flag, holds)
    ).length;
    const flagsFraction = matchedFlagsCount / need.capability_flags.length;
    totalScoreFraction += flagsFraction * normFlagsWeight;
  }

  // 3. Blood group match fraction
  if (hasBloodReq && need.blood_type_needed) {
    const bloodType = need.blood_type_needed;
    const availableBlood = hospital.blood_stock?.[bloodType] || 0;
    const bloodHold = holds?.blood_holds?.[bloodType] || 0;
    const bloodFraction = availableBlood > bloodHold ? 1.0 : 0.0;
    totalScoreFraction += bloodFraction * normBloodWeight;
  }

  const capabilityMatchPct = Math.round(totalScoreFraction * 10000) / 100;
  const capabilityFactor = Math.round(totalScoreFraction * 1000) / 1000;

  return {
    capability_match_pct: capabilityMatchPct,
    capability_factor: capabilityFactor,
  };
}

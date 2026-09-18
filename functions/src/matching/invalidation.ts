/**
 * RAAHI — COMMITMENT INVALIDATION CONDITIONS (T-P1-044)
 *
 * Defines deterministic conditions for deciding whether an ALREADY ACCEPTED hospital
 * commitment has become invalid because the hospital can no longer satisfy a critical
 * capability required by the case.
 *
 * Grounded in:
 * - docs/spec.md (Sections 21, 33, 52-54, 246)
 * - docs/tasks.md (T-P1-044, Phase 11B Mid-Transit Reroute)
 * - docs/data-model.md
 *
 * PURE FUNCTION: Independent of Firebase, Firestore, network, or UI.
 */

import {
  Case,
  CommittedResourceHolds,
  CommitmentValidationOptions,
  CommitmentValidationResult,
  Hospital,
  InvalidationReason,
  NeedProfile,
} from '../types';
import { checkHospitalCapabilityFlag } from './factors';

/**
 * Deterministically evaluates whether an accepted hospital commitment remains valid
 * given the case's required need profile, the hospital's current state, and any active holds.
 *
 * Invalidation Rules:
 * A commitment becomes invalid when the hospital can no longer satisfy a critical
 * mandatory requirement of the case:
 * 1. Required specialist is no longer on call.
 * 2. Required trauma team is no longer on shift.
 * 3. Required ICU capacity is no longer available (zero or <= active holds).
 * 4. Required ventilator capacity is no longer available (zero or <= active holds).
 * 5. Required blood stock is no longer available (zero or <= active holds).
 * 6. Other mandatory capability flags from NeedProfile are no longer satisfied.
 *
 * Non-invalidation conditions (do NOT invalidate):
 * - Ambulance distance / transit time change
 * - Hospital ER load change
 * - Data freshness / age change
 * - Reliability score change
 *
 * @param caseNeed Case document or canonical NeedProfile
 * @param hospital Current hospital profile
 * @param options Optional holds and allocation state
 * @returns CommitmentValidationResult with boolean validity flags and structured reasons
 */
export function isCommitmentStillValid(
  caseNeed: NeedProfile | Case,
  hospital: Hospital,
  options?: CommitmentValidationOptions | CommittedResourceHolds
): CommitmentValidationResult {
  const detailedReasons: InvalidationReason[] = [];

  // Extract canonical NeedProfile
  const need: NeedProfile =
    caseNeed && typeof caseNeed === 'object' && 'need_profile' in caseNeed
      ? (caseNeed as Case).need_profile
      : (caseNeed as NeedProfile);

  if (!need) {
    return {
      is_valid: true,
      is_invalid: false,
      reasons: [],
      detailed_reasons: [],
    };
  }

  // Normalize options
  let currentHolds: CommittedResourceHolds | undefined;
  let isCaseHoldAllocated = false;

  if (options) {
    if ('current_holds' in options || 'is_case_hold_allocated' in options) {
      const opts = options as CommitmentValidationOptions;
      currentHolds = opts.current_holds;
      isCaseHoldAllocated = Boolean(opts.is_case_hold_allocated);
    } else {
      currentHolds = options as CommittedResourceHolds;
    }
  }

  // 1. Check Required Specialists
  if (need.specialists_needed && need.specialists_needed.length > 0) {
    const availableSpecialists = new Set(
      (hospital.specialists_on_call || []).map((s) => s.toLowerCase().trim())
    );

    for (const requiredSpecialist of need.specialists_needed) {
      if (!requiredSpecialist) continue;
      const normalizedSpec = requiredSpecialist.toLowerCase().trim();
      if (!availableSpecialists.has(normalizedSpec)) {
        detailedReasons.push({
          type: 'missing_specialist',
          detail: `Required specialist '${requiredSpecialist}' is no longer on call`,
          required_item: requiredSpecialist,
        });
      }
    }
  }

  // 2. Check Required Capability Flags
  if (need.capability_flags && need.capability_flags.length > 0) {
    const checkedFlags = new Set<string>();

    for (const flag of need.capability_flags) {
      if (!flag) continue;
      const normFlag = flag.toLowerCase().trim();
      if (checkedFlags.has(normFlag)) continue;
      checkedFlags.add(normFlag);

      // 2a. Trauma Team
      if (normFlag === 'trauma_team') {
        if (!hospital.trauma_team_on_shift) {
          detailedReasons.push({
            type: 'trauma_team_unavailable',
            detail: 'Required trauma team is no longer on shift',
            required_item: 'trauma_team',
          });
        }
        continue;
      }

      // 2b. ICU Capacity & Operational Status
      if (normFlag === 'icu') {
        if (hospital.operational_status?.icu === false) {
          detailedReasons.push({
            type: 'icu_unavailable',
            detail: 'Required ICU facility is operationally unavailable',
            required_item: 'icu',
          });
          continue;
        }

        const icuHolds = currentHolds?.icu_holds || 0;
        const icuFree = hospital.icu_beds_free ?? 0;
        const isUnavailable = isCaseHoldAllocated ? icuFree < 0 : icuFree <= icuHolds;
        if (isUnavailable) {
          detailedReasons.push({
            type: 'icu_unavailable',
            detail: isCaseHoldAllocated
              ? `Required ICU capacity is overdrawn (${icuFree} free beds)`
              : `Required ICU capacity is no longer available (${icuFree} free, ${icuHolds} committed holds)`,
            required_item: 'icu',
          });
        }
        continue;
      }

      // 2c. Ventilator Capacity & Operational Status
      if (normFlag === 'ventilator' || normFlag === 'ventilators') {
        if (hospital.operational_status?.ventilator === false) {
          detailedReasons.push({
            type: 'ventilator_unavailable',
            detail: 'Required ventilator equipment is operationally unavailable',
            required_item: flag,
          });
          continue;
        }

        const ventHolds = currentHolds?.ventilator_holds || 0;
        const ventFree = hospital.ventilators_free ?? 0;
        const isUnavailable = isCaseHoldAllocated ? ventFree < 0 : ventFree <= ventHolds;
        if (isUnavailable) {
          detailedReasons.push({
            type: 'ventilator_unavailable',
            detail: isCaseHoldAllocated
              ? `Required ventilator capacity is overdrawn (${ventFree} free ventilators)`
              : `Required ventilator capacity is no longer available (${ventFree} free, ${ventHolds} committed holds)`,
            required_item: flag,
          });
        }
        continue;
      }

      // 2d. Other Domain Capability Flags (ecg, maternity, pediatric_emergency, etc.)
      const satisfies = checkHospitalCapabilityFlag(hospital, flag, currentHolds);
      if (!satisfies) {
        detailedReasons.push({
          type: 'missing_capability_flag',
          detail: `Required capability flag '${flag}' is no longer satisfied`,
          required_item: flag,
        });
      }
    }
  }

  // 3. Check Required Blood Stock & Operational Status
  if (need.blood_type_needed) {
    const bloodType = need.blood_type_needed;
    if (hospital.operational_status?.blood === false) {
      detailedReasons.push({
        type: 'blood_unavailable',
        detail: `Required blood bank operations are unavailable for ${bloodType}`,
        required_item: bloodType,
      });
    } else {
      const availableStock = hospital.blood_stock?.[bloodType] ?? 0;
      const bloodHolds = currentHolds?.blood_holds?.[bloodType] || 0;
      const isUnavailable = isCaseHoldAllocated ? availableStock < 0 : availableStock <= bloodHolds;
      if (isUnavailable) {
        detailedReasons.push({
          type: 'blood_unavailable',
          detail: isCaseHoldAllocated
            ? `Required blood stock for ${bloodType} is overdrawn (${availableStock} units in stock)`
            : `Required blood stock for ${bloodType} is no longer available (${availableStock} units in stock, ${bloodHolds} committed holds)`,
          required_item: bloodType,
        });
      }
    }
  }

  const isValid = detailedReasons.length === 0;

  return {
    is_valid: isValid,
    is_invalid: !isValid,
    reasons: detailedReasons.map((r) => r.detail),
    detailed_reasons: detailedReasons,
  };
}

/**
 * Convenience helper returning a simple boolean validity state.
 */
export function isCommitmentValid(
  caseNeed: NeedProfile | Case,
  hospital: Hospital,
  options?: CommitmentValidationOptions | CommittedResourceHolds
): boolean {
  return isCommitmentStillValid(caseNeed, hospital, options).is_valid;
}

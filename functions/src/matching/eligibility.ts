/**
 * RAAHI — HARD CAPABILITY ELIGIBILITY GATE
 *
 * Enforces pre-scoring hard eligibility constraints.
 * A hospital that cannot clinically or operationally satisfy mandatory requirements
 * is filtered out before ranking, preventing invalid close-proximity assignments.
 * Grounded in docs/spec.md (Sections 21, 33).
 */

import {
  CommittedResourceHolds,
  EligibilityResult,
  Hospital,
  NeedProfile,
} from '../types';
import { checkHospitalCapabilityFlag } from './factors';

/**
 * Options for evaluating eligibility.
 */
export interface EligibilityOptions {
  holds?: CommittedResourceHolds;
  alreadyAttemptedHospitalIds?: string[];
}

/**
 * Evaluates whether a hospital satisfies all non-negotiable requirements for a case.
 *
 * Checks:
 * 1. Has the hospital already been attempted for this case (reroute exclusion)?
 * 2. Are all required specialists currently on call?
 * 3. Are all required capability flags satisfied?
 * 4. Is the required blood group in stock and available?
 * 5. Are free ICU beds strictly greater than active committed holds (if ICU required)?
 * 6. Are free ventilators strictly greater than active committed holds (if ventilator required)?
 *
 * @param need Case need profile
 * @param hospital Candidate hospital profile
 * @param options Optional holds and attempted hospital list
 * @returns EligibilityResult containing eligibility flag and detailed reasons
 */
export function evaluateEligibility(
  need: NeedProfile,
  hospital: Hospital,
  options?: EligibilityOptions
): EligibilityResult {
  const missingSpecialists: string[] = [];
  const missingCapabilities: string[] = [];
  let missingBlood: string | null = null;
  const insufficientResources: string[] = [];

  // 1. Reroute attempted-hospital exclusion
  if (
    options?.alreadyAttemptedHospitalIds &&
    options.alreadyAttemptedHospitalIds.includes(hospital.id)
  ) {
    return {
      eligible: false,
      reason: `Hospital ${hospital.id} was already attempted for this case.`,
      missing_specialists: [],
      missing_capabilities: [],
      missing_blood: null,
      insufficient_resources: [],
    };
  }

  // 2. Specialists requirement check
  if (need.specialists_needed && need.specialists_needed.length > 0) {
    const availableSpecialists = new Set(
      (hospital.specialists_on_call || []).map((s) => s.toLowerCase().trim())
    );

    for (const requiredSpecialist of need.specialists_needed) {
      if (!availableSpecialists.has(requiredSpecialist.toLowerCase().trim())) {
        missingSpecialists.push(requiredSpecialist);
      }
    }
  }

  // 3. Capability flags check
  if (need.capability_flags && need.capability_flags.length > 0) {
    for (const requiredFlag of need.capability_flags) {
      const satisfies = checkHospitalCapabilityFlag(hospital, requiredFlag, options?.holds);
      if (!satisfies) {
        missingCapabilities.push(requiredFlag);
      }
    }
  }

  // 4. Resource capacity checks (ICU & Ventilators)
  const holds = options?.holds;
  const requiresIcu = (need.capability_flags || []).some((f) => f.toLowerCase().trim() === 'icu');
  if (requiresIcu) {
    const icuHolds = holds?.icu_holds || 0;
    if ((hospital.icu_beds_free || 0) <= icuHolds) {
      insufficientResources.push(`ICU beds (${hospital.icu_beds_free || 0} free, ${icuHolds} committed)`);
    }
  }

  const requiresVent = (need.capability_flags || []).some((f) => {
    const norm = f.toLowerCase().trim();
    return norm === 'ventilator' || norm === 'ventilators';
  });
  if (requiresVent) {
    const ventHolds = holds?.ventilator_holds || 0;
    if ((hospital.ventilators_free || 0) <= ventHolds) {
      insufficientResources.push(
        `Ventilators (${hospital.ventilators_free || 0} free, ${ventHolds} committed)`
      );
    }
  }

  // 5. Blood stock check
  if (need.blood_type_needed) {
    const bloodType = need.blood_type_needed;
    const availableUnits = hospital.blood_stock?.[bloodType] || 0;
    const bloodHolds = holds?.blood_holds?.[bloodType] || 0;
    if (availableUnits <= bloodHolds) {
      missingBlood = `${bloodType} blood stock unavailable (${availableUnits} units free)`;
    }
  }

  const isEligible =
    missingSpecialists.length === 0 &&
    missingCapabilities.length === 0 &&
    missingBlood === null &&
    insufficientResources.length === 0;

  if (isEligible) {
    return {
      eligible: true,
      reason: null,
    };
  }

  // Compose explanatory failure message
  const failureReasons: string[] = [];
  if (missingSpecialists.length > 0) {
    failureReasons.push(`Missing specialist(s): ${missingSpecialists.join(', ')}`);
  }
  if (missingCapabilities.length > 0) {
    failureReasons.push(`Missing capability flag(s): ${missingCapabilities.join(', ')}`);
  }
  if (missingBlood) {
    failureReasons.push(missingBlood);
  }
  if (insufficientResources.length > 0) {
    failureReasons.push(`Insufficient capacity: ${insufficientResources.join(', ')}`);
  }

  return {
    eligible: false,
    reason: failureReasons.join('; '),
    missing_specialists: missingSpecialists,
    missing_capabilities: missingCapabilities,
    missing_blood: missingBlood,
    insufficient_resources: insufficientResources,
  };
}

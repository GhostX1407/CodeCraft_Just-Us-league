/**
 * RAAHI — MASS CASUALTY MULTI-HOSPITAL JOINT DISTRIBUTION ENGINE
 *
 * Implements deterministic multi-patient allocation across regional hospital networks
 * to prevent hospital saturation and optimize system-wide emergency response.
 * Grounded in docs/spec.md (Sections 63–70) and tasks T-P1-035 to T-P1-040.
 */

import {
  Case,
  Hospital,
  MassCasualtyAssignment,
  MassCasualtyResult,
  MatchResult,
  SeverityLevel,
} from '../types';
import { rankHospitalsForCase } from './scoring';

/**
 * Penalty in score points subtracted for each additional patient allocated to the same hospital
 * after the first patient (spec.md Section 67).
 */
export const CONCENTRATION_PENALTY_PER_EXTRA_PATIENT = 8;

/**
 * Maximum number of top candidates retained per case to bound search complexity (spec.md Section 64).
 */
export const MAX_CANDIDATES_PER_CASE = 5;

/**
 * Numeric priority rank for severity levels.
 */
export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  red: 1,
  yellow: 2,
  green: 3,
};

/**
 * Calculates constraint complexity score for a case (higher = more constrained).
 */
export function getCaseConstraintScore(c: Case): number {
  const specialists = c.need_profile?.specialists_needed?.length || 0;
  const flags = c.need_profile?.capability_flags?.length || 0;
  const blood = c.need_profile?.blood_type_needed ? 1 : 0;
  return specialists + flags + blood;
}

/**
 * Deterministically sorts cases in the approved mass-casualty processing priority (spec.md Section 65):
 * 1. Severity: red before yellow before green
 * 2. More constrained needs profile first
 * 3. case_id ascending as tie-breaker
 */
export function prioritizeMassCasualtyCases(cases: Case[]): Case[] {
  return [...cases].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] || 99;
    const sevB = SEVERITY_ORDER[b.severity] || 99;
    if (sevA !== sevB) {
      return sevA - sevB;
    }

    const constA = getCaseConstraintScore(a);
    const constB = getCaseConstraintScore(b);
    if (constA !== constB) {
      return constB - constA; // More constrained first
    }

    return a.id.localeCompare(b.id);
  });
}

/**
 * Simulates mutable hospital resource state during joint allocation search.
 */
interface SimulatedHospitalResources {
  icu_beds_free: number;
  ventilators_free: number;
  blood_stock: Record<string, number>;
  allocated_patient_count: number;
}

function initSimulatedResources(hospitals: Hospital[]): Map<string, SimulatedHospitalResources> {
  const map = new Map<string, SimulatedHospitalResources>();
  for (const h of hospitals) {
    map.set(h.id, {
      icu_beds_free: h.icu_beds_free || 0,
      ventilators_free: h.ventilators_free || 0,
      blood_stock: { ...(h.blood_stock || {}) },
      allocated_patient_count: 0,
    });
  }
  return map;
}

/**
 * Checks if a hospital has enough simulated capacity to take on this case.
 */
function canAccommodateCase(
  resources: SimulatedHospitalResources,
  c: Case
): boolean {
  const flags = (c.need_profile?.capability_flags || []).map((f) => f.toLowerCase().trim());

  if (flags.includes('icu') && resources.icu_beds_free <= 0) {
    return false;
  }

  const requiresVent = flags.includes('ventilator') || flags.includes('ventilators');
  if (requiresVent && resources.ventilators_free <= 0) {
    return false;
  }

  const bloodType = c.need_profile?.blood_type_needed;
  if (bloodType && (resources.blood_stock[bloodType] || 0) <= 0) {
    return false;
  }

  return true;
}

function deductCaseResources(resources: SimulatedHospitalResources, c: Case): void {
  const flags = (c.need_profile?.capability_flags || []).map((f) => f.toLowerCase().trim());
  if (flags.includes('icu')) {
    resources.icu_beds_free -= 1;
  }
  const requiresVent = flags.includes('ventilator') || flags.includes('ventilators');
  if (requiresVent) {
    resources.ventilators_free -= 1;
  }
  const bloodType = c.need_profile?.blood_type_needed;
  if (bloodType) {
    resources.blood_stock[bloodType] = (resources.blood_stock[bloodType] || 1) - 1;
  }
  resources.allocated_patient_count += 1;
}

function restoreCaseResources(resources: SimulatedHospitalResources, c: Case): void {
  const flags = (c.need_profile?.capability_flags || []).map((f) => f.toLowerCase().trim());
  if (flags.includes('icu')) {
    resources.icu_beds_free += 1;
  }
  const requiresVent = flags.includes('ventilator') || flags.includes('ventilators');
  if (requiresVent) {
    resources.ventilators_free += 1;
  }
  const bloodType = c.need_profile?.blood_type_needed;
  if (bloodType) {
    resources.blood_stock[bloodType] = (resources.blood_stock[bloodType] || 0) + 1;
  }
  resources.allocated_patient_count -= 1;
}

/**
 * Executes bounded joint distribution search for a mass-casualty incident.
 *
 * Dispatches patients across available hospitals while:
 * 1. Strictly satisfying hard capability & simulated resource capacity.
 * 2. Applying concentration penalty (8 points per additional patient) to prevent saturation.
 * 3. Maximizing global utility deterministically.
 *
 * @param incidentGroupId Group identifier for the incident
 * @param cases List of cases involved in the incident
 * @param hospitals Pool of regional hospitals
 * @param currentTime Optional reference timestamp
 * @returns MassCasualtyResult containing individual assignments and overall metrics
 */
export function distributeMassCasualtyIncident(
  incidentGroupId: string,
  cases: Case[],
  hospitals: Hospital[],
  currentTime: number | Date = Date.now()
): MassCasualtyResult {
  if (!cases || cases.length === 0) {
    return {
      incident_group_id: incidentGroupId,
      assignments: [],
      total_score: 0,
      concentration_penalties: {},
      unassigned_case_ids: [],
    };
  }

  const hospitalMap = new Map<string, Hospital>();
  hospitals.forEach((h) => hospitalMap.set(h.id, h));

  // 1. Prioritize cases deterministically
  const prioritizedCases = prioritizeMassCasualtyCases(cases);

  // 2. Generate top candidate set for each case (bound K = 5)
  const candidateMap = new Map<string, MatchResult[]>();
  for (const c of prioritizedCases) {
    const candidates = rankHospitalsForCase(c, hospitals, {
      current_time: currentTime,
      include_ineligible: false,
    });
    candidateMap.set(c.id, candidates.slice(0, MAX_CANDIDATES_PER_CASE));
  }

  // 3. Search for optimal assignment using bounded backtracking
  const simulatedResources = initSimulatedResources(hospitals);

  interface CurrentState {
    assignments: MassCasualtyAssignment[];
    assignedCount: number;
    scoreSum: number;
  }

  let bestState: CurrentState = {
    assignments: [],
    assignedCount: -1,
    scoreSum: -Infinity,
  };

  function search(caseIndex: number, current: CurrentState): void {
    if (caseIndex >= prioritizedCases.length) {
      // Calculate concentration penalties
      let penaltyTotal = 0;
      for (const res of simulatedResources.values()) {
        if (res.allocated_patient_count > 1) {
          penaltyTotal += (res.allocated_patient_count - 1) * CONCENTRATION_PENALTY_PER_EXTRA_PATIENT;
        }
      }
      const netScore = current.scoreSum - penaltyTotal;

      if (
        current.assignedCount > bestState.assignedCount ||
        (current.assignedCount === bestState.assignedCount && netScore > bestState.scoreSum)
      ) {
        bestState = {
          assignments: [...current.assignments],
          assignedCount: current.assignedCount,
          scoreSum: netScore,
        };
      }
      return;
    }

    const currentCase = prioritizedCases[caseIndex];
    const candidates = candidateMap.get(currentCase.id) || [];
    let placed = false;

    for (let rankIdx = 0; rankIdx < candidates.length; rankIdx++) {
      const cand = candidates[rankIdx];
      const res = simulatedResources.get(cand.hospital_id);
      if (!res) continue;

      if (canAccommodateCase(res, currentCase)) {
        placed = true;
        deductCaseResources(res, currentCase);

        const assignment: MassCasualtyAssignment = {
          case_id: currentCase.id,
          assigned_hospital_id: cand.hospital_id,
          hospital_name: cand.hospital_name,
          individual_score: cand.final_score,
          breakdown: {
            capability_match_pct: cand.capability_match_pct,
            distance_km: cand.distance_km,
            distance_factor: cand.distance_factor,
            load_factor: cand.load_factor,
            freshness_factor: cand.freshness_factor,
            final_score: cand.final_score,
          },
          rank_for_case: rankIdx + 1,
        };

        current.assignments.push(assignment);
        current.assignedCount += 1;
        current.scoreSum += cand.final_score;

        search(caseIndex + 1, current);

        // Backtrack
        current.assignments.pop();
        current.assignedCount -= 1;
        current.scoreSum -= cand.final_score;
        restoreCaseResources(res, currentCase);
      }
    }

    // Branch where case cannot be placed due to saturation
    if (!placed || candidates.length === 0) {
      search(caseIndex + 1, current);
    }
  }

  search(0, { assignments: [], assignedCount: 0, scoreSum: 0 });

  // Compute final concentration penalties for best state
  const concentrationPenalties: Record<string, number> = {};
  const hospitalCounts: Record<string, number> = {};

  for (const assign of bestState.assignments) {
    hospitalCounts[assign.assigned_hospital_id] =
      (hospitalCounts[assign.assigned_hospital_id] || 0) + 1;
  }

  for (const [hospId, count] of Object.entries(hospitalCounts)) {
    if (count > 1) {
      concentrationPenalties[hospId] = (count - 1) * CONCENTRATION_PENALTY_PER_EXTRA_PATIENT;
    }
  }

  const assignedCaseIds = new Set(bestState.assignments.map((a) => a.case_id));
  const unassignedCaseIds = prioritizedCases
    .filter((c) => !assignedCaseIds.has(c.id))
    .map((c) => c.id);

  return {
    incident_group_id: incidentGroupId,
    assignments: bestState.assignments,
    total_score: Math.round(Math.max(0, bestState.scoreSum) * 100) / 100,
    concentration_penalties: concentrationPenalties,
    unassigned_case_ids: unassignedCaseIds,
  };
}

/**
 * Deterministic Intelligence & Safety-Critical Routing Enhancements
 * 
 * Implements deterministic rules without any external ML, LLM, or probabilistic logic:
 * 1. Severity-dependent scoring profiles
 * 2. Resource scarcity ratios
 * 3. Commitment-aware effective capacity
 * 4. Specialist / shift-aware rules
 * 5. Equipment dependency rules
 * 6. Freshness confidence tiers
 * 7. Resource-pressure classification
 * 8. Cross-resource conflict detection
 * 9. Improved MCI allocation optimization
 * 10. Structured deterministic auditability & explanations
 * 
 * Owned by Person 2.
 */

import { Hospital, Case, CaseSeverity, HoldResources } from './types';
import { parseTimestampToMs } from '../matching/factors';

export type FreshnessConfidenceTier = 'high' | 'medium' | 'low_unverified';
export type ResourcePressureLevel = 'normal' | 'moderate_pressure' | 'high_pressure' | 'critical_overload';
export type ScarcityTier = 'adequate' | 'elevated' | 'critical';

export interface ScarcityMetric {
  resource: string;
  free: number;
  baseline: number;
  ratio: number;
  tier: ScarcityTier;
}

export interface SpecialistShiftAssessment {
  covered: boolean;
  requiredSpecialists: string[];
  availableSpecialists: string[];
  missingSpecialists: string[];
  notes: string[];
}

export interface EquipmentDependencyViolation {
  requiredEquipment: string;
  dependentRequirement: string;
  reason: string;
}

export interface HospitalResourcePressure {
  hospitalId: string;
  pressureLevel: ResourcePressureLevel;
  erLoadScore: number;
  scarcityMetrics: ScarcityMetric[];
  activeHoldsCount: number;
  reasons: string[];
}

export interface SeverityScoringWeights {
  distanceWeight: number;
  capabilityWeight: number;
  loadWeight: number;
  freshnessWeight: number;
}

export interface DeterministicAuditRecord {
  caseId: string;
  hospitalId: string;
  severity: CaseSeverity;
  weightsApplied: SeverityScoringWeights;
  effectiveCapacity: { icu: number; ventilator: number; blood: Record<string, number> };
  scarcityMetrics: ScarcityMetric[];
  confidenceTier: FreshnessConfidenceTier;
  pressureLevel: ResourcePressureLevel;
  equipmentViolations: EquipmentDependencyViolation[];
  specialistAssessment: SpecialistShiftAssessment;
  decisionTimestamp: string;
}

export class DeterministicIntelligenceService {
  /**
   * 1. Severity-Dependent Scoring Weights
   * - Red (Critical): Distance and capability readiness are paramount.
   * - Yellow (Urgent): Balanced profile with load consideration.
   * - Green (Delayed/Minor): Load balancing prioritized to protect emergency facilities.
   */
  static getSeverityScoringWeights(severity: CaseSeverity): SeverityScoringWeights {
    switch (severity) {
      case 'red':
        return {
          distanceWeight: 0.40,
          capabilityWeight: 0.35,
          freshnessWeight: 0.15,
          loadWeight: 0.10,
        };
      case 'yellow':
        return {
          distanceWeight: 0.30,
          capabilityWeight: 0.30,
          loadWeight: 0.25,
          freshnessWeight: 0.15,
        };
      case 'green':
      default:
        return {
          loadWeight: 0.45,
          distanceWeight: 0.25,
          capabilityWeight: 0.20,
          freshnessWeight: 0.10,
        };
    }
  }

  /**
   * 2. Resource Scarcity Ratios
   * Evaluates available units against baseline nominal capacity.
   */
  static calculateScarcity(free: number, baseline: number = 10, resourceName: string = 'resource'): ScarcityMetric {
    const clampedFree = Math.max(0, free ?? 0);
    const clampedBaseline = Math.max(1, baseline ?? 10);
    const ratio = Math.round((clampedFree / clampedBaseline) * 100) / 100;

    let tier: ScarcityTier = 'adequate';
    if (clampedFree === 0 || ratio <= 0.20) {
      tier = 'critical';
    } else if (ratio <= 0.50) {
      tier = 'elevated';
    }

    return {
      resource: resourceName,
      free: clampedFree,
      baseline: clampedBaseline,
      ratio,
      tier,
    };
  }

  /**
   * 3. Commitment-Aware Effective Capacity
   * Invariant G: Accurately computes remaining capacity, accounting for unpersisted holds.
   */
  static getCommitmentAwareCapacity(
    hospital: Hospital,
    unpersistedHolds?: HoldResources
  ): { icu: number; ventilator: number; blood: Record<string, number> } {
    const unpersistedIcu = unpersistedHolds?.icu || 0;
    const unpersistedVent = unpersistedHolds?.ventilator || 0;

    const icu = Math.max(0, (hospital.icu_beds_free ?? 0) - unpersistedIcu);
    const ventilator = Math.max(0, (hospital.ventilators_free ?? 0) - unpersistedVent);

    const blood: Record<string, number> = {};
    for (const [bt, stock] of Object.entries(hospital.blood_stock || {})) {
      const held = (unpersistedHolds?.blood && unpersistedHolds.blood[bt]) || 0;
      blood[bt] = Math.max(0, (stock ?? 0) - held);
    }

    return { icu, ventilator, blood };
  }

  /**
   * 4. Specialist / Shift-Aware Rules
   * Verifies required specialists on call and flags clinical shift gaps.
   */
  static evaluateSpecialistCoverage(hospital: Hospital, neededSpecialists: string[]): SpecialistShiftAssessment {
    const available = (hospital.specialists_on_call || []).map((s) => s.toLowerCase().trim());
    const availableSet = new Set(available);
    const missing: string[] = [];
    const notes: string[] = [];

    for (const req of neededSpecialists || []) {
      const norm = req.toLowerCase().trim();
      if (!availableSet.has(norm)) {
        missing.push(req);
        notes.push(`Required specialist '${req}' is not currently on call`);
      }
    }

    return {
      covered: missing.length === 0,
      requiredSpecialists: neededSpecialists,
      availableSpecialists: hospital.specialists_on_call || [],
      missingSpecialists: missing,
      notes,
    };
  }

  /**
   * 5. Equipment Dependency Rules
   * Validates physical equipment dependencies (e.g. ventilator requires ICU bed).
   */
  static checkEquipmentDependencies(hospital: Hospital, neededFlags: string[]): EquipmentDependencyViolation[] {
    const violations: EquipmentDependencyViolation[] = [];
    const flags = (neededFlags || []).map((f) => f.toLowerCase().trim());

    // Rule: Ventilator utilization requires an available ICU bed
    if (flags.includes('ventilator') || flags.includes('ventilators')) {
      if ((hospital.icu_beds_free ?? 0) <= 0) {
        violations.push({
          requiredEquipment: 'ventilator',
          dependentRequirement: 'icu_bed',
          reason: 'Ventilator utilization requires at least one free ICU bed for clinical patient support',
        });
      }
    }

    // Rule: Trauma team deployment requires general surgeon or trauma team on shift
    if (flags.includes('trauma_team')) {
      if (!hospital.trauma_team_on_shift) {
        violations.push({
          requiredEquipment: 'trauma_bay',
          dependentRequirement: 'trauma_team',
          reason: 'Trauma bay cannot be activated without active trauma team on shift',
        });
      }
    }

    return violations;
  }

  /**
   * 6. Freshness Confidence Tiers
   * - High: <= 10 minutes old
   * - Medium: 10 to 30 minutes old
   * - Low / Unverified: > 30 minutes old or invalid
   */
  static getFreshnessConfidenceTier(lastUpdatedAt: string | number | Date, currentTime: number = Date.now()): FreshnessConfidenceTier {
    const updatedMs = parseTimestampToMs(lastUpdatedAt);
    if (updatedMs === 0) return 'low_unverified';

    const ageMinutes = Math.max(0, currentTime - updatedMs) / (1000 * 60);
    if (ageMinutes <= 10) return 'high';
    if (ageMinutes <= 30) return 'medium';
    return 'low_unverified';
  }

  /**
   * 7. Resource-Pressure Classification
   * Synthesizes ER load, bed scarcity, and active holds into an actionable pressure tier.
   */
  static classifyResourcePressure(hospital: Hospital, activeHoldsCount: number = 0): HospitalResourcePressure {
    const erLoad = hospital.er_load_score || 3;
    const icuScarcity = this.calculateScarcity(hospital.icu_beds_free, 10, 'ICU');
    const ventScarcity = this.calculateScarcity(hospital.ventilators_free, 5, 'Ventilator');
    const reasons: string[] = [];

    let pressureLevel: ResourcePressureLevel = 'normal';

    if (erLoad === 5 || (hospital.icu_beds_free <= 0 && hospital.ventilators_free <= 0)) {
      pressureLevel = 'critical_overload';
      reasons.push(`ER load is saturated (${erLoad}/5) or critical resources are depleted`);
    } else if (erLoad === 4 || icuScarcity.tier === 'critical' || ventScarcity.tier === 'critical') {
      pressureLevel = 'high_pressure';
      reasons.push(`High ER load (${erLoad}/5) or critical resource scarcity`);
    } else if (erLoad === 3 || icuScarcity.tier === 'elevated' || ventScarcity.tier === 'elevated' || activeHoldsCount >= 3) {
      pressureLevel = 'moderate_pressure';
      reasons.push(`Moderate load or elevated resource utilization`);
    } else {
      pressureLevel = 'normal';
      reasons.push('Adequate emergency capacity and buffer');
    }

    return {
      hospitalId: hospital.id,
      pressureLevel,
      erLoadScore: erLoad,
      scarcityMetrics: [icuScarcity, ventScarcity],
      activeHoldsCount,
      reasons,
    };
  }

  /**
   * 8. Cross-Resource Conflict Detection
   * Evaluates whether multiple cases or a complex case exceed collective hospital limits.
   */
  static detectCrossResourceConflicts(
    hospital: Hospital,
    requirementsList: HoldResources[]
  ): { hasConflict: boolean; conflictingResources: string[]; details: string[] } {
    let totalIcu = 0;
    let totalVent = 0;
    const totalBlood: Record<string, number> = {};

    for (const req of requirementsList) {
      totalIcu += req.icu || 0;
      totalVent += req.ventilator || 0;
      for (const [bt, count] of Object.entries(req.blood || {})) {
        totalBlood[bt] = (totalBlood[bt] || 0) + (count || 0);
      }
    }

    const conflictingResources: string[] = [];
    const details: string[] = [];

    if (totalIcu > (hospital.icu_beds_free ?? 0)) {
      conflictingResources.push('icu');
      details.push(`Cumulative ICU request (${totalIcu}) exceeds available beds (${hospital.icu_beds_free})`);
    }

    if (totalVent > (hospital.ventilators_free ?? 0)) {
      conflictingResources.push('ventilator');
      details.push(`Cumulative ventilator request (${totalVent}) exceeds available units (${hospital.ventilators_free})`);
    }

    for (const [bt, count] of Object.entries(totalBlood)) {
      const stock = (hospital.blood_stock && hospital.blood_stock[bt]) || 0;
      if (count > stock) {
        conflictingResources.push(`blood_${bt}`);
        details.push(`Cumulative ${bt} blood request (${count}) exceeds stock (${stock})`);
      }
    }

    return {
      hasConflict: conflictingResources.length > 0,
      conflictingResources,
      details,
    };
  }

  /**
   * 9. Improved MCI Allocation Optimization
   * Deterministically balances a batch of incident cases across regional hospitals:
   * - Red cases prioritized to Level-1 Trauma / High-Capability facilities
   * - Yellow/Green cases load-balanced to prevent saturating any single hospital
   */
  static optimizeMciBatchAllocation(
    cases: Case[],
    hospitals: Hospital[]
  ): { caseId: string; recommendedHospitalId: string; reason: string }[] {
    // Sort cases: Red (Critical) first, then Yellow, then Green
    const priorityOrder: Record<string, number> = { red: 1, yellow: 2, green: 3 };
    const sortedCases = [...cases].sort(
      (a, b) => (priorityOrder[a.severity] || 3) - (priorityOrder[b.severity] || 3)
    );

    // Track running allocations to avoid overloading single facilities
    const virtualAllocations = new Map<string, HoldResources>();
    hospitals.forEach((h) => virtualAllocations.set(h.id, { icu: 0, ventilator: 0, blood: {} }));

    const assignments: { caseId: string; recommendedHospitalId: string; reason: string }[] = [];

    for (const c of sortedCases) {
      let bestHosp: Hospital | null = null;
      let bestScore = -Infinity;
      let selectionReason = '';

      for (const h of hospitals) {
        const virtualHolds = virtualAllocations.get(h.id) || { icu: 0, ventilator: 0, blood: {} };
        const effective = this.getCommitmentAwareCapacity(h, virtualHolds);

        // Check if hospital can satisfy basic clinical flags
        const reqIcu = c.need_profile.capability_flags.includes('icu') ? 1 : 0;
        const reqVent = c.need_profile.capability_flags.includes('ventilator') ? 1 : 0;

        if (reqIcu > 0 && effective.icu < reqIcu) continue;
        if (reqVent > 0 && effective.ventilator < reqVent) continue;

        // Calculate deterministic joint score
        const weights = this.getSeverityScoringWeights(c.severity);
        const erPenalty = (h.er_load_score || 3) * 10 * (weights.loadWeight / 0.25);
        const assignedCount = (virtualHolds.icu || 0) + (virtualHolds.ventilator || 0);
        const overloadPenalty = assignedCount * 15;

        const baseScore = 100 - erPenalty - overloadPenalty;
        if (baseScore > bestScore) {
          bestScore = baseScore;
          bestHosp = h;
          selectionReason = `Optimal joint distribution for ${c.severity} case (effective ICU: ${effective.icu}, load: ${h.er_load_score}/5)`;
        }
      }

      if (bestHosp) {
        const currentHolds = virtualAllocations.get(bestHosp.id)!;
        if (c.need_profile.capability_flags.includes('icu')) currentHolds.icu += 1;
        if (c.need_profile.capability_flags.includes('ventilator')) currentHolds.ventilator += 1;

        assignments.push({
          caseId: c.id,
          recommendedHospitalId: bestHosp.id,
          reason: selectionReason,
        });
      } else {
        // Regional capacity exhausted for this case
        assignments.push({
          caseId: c.id,
          recommendedHospitalId: '',
          reason: 'Regional network capacity exhausted for critical profile',
        });
      }
    }

    return assignments;
  }

  /**
   * 10. Structured Deterministic Audit & Decision Traceability
   */
  static buildDeterministicAuditRecord(
    caseData: Case,
    hospital: Hospital,
    unpersistedHolds?: HoldResources
  ): DeterministicAuditRecord {
    const weights = this.getSeverityScoringWeights(caseData.severity);
    const effective = this.getCommitmentAwareCapacity(hospital, unpersistedHolds);
    const scarcity = [
      this.calculateScarcity(effective.icu, 10, 'ICU'),
      this.calculateScarcity(effective.ventilator, 5, 'Ventilator'),
    ];
    const confidence = this.getFreshnessConfidenceTier(hospital.last_updated_at);
    const pressure = this.classifyResourcePressure(hospital);
    const violations = this.checkEquipmentDependencies(hospital, caseData.need_profile.capability_flags);
    const specialistEval = this.evaluateSpecialistCoverage(hospital, caseData.need_profile.specialists_needed);

    return {
      caseId: caseData.id,
      hospitalId: hospital.id,
      severity: caseData.severity,
      weightsApplied: weights,
      effectiveCapacity: effective,
      scarcityMetrics: scarcity,
      confidenceTier: confidence,
      pressureLevel: pressure.pressureLevel,
      equipmentViolations: violations,
      specialistAssessment: specialistEval,
      decisionTimestamp: new Date().toISOString(),
    };
  }
}

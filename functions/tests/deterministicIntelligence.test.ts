import { describe, it, expect } from 'vitest';
import {
  DeterministicIntelligenceService,
  ScarcityMetric,
} from '../src/services/deterministicIntelligence';
import { Hospital, Case } from '../src/services/types';

describe('Deterministic Intelligence & Safety-Critical Engine (No Probabilistic Logic)', () => {
  const sampleHospital: Hospital = {
    id: 'hosp_test',
    name: 'Surat Central Hospital',
    lat: 21.18,
    lng: 72.82,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'anesthetist', 'general_surgeon'],
    icu_beds_free: 2,
    ventilators_free: 1,
    blood_stock: { 'O-': 4, 'A+': 8 },
    er_load_score: 3,
    accepts_scheme_patients: true,
    last_updated_at: new Date().toISOString(),
    reliability_score: 0.95,
  };

  const sampleCase: Case = {
    id: 'case_test_red',
    created_at: new Date().toISOString(),
    category: 'cardiac',
    severity: 'red',
    need_profile: {
      category: 'cardiac',
      severity: 'red',
      specialists_needed: ['cardiologist'],
      capability_flags: ['icu', 'ventilator'],
      blood_type_needed: 'O-',
    },
    vitals_summary: 'Severe chest pain',
    onset_time: '15 min ago',
    treatment_administered: 'Aspirin',
    ambulance_location: { lat: 21.17, lng: 72.81 },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  };

  describe('1. Severity-Dependent Scoring Weights', () => {
    it('applies highest distance & capability weights for Red critical cases', () => {
      const redWeights = DeterministicIntelligenceService.getSeverityScoringWeights('red');
      expect(redWeights.distanceWeight).toBe(0.40);
      expect(redWeights.capabilityWeight).toBe(0.35);
      expect(redWeights.loadWeight).toBe(0.10);
    });

    it('balances load and distance for Yellow urgent cases', () => {
      const yellowWeights = DeterministicIntelligenceService.getSeverityScoringWeights('yellow');
      expect(yellowWeights.distanceWeight).toBe(0.30);
      expect(yellowWeights.loadWeight).toBe(0.25);
    });

    it('prioritizes load balancing for Green non-urgent cases to protect emergency beds', () => {
      const greenWeights = DeterministicIntelligenceService.getSeverityScoringWeights('green');
      expect(greenWeights.loadWeight).toBe(0.45);
      expect(greenWeights.distanceWeight).toBe(0.25);
    });
  });

  describe('2. Resource Scarcity Ratios', () => {
    it('classifies 0 or <= 20% capacity as critical scarcity', () => {
      const metric0 = DeterministicIntelligenceService.calculateScarcity(0, 10, 'ICU');
      expect(metric0.ratio).toBe(0);
      expect(metric0.tier).toBe('critical');

      const metric2 = DeterministicIntelligenceService.calculateScarcity(2, 10, 'ICU');
      expect(metric2.ratio).toBe(0.2);
      expect(metric2.tier).toBe('critical');
    });

    it('classifies 21% - 50% capacity as elevated scarcity', () => {
      const metric = DeterministicIntelligenceService.calculateScarcity(4, 10, 'ICU');
      expect(metric.ratio).toBe(0.4);
      expect(metric.tier).toBe('elevated');
    });

    it('classifies > 50% capacity as adequate', () => {
      const metric = DeterministicIntelligenceService.calculateScarcity(8, 10, 'ICU');
      expect(metric.ratio).toBe(0.8);
      expect(metric.tier).toBe('adequate');
    });
  });

  describe('3. Commitment-Aware Effective Capacity', () => {
    it('accurately subtracts unpersisted holds and prevents negative numbers', () => {
      const effective = DeterministicIntelligenceService.getCommitmentAwareCapacity(sampleHospital, {
        icu: 1,
        ventilator: 1,
        blood: { 'O-': 2 },
      });

      expect(effective.icu).toBe(1); // 2 - 1 = 1
      expect(effective.ventilator).toBe(0); // 1 - 1 = 0
      expect(effective.blood['O-']).toBe(2); // 4 - 2 = 2
    });

    it('clamps negative requests safely to 0', () => {
      const effective = DeterministicIntelligenceService.getCommitmentAwareCapacity(sampleHospital, {
        icu: 10,
        ventilator: 5,
        blood: {},
      });

      expect(effective.icu).toBe(0);
      expect(effective.ventilator).toBe(0);
    });
  });

  describe('4. Specialist & Shift-Aware Rules', () => {
    it('confirms coverage when required specialists are on call', () => {
      const assessment = DeterministicIntelligenceService.evaluateSpecialistCoverage(
        sampleHospital,
        ['cardiologist', 'anesthetist']
      );
      expect(assessment.covered).toBe(true);
      expect(assessment.missingSpecialists.length).toBe(0);
    });

    it('flags missing specialists for clinical gap awareness', () => {
      const assessment = DeterministicIntelligenceService.evaluateSpecialistCoverage(
        sampleHospital,
        ['neurosurgeon', 'cardiologist']
      );
      expect(assessment.covered).toBe(false);
      expect(assessment.missingSpecialists).toContain('neurosurgeon');
      expect(assessment.notes.length).toBeGreaterThan(0);
    });
  });

  describe('5. Equipment Dependency Rules', () => {
    it('detects missing ICU bed when ventilator is required and ICU is 0', () => {
      const hospNoIcu = { ...sampleHospital, icu_beds_free: 0 };
      const violations = DeterministicIntelligenceService.checkEquipmentDependencies(hospNoIcu, ['ventilator']);
      expect(violations.length).toBe(1);
      expect(violations[0].requiredEquipment).toBe('ventilator');
      expect(violations[0].dependentRequirement).toBe('icu_bed');
    });

    it('passes when equipment dependencies are met', () => {
      const violations = DeterministicIntelligenceService.checkEquipmentDependencies(sampleHospital, ['ventilator']);
      expect(violations.length).toBe(0);
    });
  });

  describe('6. Freshness Confidence Tiers', () => {
    it('categorizes freshness into high, medium, and low_unverified tiers', () => {
      const now = Date.now();
      expect(DeterministicIntelligenceService.getFreshnessConfidenceTier(now - 3 * 60 * 1000, now)).toBe('high');
      expect(DeterministicIntelligenceService.getFreshnessConfidenceTier(now - 15 * 60 * 1000, now)).toBe('medium');
      expect(DeterministicIntelligenceService.getFreshnessConfidenceTier(now - 45 * 60 * 1000, now)).toBe('low_unverified');
      expect(DeterministicIntelligenceService.getFreshnessConfidenceTier('', now)).toBe('low_unverified');
    });
  });

  describe('7. Resource-Pressure Classification', () => {
    it('classifies ER load 5 or zero critical resources as critical overload', () => {
      const hospOverload = { ...sampleHospital, er_load_score: 5 };
      const pressure = DeterministicIntelligenceService.classifyResourcePressure(hospOverload);
      expect(pressure.pressureLevel).toBe('critical_overload');
    });

    it('classifies ER load 4 or critical scarcity as high pressure', () => {
      const hospHigh = { ...sampleHospital, er_load_score: 4 };
      const pressure = DeterministicIntelligenceService.classifyResourcePressure(hospHigh);
      expect(pressure.pressureLevel).toBe('high_pressure');
    });
  });

  describe('8. Cross-Resource Conflict Detection', () => {
    it('detects cumulative conflicts when multiple requests exceed capacity', () => {
      const conflict = DeterministicIntelligenceService.detectCrossResourceConflicts(sampleHospital, [
        { icu: 1, ventilator: 1, blood: { 'O-': 2 } },
        { icu: 1, ventilator: 1, blood: { 'O-': 2 } },
        { icu: 1, ventilator: 0, blood: { 'O-': 1 } }, // 3 ICU > 2 available!
      ]);

      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictingResources).toContain('icu');
      expect(conflict.conflictingResources).toContain('ventilator'); // 2 vent > 1 available!
      expect(conflict.conflictingResources).toContain('blood_O-'); // 5 blood > 4 available!
    });
  });

  describe('9. Improved MCI Allocation Optimization', () => {
    it('distributes batch cases according to severity without overloading one hospital', () => {
      const hospA: Hospital = {
        ...sampleHospital,
        id: 'hosp_A',
        name: 'Apex Trauma',
        icu_beds_free: 3,
        ventilators_free: 2,
        er_load_score: 1,
      };

      const hospB: Hospital = {
        ...sampleHospital,
        id: 'hosp_B',
        name: 'CityCare General',
        icu_beds_free: 4,
        ventilators_free: 3,
        er_load_score: 2,
      };

      const mciCases: Case[] = [
        { ...sampleCase, id: 'c1_red', severity: 'red' },
        { ...sampleCase, id: 'c2_red', severity: 'red' },
        { ...sampleCase, id: 'c3_yellow', severity: 'yellow' },
        { ...sampleCase, id: 'c4_yellow', severity: 'yellow' },
      ];

      const assignments = DeterministicIntelligenceService.optimizeMciBatchAllocation(mciCases, [hospA, hospB]);
      expect(assignments.length).toBe(4);

      // Verify that all cases got an assigned hospital
      assignments.forEach((a) => {
        expect(a.recommendedHospitalId).not.toBe('');
        expect(a.reason).toBeDefined();
      });

      // Verify both hospitals were utilized (not all 4 dump on hospA)
      const hospitalsUsed = new Set(assignments.map((a) => a.recommendedHospitalId));
      expect(hospitalsUsed.size).toBe(2);
    });
  });

  describe('10. Structured Deterministic Audit Records', () => {
    it('generates fully auditable decision record without external AI', () => {
      const audit = DeterministicIntelligenceService.buildDeterministicAuditRecord(sampleCase, sampleHospital);

      expect(audit.caseId).toBe('case_test_red');
      expect(audit.hospitalId).toBe('hosp_test');
      expect(audit.severity).toBe('red');
      expect(audit.weightsApplied.distanceWeight).toBe(0.40);
      expect(audit.effectiveCapacity.icu).toBe(2);
      expect(audit.scarcityMetrics.length).toBe(2);
      expect(audit.confidenceTier).toBe('high');
      expect(audit.decisionTimestamp).toBeDefined();
    });
  });
});

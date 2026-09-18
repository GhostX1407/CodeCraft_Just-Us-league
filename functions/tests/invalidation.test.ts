import { describe, expect, it } from 'vitest';
import { isCommitmentStillValid, isCommitmentValid } from '../src/matching/invalidation';
import { Case, Hospital, NeedProfile } from '../src/types';

describe('Mid-Transit Commitment Invalidation (T-P1-044)', () => {
  const baseHospital: Hospital = {
    id: 'hosp_central',
    name: 'Central Multi-Specialty Hospital',
    lat: 21.1702,
    lng: 72.8311,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'general_surgeon', 'anesthetist'],
    icu_beds_free: 4,
    ventilators_free: 2,
    blood_stock: { 'O-': 5, 'A+': 8 },
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: Date.now(),
    reliability_score: 0.95,
    capabilities: ['ecg', 'cath_lab', 'ct_scan'],
  };

  const cardiacNeed: NeedProfile = {
    specialists_needed: ['cardiologist'],
    capability_flags: ['ecg', 'icu'],
    blood_type_needed: 'O-',
  };

  const traumaNeed: NeedProfile = {
    specialists_needed: ['general_surgeon'],
    capability_flags: ['trauma_team', 'icu', 'ventilator'],
    blood_type_needed: 'A+',
  };

  // ==========================================================================
  // VALID CASES
  // ==========================================================================
  describe('VALID CASES', () => {
    it('remains valid when all required capabilities continue to be satisfied', () => {
      const result = isCommitmentStillValid(cardiacNeed, baseHospital);

      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
      expect(result.reasons).toHaveLength(0);
      expect(result.detailed_reasons).toHaveLength(0);
      expect(isCommitmentValid(cardiacNeed, baseHospital)).toBe(true);
    });

    it('remains valid when evaluated directly from a Case object', () => {
      const testCase: Case = {
        id: 'case_cardiac_01',
        category: 'cardiac',
        severity: 'red',
        need_profile: cardiacNeed,
        ambulance_location: { lat: 21.18, lng: 72.84 },
      };

      const result = isCommitmentStillValid(testCase, baseHospital);
      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
    });

    it('remains valid when required specialist remains available', () => {
      const result = isCommitmentStillValid(
        {
          specialists_needed: ['cardiologist'],
          capability_flags: [],
          blood_type_needed: null,
        },
        baseHospital
      );
      expect(result.is_valid).toBe(true);
    });

    it('remains valid when ICU remains available with capacity', () => {
      const result = isCommitmentStillValid(
        {
          specialists_needed: [],
          capability_flags: ['icu'],
          blood_type_needed: null,
        },
        baseHospital
      );
      expect(result.is_valid).toBe(true);
    });

    it('remains valid when trauma team remains available on shift', () => {
      const result = isCommitmentStillValid(
        {
          specialists_needed: [],
          capability_flags: ['trauma_team'],
          blood_type_needed: null,
        },
        baseHospital
      );
      expect(result.is_valid).toBe(true);
    });

    it('remains valid when required blood stock remains available', () => {
      const result = isCommitmentStillValid(
        {
          specialists_needed: [],
          capability_flags: [],
          blood_type_needed: 'O-',
        },
        baseHospital
      );
      expect(result.is_valid).toBe(true);
    });

    it('remains valid when holds exist but hospital capacity strictly exceeds holds', () => {
      const result = isCommitmentStillValid(cardiacNeed, baseHospital, {
        current_holds: {
          icu_holds: 2, // hospital has 4 icu beds free -> 4 > 2 -> valid
          blood_holds: { 'O-': 2 }, // hospital has 5 O- units -> 5 > 2 -> valid
        },
      });
      expect(result.is_valid).toBe(true);
    });
  });

  // ==========================================================================
  // INVALID CASES
  // ==========================================================================
  describe('INVALID CASES', () => {
    it('invalidates when a required specialist is removed / no longer on call', () => {
      const updatedHospital: Hospital = {
        ...baseHospital,
        specialists_on_call: ['general_surgeon'], // cardiologist went off shift
      };

      const result = isCommitmentStillValid(cardiacNeed, updatedHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      expect(result.detailed_reasons).toHaveLength(1);
      expect(result.detailed_reasons[0].type).toBe('missing_specialist');
      expect(result.detailed_reasons[0].required_item).toBe('cardiologist');
      expect(result.reasons[0]).toContain("specialist 'cardiologist' is no longer on call");
      expect(isCommitmentValid(cardiacNeed, updatedHospital)).toBe(false);
    });

    it('invalidates when trauma team becomes unavailable', () => {
      const updatedHospital: Hospital = {
        ...baseHospital,
        trauma_team_on_shift: false,
      };

      const result = isCommitmentStillValid(traumaNeed, updatedHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      const traumaReason = result.detailed_reasons.find(
        (r) => r.type === 'trauma_team_unavailable'
      );
      expect(traumaReason).toBeDefined();
      expect(traumaReason?.required_item).toBe('trauma_team');
      expect(traumaReason?.detail).toContain('trauma team is no longer on shift');
    });

    it('invalidates when ICU capacity becomes unavailable (drops to 0)', () => {
      const updatedHospital: Hospital = {
        ...baseHospital,
        icu_beds_free: 0,
      };

      const result = isCommitmentStillValid(cardiacNeed, updatedHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      const icuReason = result.detailed_reasons.find((r) => r.type === 'icu_unavailable');
      expect(icuReason).toBeDefined();
      expect(icuReason?.required_item).toBe('icu');
      expect(icuReason?.detail).toContain('ICU capacity is no longer available');
    });

    it('invalidates when ventilator capacity becomes unavailable', () => {
      const updatedHospital: Hospital = {
        ...baseHospital,
        ventilators_free: 0,
      };

      const result = isCommitmentStillValid(traumaNeed, updatedHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      const ventReason = result.detailed_reasons.find((r) => r.type === 'ventilator_unavailable');
      expect(ventReason).toBeDefined();
      expect(ventReason?.detail).toContain('ventilator capacity is no longer available');
    });

    it('invalidates when required blood stock reaches zero', () => {
      const updatedHospital: Hospital = {
        ...baseHospital,
        blood_stock: { 'O-': 0, 'A+': 5 },
      };

      const result = isCommitmentStillValid(cardiacNeed, updatedHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      const bloodReason = result.detailed_reasons.find((r) => r.type === 'blood_unavailable');
      expect(bloodReason).toBeDefined();
      expect(bloodReason?.required_item).toBe('O-');
      expect(bloodReason?.detail).toContain('blood stock for O- is no longer available');
    });

    it('invalidates when required capability flag disappears', () => {
      const cathNeed: NeedProfile = {
        specialists_needed: ['cardiologist'],
        capability_flags: ['cath_lab'],
        blood_type_needed: null,
      };

      const updatedHospital: Hospital = {
        ...baseHospital,
        capabilities: ['ecg'], // cath_lab removed / equipment down
      };

      const result = isCommitmentStillValid(cathNeed, updatedHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      const flagReason = result.detailed_reasons.find(
        (r) => r.type === 'missing_capability_flag'
      );
      expect(flagReason).toBeDefined();
      expect(flagReason?.required_item).toBe('cath_lab');
      expect(flagReason?.detail).toContain("capability flag 'cath_lab' is no longer satisfied");
    });

    it('invalidates and captures all reasons when multiple capabilities become unavailable', () => {
      const catastrophicFailureHospital: Hospital = {
        ...baseHospital,
        trauma_team_on_shift: false,
        specialists_on_call: [], // all specialists gone
        icu_beds_free: 0,
        ventilators_free: 0,
        blood_stock: { 'A+': 0 },
      };

      const result = isCommitmentStillValid(traumaNeed, catastrophicFailureHospital);
      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);

      const types = result.detailed_reasons.map((r) => r.type);
      expect(types).toContain('missing_specialist');
      expect(types).toContain('trauma_team_unavailable');
      expect(types).toContain('icu_unavailable');
      expect(types).toContain('ventilator_unavailable');
      expect(types).toContain('blood_unavailable');
      expect(result.reasons.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ==========================================================================
  // EDGE CASES & CRITICAL NON-INVALIDATION CONDITIONS
  // ==========================================================================
  describe('EDGE CASES', () => {
    it('handles empty need profile without invalidating', () => {
      const emptyNeed: NeedProfile = {
        specialists_needed: [],
        capability_flags: [],
        blood_type_needed: null,
      };

      const strippedHospital: Hospital = {
        ...baseHospital,
        specialists_on_call: [],
        icu_beds_free: 0,
        ventilators_free: 0,
        trauma_team_on_shift: false,
        blood_stock: {},
      };

      const result = isCommitmentStillValid(emptyNeed, strippedHospital);
      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
      expect(result.detailed_reasons).toHaveLength(0);
    });

    it('does NOT invalidate solely because distance or ambulance location changed', () => {
      // Ambulance moved further away / traffic detour
      const testCase: Case = {
        id: 'case_cardiac_01',
        category: 'cardiac',
        severity: 'red',
        need_profile: cardiacNeed,
        ambulance_location: { lat: 28.6139, lng: 77.209 }, // shifted far away
      };

      const result = isCommitmentStillValid(testCase, baseHospital);
      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
    });

    it('does NOT invalidate solely because ER load increased', () => {
      const busyHospital: Hospital = {
        ...baseHospital,
        er_load_score: 5, // jumped from 2 to 5 (divert/critical load)
      };

      const result = isCommitmentStillValid(cardiacNeed, busyHospital);
      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
    });

    it('does NOT invalidate solely because hospital freshness or last_updated_at changed', () => {
      const staleHospital: Hospital = {
        ...baseHospital,
        last_updated_at: Date.now() - 3 * 3600 * 1000, // 3 hours ago (stale)
      };

      const result = isCommitmentStillValid(cardiacNeed, staleHospital);
      expect(result.is_valid).toBe(true);
    });

    it('does NOT invalidate solely because hospital reliability score changed', () => {
      const degradedHospital: Hospital = {
        ...baseHospital,
        reliability_score: 0.2, // lowered reliability score
      };

      const result = isCommitmentStillValid(cardiacNeed, degradedHospital);
      expect(result.is_valid).toBe(true);
    });

    it('does NOT invalidate when hospital loses an unrequested capability', () => {
      const hospitalLostUnrelated: Hospital = {
        ...baseHospital,
        specialists_on_call: ['cardiologist'], // lost anesthetist and general_surgeon
        blood_stock: { 'O-': 5, 'B-': 0 }, // lost B-, but case needs O-
      };

      const result = isCommitmentStillValid(cardiacNeed, hospitalLostUnrelated);
      expect(result.is_valid).toBe(true);
    });

    it('respects exact boundary at zero resource capacity', () => {
      const needIcuOnly: NeedProfile = {
        specialists_needed: [],
        capability_flags: ['icu'],
        blood_type_needed: null,
      };

      // 1 bed free -> VALID
      const hosp1Bed: Hospital = { ...baseHospital, icu_beds_free: 1 };
      expect(isCommitmentStillValid(needIcuOnly, hosp1Bed).is_valid).toBe(true);

      // 0 beds free -> INVALID
      const hosp0Bed: Hospital = { ...baseHospital, icu_beds_free: 0 };
      expect(isCommitmentStillValid(needIcuOnly, hosp0Bed).is_valid).toBe(false);

      // -1 beds free (negative) -> INVALID
      const hospNegBed: Hospital = { ...baseHospital, icu_beds_free: -1 };
      expect(isCommitmentStillValid(needIcuOnly, hospNegBed).is_valid).toBe(false);
    });

    it('evaluates exact resource hold boundaries correctly', () => {
      const needIcuOnly: NeedProfile = {
        specialists_needed: [],
        capability_flags: ['icu'],
        blood_type_needed: null,
      };

      // icu_beds_free: 2, icu_holds: 2 -> free beds <= holds -> INVALID (exhausted)
      const hosp2Beds: Hospital = { ...baseHospital, icu_beds_free: 2 };
      const invalidResult = isCommitmentStillValid(needIcuOnly, hosp2Beds, {
        current_holds: { icu_holds: 2 },
      });
      expect(invalidResult.is_valid).toBe(false);

      // icu_beds_free: 3, icu_holds: 2 -> free beds > holds -> VALID
      const hosp3Beds: Hospital = { ...baseHospital, icu_beds_free: 3 };
      const validResult = isCommitmentStillValid(needIcuOnly, hosp3Beds, {
        current_holds: { icu_holds: 2 },
      });
      expect(validResult.is_valid).toBe(true);
    });

    it('supports is_case_hold_allocated option when case hold is already allocated in hospital state', () => {
      const needIcuOnly: NeedProfile = {
        specialists_needed: [],
        capability_flags: ['icu'],
        blood_type_needed: null,
      };

      // If the case hold is already allocated in the hospital's count, 0 free remaining beds is still valid for this case
      const hosp0BedsAllocated: Hospital = { ...baseHospital, icu_beds_free: 0 };
      const validAllocated = isCommitmentStillValid(needIcuOnly, hosp0BedsAllocated, {
        is_case_hold_allocated: true,
      });
      expect(validAllocated.is_valid).toBe(true);

      // But if beds drop below 0 (oversubscribed/physical bed loss), it becomes invalid
      const hospNegBedsAllocated: Hospital = { ...baseHospital, icu_beds_free: -1 };
      const invalidAllocated = isCommitmentStillValid(needIcuOnly, hospNegBedsAllocated, {
        is_case_hold_allocated: true,
      });
      expect(invalidAllocated.is_valid).toBe(false);
    });

    it('guarantees deterministic repeated evaluation with no side effects', () => {
      const initialHospitalSnapshot = JSON.stringify(baseHospital);
      const initialNeedSnapshot = JSON.stringify(cardiacNeed);

      for (let i = 0; i < 50; i++) {
        const result = isCommitmentStillValid(cardiacNeed, baseHospital);
        expect(result.is_valid).toBe(true);
        expect(result.reasons).toHaveLength(0);
      }

      // Ensure objects were not mutated
      expect(JSON.stringify(baseHospital)).toBe(initialHospitalSnapshot);
      expect(JSON.stringify(cardiacNeed)).toBe(initialNeedSnapshot);
    });
  });

  // ==========================================================================
  // OPERATIONAL STATUS FOR COUNTABLE RESOURCES (Minimal Shared-Contract Fix)
  // ==========================================================================
  describe('OPERATIONAL STATUS FOR COUNTABLE RESOURCES', () => {
    const icuOnlyNeed: NeedProfile = {
      specialists_needed: [],
      capability_flags: ['icu'],
      blood_type_needed: null,
    };

    const ventOnlyNeed: NeedProfile = {
      specialists_needed: [],
      capability_flags: ['ventilator'],
      blood_type_needed: null,
    };

    const bloodOnlyNeed: NeedProfile = {
      specialists_needed: [],
      capability_flags: [],
      blood_type_needed: 'O-',
    };

    it('invalidates an accepted ICU commitment when operational_status.icu is false, even if hold is allocated', () => {
      const hospIcuOffline: Hospital = {
        ...baseHospital,
        icu_beds_free: 0,
        operational_status: { icu: false },
      };

      const result = isCommitmentStillValid(icuOnlyNeed, hospIcuOffline, {
        is_case_hold_allocated: true,
      });

      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      expect(result.detailed_reasons).toHaveLength(1);
      expect(result.detailed_reasons[0].type).toBe('icu_unavailable');
      expect(result.detailed_reasons[0].required_item).toBe('icu');
      expect(result.detailed_reasons[0].detail).toContain('operationally unavailable');
    });

    it('does NOT invalidate merely because free ICU beds are 0 when operational_status.icu is true and hold is allocated', () => {
      const hospIcuOperational: Hospital = {
        ...baseHospital,
        icu_beds_free: 0,
        operational_status: { icu: true },
      };

      const result = isCommitmentStillValid(icuOnlyNeed, hospIcuOperational, {
        is_case_hold_allocated: true,
      });

      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
      expect(result.detailed_reasons).toHaveLength(0);
    });

    it('invalidates when ventilator is required and operational_status.ventilator is false', () => {
      const hospVentOffline: Hospital = {
        ...baseHospital,
        ventilators_free: 0,
        operational_status: { ventilator: false },
      };

      const result = isCommitmentStillValid(ventOnlyNeed, hospVentOffline, {
        is_case_hold_allocated: true,
      });

      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      expect(result.detailed_reasons).toHaveLength(1);
      expect(result.detailed_reasons[0].type).toBe('ventilator_unavailable');
      expect(result.detailed_reasons[0].required_item).toBe('ventilator');
      expect(result.detailed_reasons[0].detail).toContain('operationally unavailable');
    });

    it('does not invalidate when ventilator is required, free count is 0, and operational_status.ventilator is true with allocated hold', () => {
      const hospVentOperational: Hospital = {
        ...baseHospital,
        ventilators_free: 0,
        operational_status: { ventilator: true },
      };

      const result = isCommitmentStillValid(ventOnlyNeed, hospVentOperational, {
        is_case_hold_allocated: true,
      });

      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
    });

    it('invalidates when blood is required and operational_status.blood is false', () => {
      const hospBloodOffline: Hospital = {
        ...baseHospital,
        blood_stock: { 'O-': 5 },
        operational_status: { blood: false },
      };

      const result = isCommitmentStillValid(bloodOnlyNeed, hospBloodOffline, {
        is_case_hold_allocated: true,
      });

      expect(result.is_valid).toBe(false);
      expect(result.is_invalid).toBe(true);
      expect(result.detailed_reasons).toHaveLength(1);
      expect(result.detailed_reasons[0].type).toBe('blood_unavailable');
      expect(result.detailed_reasons[0].required_item).toBe('O-');
      expect(result.detailed_reasons[0].detail).toContain('blood bank operations are unavailable');
    });

    it('does not invalidate when blood is required, stock is 0, and operational_status.blood is true with allocated hold', () => {
      const hospBloodOperational: Hospital = {
        ...baseHospital,
        blood_stock: { 'O-': 0 },
        operational_status: { blood: true },
      };

      const result = isCommitmentStillValid(bloodOnlyNeed, hospBloodOperational, {
        is_case_hold_allocated: true,
      });

      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
    });

    it('preserves existing behavior when operational_status is completely omitted', () => {
      const hospNoOperationalStatus: Hospital = {
        ...baseHospital,
        icu_beds_free: 0,
        operational_status: undefined,
      };

      // With is_case_hold_allocated: true, 0 beds remains valid
      const validWithAllocated = isCommitmentStillValid(icuOnlyNeed, hospNoOperationalStatus, {
        is_case_hold_allocated: true,
      });
      expect(validWithAllocated.is_valid).toBe(true);

      // Without is_case_hold_allocated, 0 beds <= 0 holds is invalid
      const invalidWithoutAllocated = isCommitmentStillValid(icuOnlyNeed, hospNoOperationalStatus);
      expect(invalidWithoutAllocated.is_valid).toBe(false);
    });

    it('does NOT invalidate when operational_status of an unneeded countable resource is false', () => {
      // Case needs blood O-, does not need ICU or ventilator
      const hospUnrelatedOffline: Hospital = {
        ...baseHospital,
        blood_stock: { 'O-': 5 },
        operational_status: { icu: false, ventilator: false },
      };

      const result = isCommitmentStillValid(bloodOnlyNeed, hospUnrelatedOffline);
      expect(result.is_valid).toBe(true);
      expect(result.is_invalid).toBe(false);
    });
  });
});

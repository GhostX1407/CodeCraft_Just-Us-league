import { describe, expect, it } from 'vitest';
import { evaluateEligibility } from '../src/matching/eligibility';
import { Hospital, NeedProfile } from '../src/types';

describe('Hard Capability Eligibility Gate (spec.md Section 21)', () => {
  const eligibleHospital: Hospital = {
    id: 'hosp_alpha',
    name: 'Alpha Trauma Center',
    lat: 21.17,
    lng: 72.83,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'general_surgeon'],
    icu_beds_free: 3,
    ventilators_free: 2,
    blood_stock: { 'O-': 5, 'A+': 10 },
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: Date.now(),
    reliability_score: 0.98,
    capabilities: ['ecg'],
  };

  it('marks a fully capable hospital as eligible', () => {
    const need: NeedProfile = {
      specialists_needed: ['cardiologist'],
      capability_flags: ['ecg', 'icu'],
      blood_type_needed: 'O-',
    };

    const res = evaluateEligibility(need, eligibleHospital);
    expect(res.eligible).toBe(true);
    expect(res.reason).toBeNull();
  });

  it('marks candidate ineligible when a required specialist is absent', () => {
    const need: NeedProfile = {
      specialists_needed: ['neurologist'], // Alpha does not have neurologist
      capability_flags: ['icu'],
      blood_type_needed: null,
    };

    const res = evaluateEligibility(need, eligibleHospital);
    expect(res.eligible).toBe(false);
    expect(res.missing_specialists).toContain('neurologist');
    expect(res.reason).toContain('neurologist');
  });

  it('marks candidate ineligible when a required capability flag is absent', () => {
    const need: NeedProfile = {
      specialists_needed: [],
      capability_flags: ['trauma_team'],
      blood_type_needed: null,
    };

    const hospNoTrauma: Hospital = {
      ...eligibleHospital,
      trauma_team_on_shift: false,
    };

    const res = evaluateEligibility(need, hospNoTrauma);
    expect(res.eligible).toBe(false);
    expect(res.missing_capabilities).toContain('trauma_team');
  });

  it('marks candidate ineligible when required blood group is out of stock', () => {
    const need: NeedProfile = {
      specialists_needed: [],
      capability_flags: [],
      blood_type_needed: 'B-', // Alpha has 0 units of B-
    };

    const res = evaluateEligibility(need, eligibleHospital);
    expect(res.eligible).toBe(false);
    expect(res.missing_blood).toContain('B-');
  });

  it('marks candidate ineligible when free ICU beds are 0', () => {
    const need: NeedProfile = {
      specialists_needed: [],
      capability_flags: ['icu'],
      blood_type_needed: null,
    };

    const hospZeroIcu: Hospital = {
      ...eligibleHospital,
      icu_beds_free: 0,
    };

    const res = evaluateEligibility(need, hospZeroIcu);
    expect(res.eligible).toBe(false);
    expect(res.insufficient_resources?.some((r) => r.includes('ICU'))).toBe(true);
  });

  it('marks candidate ineligible when ICU beds are exhausted by active holds', () => {
    const need: NeedProfile = {
      specialists_needed: [],
      capability_flags: ['icu'],
      blood_type_needed: null,
    };

    // 3 beds free, but 3 active committed holds
    const res = evaluateEligibility(need, eligibleHospital, {
      holds: { icu_holds: 3 },
    });
    expect(res.eligible).toBe(false);
    expect(res.insufficient_resources?.some((r) => r.includes('ICU'))).toBe(true);
  });

  it('excludes already attempted hospitals during rerouting (spec.md Section 33)', () => {
    const need: NeedProfile = {
      specialists_needed: ['cardiologist'],
      capability_flags: ['icu'],
      blood_type_needed: null,
    };

    const res = evaluateEligibility(need, eligibleHospital, {
      alreadyAttemptedHospitalIds: ['hosp_alpha'],
    });

    expect(res.eligible).toBe(false);
    expect(res.reason).toContain('already attempted');
  });
});

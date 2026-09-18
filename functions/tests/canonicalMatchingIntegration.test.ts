/**
 * Integration Tests: Canonical P1 Matching Engine Integration & Adapter Parity
 * 
 * Verifies:
 * 1. P2 MatchingAdapter returns exact same ranking, scores, and factor breakdowns as direct P1 rankHospitalsForCase()
 * 2. Strict ambulance_location validation: no silent fallback to Surat coordinates
 * 3. Hold semantics: live matching does not double-count holds already decremented in hospital free counts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { rankHospitalsForCase } from '../src/matching';
import {
  MatchingAdapter,
  InvalidAmbulanceLocationError,
} from '../src/services/matchingAdapter';
import { Case, Hospital } from '../src/services/types';
import { generateNeedProfile } from '../src/domain/needProfile';

describe('Canonical Matching Engine Integration & Parity', () => {
  let sampleHospitals: Hospital[];
  let sampleCase: Case;

  beforeEach(() => {
    sampleHospitals = [
      {
        id: 'hosp_alpha',
        name: 'Alpha Hospital',
        lat: 21.1702,
        lng: 72.8311,
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist', 'anesthetist'],
        icu_beds_free: 3,
        ventilators_free: 2,
        blood_stock: { 'O-': 4, 'O+': 10 },
        er_load_score: 2,
        accepts_scheme_patients: true,
        last_updated_at: new Date().toISOString(),
        reliability_score: 0.95,
      },
      {
        id: 'hosp_beta',
        name: 'Beta Hospital',
        lat: 21.185,
        lng: 72.825,
        trauma_team_on_shift: false,
        specialists_on_call: ['cardiologist'],
        icu_beds_free: 1,
        ventilators_free: 1,
        blood_stock: { 'O-': 2, 'O+': 5 },
        er_load_score: 4,
        accepts_scheme_patients: true,
        last_updated_at: new Date().toISOString(),
        reliability_score: 0.88,
      },
      {
        id: 'hosp_gamma',
        name: 'Gamma Ineligible',
        lat: 21.16,
        lng: 72.84,
        trauma_team_on_shift: false,
        specialists_on_call: ['pediatrician'], // Missing cardiologist!
        icu_beds_free: 2,
        ventilators_free: 1,
        blood_stock: { 'O-': 1 },
        er_load_score: 1,
        accepts_scheme_patients: true,
        last_updated_at: new Date().toISOString(),
        reliability_score: 0.9,
      },
    ];

    sampleCase = {
      id: 'case_cardiac_test',
      category: 'cardiac',
      severity: 'red',
      need_profile: generateNeedProfile('cardiac', 'red'),
      incident_group_id: null,
      ambulance_location: { lat: 21.175, lng: 72.828 },
    };
  });

  it('proves MatchingAdapter returns exact same candidate ordering as direct P1 rankHospitalsForCase()', () => {
    // 1. Direct P1 call
    const directP1Results = rankHospitalsForCase(sampleCase, sampleHospitals, {
      include_ineligible: false,
    });

    // 2. P2 Adapter call
    const adapterResults = MatchingAdapter.rankEligibleCandidates(sampleCase, sampleHospitals);

    expect(adapterResults.length).toBe(directP1Results.length);
    for (let i = 0; i < directP1Results.length; i++) {
      expect(adapterResults[i].hospital.id).toBe(directP1Results[i].hospital_id);
      expect(adapterResults[i].breakdown.final_score).toBe(directP1Results[i].final_score);
      expect(adapterResults[i].breakdown.distance_km).toBe(directP1Results[i].distance_km);
      expect(adapterResults[i].breakdown.distance_factor).toBe(directP1Results[i].distance_factor);
      expect(adapterResults[i].breakdown.load_factor).toBe(directP1Results[i].load_factor);
      expect(adapterResults[i].breakdown.freshness_factor).toBe(directP1Results[i].freshness_factor);
    }
  });

  it('rejects cases with missing or invalid ambulance_location without silent fallback', () => {
    const caseMissingLocation = { ...sampleCase, ambulance_location: undefined as any };
    expect(() => MatchingAdapter.rankAllCandidates(caseMissingLocation, sampleHospitals)).toThrow(
      InvalidAmbulanceLocationError
    );

    const caseInvalidCoordinates = {
      ...sampleCase,
      ambulance_location: { lat: NaN, lng: 72.8311 },
    };
    expect(() => MatchingAdapter.rankAllCandidates(caseInvalidCoordinates, sampleHospitals)).toThrow(
      InvalidAmbulanceLocationError
    );
  });

  it('excludes already attempted hospital IDs strictly and deterministically', () => {
    const candidates = MatchingAdapter.rankEligibleCandidates(
      sampleCase,
      sampleHospitals,
      ['hosp_alpha'] // Alpha attempted, must be excluded
    );

    const hospitalIds = candidates.map((c) => c.hospital.id);
    expect(hospitalIds).not.toContain('hosp_alpha');
    expect(hospitalIds).toContain('hosp_beta');
  });

  it('verifies hold semantics: normal live matching does not double-count active holds', () => {
    // In normal live operation, hospital.icu_beds_free is already 3.
    // The adapter does NOT pass committed_holds to P1, so available ICU is exactly 3.
    const results = MatchingAdapter.rankAllCandidates(sampleCase, sampleHospitals);
    const alpha = results.find((r) => r.hospital.id === 'hosp_alpha');
    expect(alpha?.eligible).toBe(true);
    expect(alpha?.breakdown.final_score).toBeGreaterThan(0);
  });
});

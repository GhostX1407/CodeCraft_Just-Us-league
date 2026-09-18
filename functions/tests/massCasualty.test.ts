import { describe, expect, it } from 'vitest';
import {
  CONCENTRATION_PENALTY_PER_EXTRA_PATIENT,
  distributeMassCasualtyIncident,
  getCaseConstraintScore,
  prioritizeMassCasualtyCases,
} from '../src/matching/massCasualty';
import { Case, Hospital } from '../src/types';

describe('Mass-Casualty Multi-Hospital Distribution (spec.md Sections 63–70)', () => {
  it('confirms concentration penalty is 8 points per extra patient', () => {
    expect(CONCENTRATION_PENALTY_PER_EXTRA_PATIENT).toBe(8);
  });

  describe('Case Prioritization (T-P1-035)', () => {
    it('prioritizes red severity before yellow before green', () => {
      const caseRed: Case = {
        id: 'c_red',
        category: 'cardiac',
        severity: 'red',
        need_profile: { specialists_needed: [], capability_flags: [], blood_type_needed: null },
        ambulance_location: { lat: 0, lng: 0 },
      };
      const caseYellow: Case = {
        id: 'c_yellow',
        category: 'cardiac',
        severity: 'yellow',
        need_profile: { specialists_needed: [], capability_flags: [], blood_type_needed: null },
        ambulance_location: { lat: 0, lng: 0 },
      };
      const caseGreen: Case = {
        id: 'c_green',
        category: 'cardiac',
        severity: 'green',
        need_profile: { specialists_needed: [], capability_flags: [], blood_type_needed: null },
        ambulance_location: { lat: 0, lng: 0 },
      };

      const sorted = prioritizeMassCasualtyCases([caseGreen, caseRed, caseYellow]);
      expect(sorted.map((c) => c.id)).toEqual(['c_red', 'c_yellow', 'c_green']);
    });

    it('prioritizes more constrained cases when severity is equal', () => {
      const caseSimple: Case = {
        id: 'c_01',
        category: 'cardiac',
        severity: 'red',
        need_profile: {
          specialists_needed: ['cardiologist'],
          capability_flags: [],
          blood_type_needed: null,
        },
        ambulance_location: { lat: 0, lng: 0 },
      };

      const caseComplex: Case = {
        id: 'c_02',
        category: 'trauma',
        severity: 'red',
        need_profile: {
          specialists_needed: ['orthopedist', 'general_surgeon'],
          capability_flags: ['trauma_team', 'icu'],
          blood_type_needed: 'O-',
        },
        ambulance_location: { lat: 0, lng: 0 },
      };

      expect(getCaseConstraintScore(caseComplex)).toBe(5); // 2 spec + 2 flags + 1 blood
      expect(getCaseConstraintScore(caseSimple)).toBe(1);

      const sorted = prioritizeMassCasualtyCases([caseSimple, caseComplex]);
      expect(sorted[0].id).toBe('c_02'); // complex first
    });

    it('breaks ties on case_id ascending when severity and constraints are equal', () => {
      const caseB: Case = {
        id: 'case_b',
        category: 'cardiac',
        severity: 'red',
        need_profile: { specialists_needed: [], capability_flags: [], blood_type_needed: null },
        ambulance_location: { lat: 0, lng: 0 },
      };
      const caseA: Case = {
        id: 'case_a',
        category: 'cardiac',
        severity: 'red',
        need_profile: { specialists_needed: [], capability_flags: [], blood_type_needed: null },
        ambulance_location: { lat: 0, lng: 0 },
      };

      const sorted = prioritizeMassCasualtyCases([caseB, caseA]);
      expect(sorted.map((c) => c.id)).toEqual(['case_a', 'case_b']);
    });
  });

  describe('Joint Allocation Search & Distribution', () => {
    const fixedTime = 1700000000000;

    const hospitals: Hospital[] = [
      {
        id: 'hosp_central',
        name: 'Central Trauma Institute',
        lat: 21.17,
        lng: 72.83, // very close
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist', 'orthopedist', 'general_surgeon'],
        icu_beds_free: 2, // only 2 ICU beds
        ventilators_free: 2,
        blood_stock: { 'O-': 5 },
        er_load_score: 2,
        accepts_scheme_patients: true,
        last_updated_at: fixedTime,
        reliability_score: 0.98,
      },
      {
        id: 'hosp_north',
        name: 'North Metro Hospital',
        lat: 21.19,
        lng: 72.84, // ~3 km away
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist', 'orthopedist'],
        icu_beds_free: 4, // 4 ICU beds
        ventilators_free: 3,
        blood_stock: { 'O-': 5 },
        er_load_score: 2,
        accepts_scheme_patients: true,
        last_updated_at: fixedTime,
        reliability_score: 0.95,
      },
      {
        id: 'hosp_south',
        name: 'South District Hospital',
        lat: 21.15,
        lng: 72.82, // ~3 km away
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist', 'general_surgeon'],
        icu_beds_free: 3,
        ventilators_free: 2,
        blood_stock: { 'O-': 4 },
        er_load_score: 2,
        accepts_scheme_patients: true,
        last_updated_at: fixedTime,
        reliability_score: 0.92,
      },
    ];

    // 4 patients from a building collapse incident
    const incidentCases: Case[] = [
      {
        id: 'case_mci_01',
        incident_group_id: 'incident_collapse_01',
        category: 'trauma',
        severity: 'red',
        need_profile: { specialists_needed: [], capability_flags: ['trauma_team', 'icu'], blood_type_needed: 'O-' },
        ambulance_location: { lat: 21.17, lng: 72.83 },
      },
      {
        id: 'case_mci_02',
        incident_group_id: 'incident_collapse_01',
        category: 'trauma',
        severity: 'red',
        need_profile: { specialists_needed: [], capability_flags: ['trauma_team', 'icu'], blood_type_needed: 'O-' },
        ambulance_location: { lat: 21.17, lng: 72.83 },
      },
      {
        id: 'case_mci_03',
        incident_group_id: 'incident_collapse_01',
        category: 'cardiac',
        severity: 'yellow',
        need_profile: { specialists_needed: ['cardiologist'], capability_flags: ['icu'], blood_type_needed: null },
        ambulance_location: { lat: 21.17, lng: 72.83 },
      },
      {
        id: 'case_mci_04',
        incident_group_id: 'incident_collapse_01',
        category: 'trauma',
        severity: 'yellow',
        need_profile: { specialists_needed: [], capability_flags: ['trauma_team'], blood_type_needed: null },
        ambulance_location: { lat: 21.17, lng: 72.83 },
      },
    ];

    it('jointly distributes 4 patients across multiple hospitals avoiding saturation', () => {
      const result = distributeMassCasualtyIncident('incident_collapse_01', incidentCases, hospitals, fixedTime);

      expect(result.assignments.length).toBe(4);
      expect(result.unassigned_case_ids.length).toBe(0);

      // Collect hospital destination counts
      const destinations = result.assignments.map((a) => a.assigned_hospital_id);
      const uniqueHospitals = new Set(destinations);

      // Multiple hospitals must be utilized (not all dumped onto Central)
      expect(uniqueHospitals.size).toBeGreaterThanOrEqual(2);

      // Verify that Central was not allocated more than its 2 available ICU beds for ICU cases
      const centralIcuCases = result.assignments.filter(
        (a) =>
          a.assigned_hospital_id === 'hosp_central' &&
          incidentCases.find((c) => c.id === a.case_id)?.need_profile.capability_flags.includes('icu')
      );
      expect(centralIcuCases.length).toBeLessThanOrEqual(2);
    });

    it('handles empty case lists safely', () => {
      const result = distributeMassCasualtyIncident('incident_empty', [], hospitals, fixedTime);
      expect(result.assignments).toEqual([]);
      expect(result.total_score).toBe(0);
      expect(result.unassigned_case_ids).toEqual([]);
    });
  });
});

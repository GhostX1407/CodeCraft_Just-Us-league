import { describe, expect, it } from 'vitest';
import {
  calculateFinalScore,
  compareCandidatesTieBreak,
  rankHospitalsForCase,
} from '../src/matching/scoring';
import { Case, Hospital, MatchResult } from '../src/types';

describe('Scoring, Tie-Breaking & Candidate Ranking', () => {
  describe('Final Score Calculation (spec.md Section 29)', () => {
    it('computes exact 61.6 for textbook spec.md Section 29 example', () => {
      // capability = 1.0, distance = 0.70, load = 0.88, freshness = 1.00
      // 1.00 * 0.70 * 0.88 * 1.00 * 100 = 61.6
      const score = calculateFinalScore(1.0, 0.7, 0.88, 1.0);
      expect(score).toBe(61.6);
    });

    it('clamps final score strictly between 0 and 100', () => {
      expect(calculateFinalScore(1.0, 1.0, 1.0, 1.0)).toBe(100);
      expect(calculateFinalScore(0, 0.5, 0.5, 0.5)).toBe(0);
    });
  });

  describe('Deterministic Tie-Breaking (spec.md Section 32)', () => {
    const makeStubCandidate = (
      id: string,
      score: number,
      cap: number,
      ageMin: number,
      dist: number
    ): MatchResult => ({
      hospital_id: id,
      rank: 1,
      capability_match_pct: cap,
      distance_km: dist,
      distance_factor: 0.5,
      load_factor: 0.88,
      freshness_factor: 1.0,
      final_score: score,
      eligibility: { eligible: true, reason: null },
      freshness: {
        status: 'fresh',
        age_minutes: ageMin,
        factor: 1.0,
        last_updated_at: Date.now(),
      },
      reasons: [],
    });

    const hospMap = new Map<string, Hospital>([
      ['hosp_a', { id: 'hosp_a', er_load_score: 2 } as Hospital],
      ['hosp_b', { id: 'hosp_b', er_load_score: 3 } as Hospital],
    ]);

    it('breaks ties on higher capability match percentage first', () => {
      const a = makeStubCandidate('hosp_a', 70.0, 100, 5, 4.0);
      const b = makeStubCandidate('hosp_b', 70.0, 90, 5, 4.0);
      // a has 100% cap, b has 90% cap -> a before b
      expect(compareCandidatesTieBreak(a, b, hospMap)).toBeLessThan(0);
    });

    it('breaks ties on fresher data (lower age) if capability is equal', () => {
      const a = makeStubCandidate('hosp_a', 70.0, 100, 2, 4.0); // 2 min old
      const b = makeStubCandidate('hosp_b', 70.0, 100, 8, 4.0); // 8 min old
      expect(compareCandidatesTieBreak(a, b, hospMap)).toBeLessThan(0);
    });

    it('breaks ties on lower distance if capability and freshness are equal', () => {
      const a = makeStubCandidate('hosp_a', 70.0, 100, 5, 3.2); // 3.2 km
      const b = makeStubCandidate('hosp_b', 70.0, 100, 5, 6.1); // 6.1 km
      expect(compareCandidatesTieBreak(a, b, hospMap)).toBeLessThan(0);
    });

    it('breaks ties on lower ER load score if distance is also equal', () => {
      const a = makeStubCandidate('hosp_a', 70.0, 100, 5, 4.0); // hosp_a er_load = 2
      const b = makeStubCandidate('hosp_b', 70.0, 100, 5, 4.0); // hosp_b er_load = 3
      expect(compareCandidatesTieBreak(a, b, hospMap)).toBeLessThan(0);
    });

    it('breaks ties on lexicographical hospital_id as the final tier', () => {
      const a = makeStubCandidate('hosp_001', 70.0, 100, 5, 4.0);
      const b = makeStubCandidate('hosp_002', 70.0, 100, 5, 4.0);
      const mapSameLoad = new Map<string, Hospital>([
        ['hosp_001', { id: 'hosp_001', er_load_score: 2 } as Hospital],
        ['hosp_002', { id: 'hosp_002', er_load_score: 2 } as Hospital],
      ]);
      expect(compareCandidatesTieBreak(a, b, mapSameLoad)).toBeLessThan(0);
    });
  });

  describe('Full Hospital Ranking Pipeline', () => {
    const fixedNow = 1700000000000;

    const sampleHospitals: Hospital[] = [
      {
        id: 'hosp_close_high_load',
        name: 'City Emergency',
        lat: 21.171,
        lng: 72.832, // ~0.15 km away
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist', 'orthopedist'],
        icu_beds_free: 2,
        ventilators_free: 1,
        blood_stock: { 'O-': 2 },
        er_load_score: 5, // high load (factor = 0.52)
        accepts_scheme_patients: true,
        last_updated_at: fixedNow - 2 * 60 * 1000, // 2 min ago (fresh)
        reliability_score: 0.9,
      },
      {
        id: 'hosp_medium_distance_low_load',
        name: 'Apex Super Specialty',
        lat: 21.19,
        lng: 72.85, // ~3 km away
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist'],
        icu_beds_free: 5,
        ventilators_free: 3,
        blood_stock: { 'O-': 5 },
        er_load_score: 1, // lowest load (factor = 1.00)
        accepts_scheme_patients: true,
        last_updated_at: fixedNow - 3 * 60 * 1000, // 3 min ago (fresh)
        reliability_score: 0.98,
      },
      {
        id: 'hosp_incapable',
        name: 'Community Clinic',
        lat: 21.17,
        lng: 72.83,
        trauma_team_on_shift: false,
        specialists_on_call: ['pediatrician'], // No cardiologist
        icu_beds_free: 0,
        ventilators_free: 0,
        blood_stock: {},
        er_load_score: 1,
        accepts_scheme_patients: true,
        last_updated_at: fixedNow,
        reliability_score: 0.8,
      },
    ];

    const cardiacCase: Case = {
      id: 'case_cardiac_01',
      category: 'cardiac',
      severity: 'red',
      need_profile: {
        specialists_needed: ['cardiologist'],
        capability_flags: ['icu'],
        blood_type_needed: null,
      },
      ambulance_location: { lat: 21.17, lng: 72.83 },
    };

    it('ranks eligible hospitals deterministically and filters out incapable facilities', () => {
      const rankings = rankHospitalsForCase(cardiacCase, sampleHospitals, {
        current_time: fixedNow,
      });

      expect(rankings.length).toBe(2);
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);

      // Community Clinic must be completely excluded from default ranking
      expect(rankings.some((r) => r.hospital_id === 'hosp_incapable')).toBe(false);

      // Apex should win due to low load (1.0 vs 0.52 load factor)
      expect(rankings[0].hospital_id).toBe('hosp_medium_distance_low_load');
    });

    it('excludes attempted hospitals when performing rerouting', () => {
      const reroutedRankings = rankHospitalsForCase(cardiacCase, sampleHospitals, {
        current_time: fixedNow,
        already_attempted_hospital_ids: ['hosp_medium_distance_low_load'],
      });

      expect(reroutedRankings.length).toBe(1);
      expect(reroutedRankings[0].hospital_id).toBe('hosp_close_high_load');
      expect(reroutedRankings[0].rank).toBe(1);
    });

    it('is strictly deterministic across repeated executions with identical inputs', () => {
      const run1 = rankHospitalsForCase(cardiacCase, sampleHospitals, { current_time: fixedNow });
      const run2 = rankHospitalsForCase(cardiacCase, sampleHospitals, { current_time: fixedNow });
      expect(run1).toEqual(run2);
    });
  });
});

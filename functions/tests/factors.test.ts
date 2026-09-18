import { describe, expect, it } from 'vitest';
import {
  calculateCapabilityMatch,
  calculateLoadFactor,
  checkHospitalCapabilityFlag,
  evaluateFreshness,
  parseTimestampToMs,
} from '../src/matching/factors';
import { Hospital, NeedProfile } from '../src/types';

describe('Factors & Scoring Components', () => {
  describe('ER Load Factor (spec.md Section 27)', () => {
    it('computes exact load factor values for scores 1 through 5', () => {
      // 1 -> 1.00
      expect(calculateLoadFactor(1)).toBe(1.0);
      // 2 -> 0.88
      expect(calculateLoadFactor(2)).toBe(0.88);
      // 3 -> 0.76
      expect(calculateLoadFactor(3)).toBe(0.76);
      // 4 -> 0.64
      expect(calculateLoadFactor(4)).toBe(0.64);
      // 5 -> 0.52
      expect(calculateLoadFactor(5)).toBe(0.52);
    });

    it('clamps load factor for out-of-range scores', () => {
      expect(calculateLoadFactor(0)).toBe(1.0); // clamped to 1
      expect(calculateLoadFactor(7)).toBe(0.52); // clamped to 5
    });
  });

  describe('Freshness Classification & Factor (spec.md Section 28)', () => {
    const baseTime = 1700000000000;

    it('classifies 0–10 minutes as fresh with factor 1.00', () => {
      const fiveMinAgo = baseTime - 5 * 60 * 1000;
      const result = evaluateFreshness(fiveMinAgo, baseTime);
      expect(result.status).toBe('fresh');
      expect(result.factor).toBe(1.0);
      expect(result.age_minutes).toBe(5);
    });

    it('classifies >10–30 minutes as stale with factor 0.85', () => {
      const twentyMinAgo = baseTime - 20 * 60 * 1000;
      const result = evaluateFreshness(twentyMinAgo, baseTime);
      expect(result.status).toBe('stale');
      expect(result.factor).toBe(0.85);
      expect(result.age_minutes).toBe(20);
    });

    it('classifies >30 minutes as unknown with factor 0.70', () => {
      const fortyMinAgo = baseTime - 40 * 60 * 1000;
      const result = evaluateFreshness(fortyMinAgo, baseTime);
      expect(result.status).toBe('unknown');
      expect(result.factor).toBe(0.7);
      expect(result.age_minutes).toBe(40);
    });

    it('handles invalid or empty timestamps as unknown', () => {
      const result = evaluateFreshness('', baseTime);
      expect(result.status).toBe('unknown');
      expect(result.factor).toBe(0.7);
    });

    it('parses Firestore-like timestamp objects with toMillis()', () => {
      const firestoreTs = { toMillis: () => baseTime - 60000 };
      expect(parseTimestampToMs(firestoreTs)).toBe(baseTime - 60000);
    });
  });

  describe('Capability Match Percentage (spec.md Section 22–24)', () => {
    const baseHospital: Hospital = {
      id: 'hosp_01',
      name: 'Apex Care',
      lat: 21.17,
      lng: 72.83,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist', 'orthopedist'],
      icu_beds_free: 4,
      ventilators_free: 2,
      blood_stock: { 'O-': 3, 'O+': 10 },
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: Date.now(),
      reliability_score: 0.95,
      capabilities: ['ecg', 'maternity'],
    };

    it('returns 100% when all requirements are met (example from spec.md Section 24)', () => {
      const need: NeedProfile = {
        specialists_needed: ['cardiologist'],
        capability_flags: ['ecg', 'icu'],
        blood_type_needed: null,
      };

      const match = calculateCapabilityMatch(need, baseHospital);
      expect(match.capability_match_pct).toBe(100);
      expect(match.capability_factor).toBe(1.0);
    });

    it('computes exact 75% when 1 of 2 flags is missing with normalized 50/50 weights', () => {
      const hospitalNoIcu: Hospital = {
        ...baseHospital,
        icu_beds_free: 0,
      };

      const need: NeedProfile = {
        specialists_needed: ['cardiologist'],
        capability_flags: ['ecg', 'icu'],
        blood_type_needed: null,
      };

      // Specialists match = 1/1 (100% * 50% = 50%)
      // Flags match = 1/2 (50% * 50% = 25%)
      // Total = 75%
      const match = calculateCapabilityMatch(need, hospitalNoIcu);
      expect(match.capability_match_pct).toBe(75);
      expect(match.capability_factor).toBe(0.75);
    });

    it('includes blood group requirement with 40/40/20 default weights', () => {
      const need: NeedProfile = {
        specialists_needed: ['cardiologist'], // 40%
        capability_flags: ['icu'], // 40%
        blood_type_needed: 'O-', // 20%
      };

      const match = calculateCapabilityMatch(need, baseHospital);
      expect(match.capability_match_pct).toBe(100);

      // Hospital without requested blood
      const noBloodHosp: Hospital = {
        ...baseHospital,
        blood_stock: { 'A+': 5 },
      };
      const matchNoBlood = calculateCapabilityMatch(need, noBloodHosp);
      expect(matchNoBlood.capability_match_pct).toBe(80); // 40% + 40% = 80%
    });

    it('returns 100% when case has no requirements', () => {
      const emptyNeed: NeedProfile = {
        specialists_needed: [],
        capability_flags: [],
        blood_type_needed: null,
      };

      const match = calculateCapabilityMatch(emptyNeed, baseHospital);
      expect(match.capability_match_pct).toBe(100);
      expect(match.capability_factor).toBe(1.0);
    });
  });

  describe('Capability Flag Helper', () => {
    const hosp: Hospital = {
      id: 'h1',
      name: 'H1',
      lat: 0,
      lng: 0,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist'],
      icu_beds_free: 2,
      ventilators_free: 1,
      blood_stock: {},
      er_load_score: 1,
      accepts_scheme_patients: true,
      last_updated_at: Date.now(),
      reliability_score: 1.0,
    };

    it('correctly validates trauma_team flag', () => {
      expect(checkHospitalCapabilityFlag(hosp, 'trauma_team')).toBe(true);
      expect(checkHospitalCapabilityFlag({ ...hosp, trauma_team_on_shift: false }, 'trauma_team')).toBe(false);
    });

    it('correctly validates icu capacity against holds', () => {
      expect(checkHospitalCapabilityFlag(hosp, 'icu', { icu_holds: 1 })).toBe(true); // 2 > 1
      expect(checkHospitalCapabilityFlag(hosp, 'icu', { icu_holds: 2 })).toBe(false); // 2 not > 2
    });
  });
});

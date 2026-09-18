import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import { DEMO_HOSPITALS, DEMO_CASES, seedAllDemoData } from '../src/data/seedData';
import { HospitalRepository, CaseRepository, AuditRepository } from '../src/services/repositories';
import { classifyFreshness } from '../src/services/timestampUtils';

describe('Part 6: Seed / Demo Data Generator & Scenario Scaffolding', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);
  });

  describe('Dataset Schema & Scenario Integrity', () => {
    it('contains 12 diverse hospitals with complete schema profiles', () => {
      expect(DEMO_HOSPITALS.length).toBe(12);

      const hospitalIds = new Set(DEMO_HOSPITALS.map((h) => h.id));
      expect(hospitalIds.size).toBe(12);

      for (const h of DEMO_HOSPITALS) {
        expect(h.id).toBeDefined();
        expect(h.name).toBeDefined();
        expect(typeof h.lat).toBe('number');
        expect(typeof h.lng).toBe('number');
        expect(typeof h.trauma_team_on_shift).toBe('boolean');
        expect(Array.isArray(h.specialists_on_call)).toBe(true);
        expect(h.icu_beds_free).toBeGreaterThanOrEqual(0);
        expect(h.ventilators_free).toBeGreaterThanOrEqual(0);
        expect(h.blood_stock).toBeDefined();
        expect(h.er_load_score).toBeGreaterThanOrEqual(1);
        expect(h.er_load_score).toBeLessThanOrEqual(5);
        if (h.reliability_score !== null) {
          expect(h.reliability_score).toBeGreaterThanOrEqual(0.0);
          expect(h.reliability_score).toBeLessThanOrEqual(1.0);
        } else {
          expect(h.reliability_score).toBeNull();
        }
      }
    });

    it('contains hospitals with fresh, stale, and unknown freshness states', () => {
      const freshnessStates = DEMO_HOSPITALS.map((h) => classifyFreshness(h.last_updated_at));

      expect(freshnessStates).toContain('fresh'); // e.g. hospital_001
      expect(freshnessStates).toContain('stale'); // e.g. hospital_005 (22 min ago)
      expect(freshnessStates).toContain('unknown'); // e.g. hospital_003 (48 min ago)
    });

    it('covers all 4 required case categories and includes mass-casualty group', () => {
      const categories = new Set(DEMO_CASES.map((c) => c.category));
      expect(categories.has('cardiac')).toBe(true);
      expect(categories.has('trauma')).toBe(true);
      expect(categories.has('obstetric')).toBe(true);
      expect(categories.has('pediatric')).toBe(true);

      const mciCases = DEMO_CASES.filter((c) => c.incident_group_id === 'incident_expressway_mci_01');
      expect(mciCases.length).toBe(4);
    });
  });

  describe('Seeder Execution', () => {
    it('seeds all hospitals, cases, reliability records, and initial audit logs into Firestore', async () => {
      const result = await seedAllDemoData();

      expect(result.hospitalsCount).toBe(12);
      expect(result.casesCount).toBe(DEMO_CASES.length);
      expect(result.reliabilityCount).toBe(12);
      expect(result.auditCount).toBeGreaterThan(0);

      // Verify Firestore repositories can read the seeded entities
      const hospitalsInDb = await HospitalRepository.listAll();
      expect(hospitalsInDb.length).toBe(12);

      const casesInDb = await CaseRepository.listByIncident('incident_expressway_mci_01');
      expect(casesInDb.length).toBe(4);

      const initialAuditLogs = await AuditRepository.listRecent(50);
      expect(initialAuditLogs.length).toBeGreaterThan(0);
    });
  });
});

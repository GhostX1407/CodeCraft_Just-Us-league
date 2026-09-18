import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import {
  HospitalRepository,
  CaseRepository,
  RequestRepository,
  HoldRepository,
  AuditRepository,
} from '../src/services/repositories';
import { RequestLifecycleService } from '../src/routing/requestLifecycleService';
import { ResourceHoldService } from '../src/resources/resourceHoldService';
import { RerouteService } from '../src/routing/rerouteService';
import { TimeoutService } from '../src/routing/timeoutService';
import { MatchingAdapter } from '../src/services/matchingAdapter';
import { classifyFreshness, toISOString } from '../src/services/timestampUtils';
import { evaluateFreshness } from '../src/matching/factors';
import { Hospital, Case } from '../src/services/types';

describe('Comprehensive State-Consistency & Countable Resource Invariants (A-L)', () => {
  let mockDb: MockFirestore;

  const createBaseHospital = (overrides: Partial<Hospital> = {}): Hospital => ({
    id: 'hosp_apex_audit',
    name: 'Surat Apex Trauma Center',
    lat: 21.1825,
    lng: 72.8198,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'orthopedist', 'general_surgeon', 'anesthetist', 'neurosurgeon'],
    icu_beds_free: 5,
    ventilators_free: 10,
    blood_stock: { 'O-': 10, 'A+': 5 },
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: new Date().toISOString(),
    reliability_score: 0.98,
    ...overrides,
  });

  const createTestCase = (id: string, overrides: Partial<Case> = {}): Case => ({
    id,
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
    vitals_summary: 'Acute chest pain',
    onset_time: '20 min ago',
    treatment_administered: 'Aspirin, Oxygen',
    ambulance_location: { lat: 21.18, lng: 72.82 },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
    ...overrides,
  });

  beforeEach(() => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);
  });

  describe('Lifecycle Decrements across countable resources', () => {
    it('ICU stepwise decrement: 5 -> 4 -> 3 -> 2 -> 1 -> 0 and rejects at 0', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 5, ventilators_free: 10 });
      await HospitalRepository.create(hospital);

      const expectedValues = [4, 3, 2, 1, 0];

      for (let i = 0; i < 5; i++) {
        const caseItem = createTestCase(`case_icu_${i + 1}`);
        await CaseRepository.create(caseItem);

        const req = await RequestLifecycleService.createRequest({
          caseId: caseItem.id,
          hospitalId: hospital.id,
          attemptNumber: 1,
          matchScoreBreakdown: {
            capability_match_pct: 1.0,
            distance_km: 2.0,
            distance_factor: 0.9,
            load_factor: 0.8,
            freshness_factor: 1.0,
            final_score: 90,
          },
          reasonShownToDispatcher: `ICU match ${i + 1}`,
          hospital,
          caseData: caseItem,
        });

        const acceptRes = await RequestLifecycleService.acceptRequest(req.id);
        expect(acceptRes.success).toBe(true);

        const currentHosp = await HospitalRepository.get(hospital.id);
        expect(currentHosp?.icu_beds_free).toBe(expectedValues[i]);
      }

      // Exhausted: 6th request must be rejected due to 0 ICU beds
      const caseItem6 = createTestCase('case_icu_6');
      await CaseRepository.create(caseItem6);
      const req6 = await RequestLifecycleService.createRequest({
        caseId: caseItem6.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: {
          capability_match_pct: 1.0,
          distance_km: 2.0,
          distance_factor: 0.9,
          load_factor: 0.8,
          freshness_factor: 1.0,
          final_score: 90,
        },
        reasonShownToDispatcher: 'ICU match 6',
        hospital,
        caseData: caseItem6,
      });

      await expect(RequestLifecycleService.acceptRequest(req6.id)).rejects.toThrow(/Resource unavailable during acceptance/);
      const finalHosp = await HospitalRepository.get(hospital.id);
      expect(finalHosp?.icu_beds_free).toBe(0); // Invariant A: Never negative
    });

    it('Ventilators stepwise decrement: 3 -> 2 -> 1 -> 0 and rejects at 0', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 10, ventilators_free: 3 });
      await HospitalRepository.create(hospital);

      const ventCase = (id: string) =>
        createTestCase(id, {
          need_profile: {
            category: 'trauma',
            severity: 'red',
            specialists_needed: ['anesthetist'],
            capability_flags: ['ventilator'],
          },
        });

      const expected = [2, 1, 0];
      for (let i = 0; i < 3; i++) {
        const c = ventCase(`case_vent_${i + 1}`);
        await CaseRepository.create(c);

        const req = await RequestLifecycleService.createRequest({
          caseId: c.id,
          hospitalId: hospital.id,
          attemptNumber: 1,
          matchScoreBreakdown: {
            capability_match_pct: 1.0,
            distance_km: 2.0,
            distance_factor: 0.9,
            load_factor: 0.8,
            freshness_factor: 1.0,
            final_score: 90,
          },
          reasonShownToDispatcher: 'Ventilator match',
          hospital,
          caseData: c,
        });

        await RequestLifecycleService.acceptRequest(req.id);
        const hosp = await HospitalRepository.get(hospital.id);
        expect(hosp?.ventilators_free).toBe(expected[i]);
      }

      // 4th request fails
      const c4 = ventCase('case_vent_4');
      await CaseRepository.create(c4);
      const req4 = await RequestLifecycleService.createRequest({
        caseId: c4.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: {
          capability_match_pct: 1.0,
          distance_km: 2.0,
          distance_factor: 0.9,
          load_factor: 0.8,
          freshness_factor: 1.0,
          final_score: 90,
        },
        reasonShownToDispatcher: 'Ventilator match 4',
        hospital,
        caseData: c4,
      });

      await expect(RequestLifecycleService.acceptRequest(req4.id)).rejects.toThrow(/Resource unavailable during acceptance/);
      const hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.ventilators_free).toBe(0);
    });

    it('Blood stepwise decrement: 10 -> 9 -> 5 -> 1 -> 0', async () => {
      const hospital = createBaseHospital({ blood_stock: { 'O-': 10 } });
      await HospitalRepository.create(hospital);

      const bloodCase = (id: string) =>
        createTestCase(id, {
          need_profile: {
            category: 'trauma',
            severity: 'red',
            specialists_needed: [],
            capability_flags: [],
            blood_type_needed: 'O-',
          },
        });

      // 1. 10 -> 9 (1 unit)
      const c1 = bloodCase('case_b1');
      await CaseRepository.create(c1);
      const r1 = await RequestLifecycleService.createRequest({
        caseId: c1.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1.0, distance_km: 1.0, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Blood match',
        hospital,
        caseData: c1,
      });
      await RequestLifecycleService.acceptRequest(r1.id);
      let h = await HospitalRepository.get(hospital.id);
      expect(h?.blood_stock['O-']).toBe(9);

      // 2. Direct multi-unit consumption simulation: 9 -> 5 (4 units)
      ResourceHoldService.applyDecrement(h!, { icu: 0, ventilator: 0, blood: { 'O-': 4 } });
      expect(h?.blood_stock['O-']).toBe(5);

      // 3. 5 -> 1 (4 units)
      ResourceHoldService.applyDecrement(h!, { icu: 0, ventilator: 0, blood: { 'O-': 4 } });
      expect(h?.blood_stock['O-']).toBe(1);

      // 4. 1 -> 0 (1 unit)
      ResourceHoldService.applyDecrement(h!, { icu: 0, ventilator: 0, blood: { 'O-': 1 } });
      expect(h?.blood_stock['O-']).toBe(0);

      // 5. Check Invariant A: Decrement beyond zero clamps to 0
      ResourceHoldService.applyDecrement(h!, { icu: 0, ventilator: 0, blood: { 'O-': 5 } });
      expect(h?.blood_stock['O-']).toBe(0);
    });
  });

  describe('Edge Cases & Invariants A through L', () => {
    it('Invariant A: No resource count may become negative under any decrement', () => {
      const hospital = createBaseHospital({ icu_beds_free: 0, ventilators_free: 0, blood_stock: { 'O-': 0 } });
      ResourceHoldService.applyDecrement(hospital, { icu: 2, ventilator: 3, blood: { 'O-': 5 } });

      expect(hospital.icu_beds_free).toBe(0);
      expect(hospital.ventilators_free).toBe(0);
      expect(hospital.blood_stock['O-']).toBe(0);
    });

    it('Invariant B & F: A consumed hold must not be restored after successful handoff', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 2 });
      await HospitalRepository.create(hospital);

      const caseItem = createTestCase('case_handoff_test');
      await CaseRepository.create(caseItem);

      const req = await RequestLifecycleService.createRequest({
        caseId: caseItem.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Test',
        hospital,
        caseData: caseItem,
      });

      await RequestLifecycleService.acceptRequest(req.id);
      let hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(1); // 2 -> 1

      // Complete handoff
      const handoffRes = await RequestLifecycleService.completeHandoff(req.id);
      expect(handoffRes.success).toBe(true);

      // Verify hold is consumed
      const hold = await HoldRepository.get(hospital.id, req.id);
      expect(hold?.status).toBe('consumed');

      // Verify hospital ICU capacity is NOT restored
      hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(1);

      // Invariant B: Repeated handoff completion is idempotent and does not alter capacity
      const secondHandoff = await RequestLifecycleService.completeHandoff(req.id);
      expect(secondHandoff.success).toBe(true);
      hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(1);
    });

    it('Invariant C & D: Competing requests for final resource (concurrency conflict)', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 1 });
      await HospitalRepository.create(hospital);

      const c1 = createTestCase('case_compete_1');
      const c2 = createTestCase('case_compete_2');
      await CaseRepository.create(c1);
      await CaseRepository.create(c2);

      const req1 = await RequestLifecycleService.createRequest({
        caseId: c1.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Candidate 1',
        hospital,
        caseData: c1,
      });

      const req2 = await RequestLifecycleService.createRequest({
        caseId: c2.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Candidate 2',
        hospital,
        caseData: c2,
      });

      // First request accepts successfully
      const res1 = await RequestLifecycleService.acceptRequest(req1.id);
      expect(res1.success).toBe(true);

      // Second request must fail with CONCURRENCY_CONFLICT
      await expect(RequestLifecycleService.acceptRequest(req2.id)).rejects.toThrow(/Resource unavailable during acceptance/);

      const hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(0);
    });

    it('Invariant E: A released hold must actually become available again', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 1 });
      await HospitalRepository.create(hospital);

      const c1 = createTestCase('case_release_test');
      await CaseRepository.create(c1);

      const req = await RequestLifecycleService.createRequest({
        caseId: c1.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Test',
        hospital,
        caseData: c1,
      });

      await RequestLifecycleService.acceptRequest(req.id);
      let hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(0);

      // Invalidation releases the hold (e.g. ICU facility marked offline)
      const degradedHospital: Hospital = {
        ...hospital,
        icu_beds_free: 0,
        operational_status: { icu: false },
      };
      const invalidationResult = await RerouteService.handleMidTransitInvalidation(c1.id, degradedHospital);
      expect(invalidationResult.invalidated).toBe(true);

      // Hold status is released
      const hold = await HoldRepository.get(hospital.id, req.id);
      expect(hold?.status).toBe('released');

      // Resource is restored to availability
      hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(1);
    });

    it('Invariant G: Matching accounts for committed capacity exactly once without double subtraction', () => {
      const hospital = createBaseHospital({ icu_beds_free: 4 });
      const c = createTestCase('case_match_check');

      // Live matching evaluates icu_beds_free = 4
      const candidates = MatchingAdapter.rankAllCandidates(c, [hospital]);
      expect(candidates[0].eligible).toBe(true);

      // Effective capacity helper confirms no double subtraction
      const effective = ResourceHoldService.getEffectiveCapacity(hospital);
      expect(effective.icu).toBe(4);
    });

    it('Invariant H & I: Every actual hospital resource update updates last_updated_at and audit trail', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 2, last_updated_at: '2026-01-01T00:00:00.000Z' });
      await HospitalRepository.create(hospital);

      const c1 = createTestCase('case_audit_check');
      await CaseRepository.create(c1);

      const req = await RequestLifecycleService.createRequest({
        caseId: c1.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Audit Check',
        hospital,
        caseData: c1,
      });

      await RequestLifecycleService.acceptRequest(req.id);
      const hosp = await HospitalRepository.get(hospital.id);

      // last_updated_at changed from ancient 2026-01-01
      expect(hosp?.last_updated_at).not.toBe('2026-01-01T00:00:00.000Z');

      // Audit logs created for hold and acceptance
      const logs = await AuditRepository.listByCase(c1.id);
      const eventTypes = logs.map((l) => l.event_type);
      expect(eventTypes).toContain('REQUEST_ACCEPTED');
      expect(eventTypes).toContain('RESOURCE_HELD');
    });

    it('Invariant J: Freshness calculations handle timestamps consistently', () => {
      const now = Date.now();
      const freshTs = new Date(now - 4 * 60 * 1000).toISOString();
      const staleTs = new Date(now - 22 * 60 * 1000).toISOString();
      const unknownTs = new Date(now - 55 * 60 * 1000).toISOString();

      expect(classifyFreshness(freshTs, now)).toBe('fresh');
      expect(classifyFreshness(staleTs, now)).toBe('stale');
      expect(classifyFreshness(unknownTs, now)).toBe('unknown');

      expect(evaluateFreshness(freshTs, now).status).toBe('fresh');
      expect(evaluateFreshness(staleTs, now).status).toBe('stale');
      expect(evaluateFreshness(unknownTs, now).status).toBe('unknown');

      // Missing or malformed timestamp evaluates to unknown or current
      expect(classifyFreshness(null as any, now)).toBe('fresh'); // defaults to current server time if null
      expect(evaluateFreshness('', now).status).toBe('unknown');
    });

    it('Invariant L: Operational status and numeric capacity must not contradict each other', () => {
      const hospitalOffline = createBaseHospital({
        icu_beds_free: 5, // residual number
        operational_status: { icu: false }, // explicitly offline
      });

      const availability = ResourceHoldService.checkAvailability(hospitalOffline, {
        icu: 1,
        ventilator: 0,
        blood: {},
      });

      expect(availability.available).toBe(false);
      expect(availability.reason).toContain('offline');
    });

    it('Rejection after pending does not release or consume resources', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 3 });
      await HospitalRepository.create(hospital);

      const c1 = createTestCase('case_reject_check');
      await CaseRepository.create(c1);

      const req = await RequestLifecycleService.createRequest({
        caseId: c1.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Reject Check',
        hospital,
        caseData: c1,
      });

      const rejectRes = await RequestLifecycleService.rejectRequest(req.id, 'doc_1', 'hospital_user', 'No beds');
      expect(rejectRes.success).toBe(true);

      const hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(3); // Untouched
    });

    it('Timeout after pending does not release or consume resources', async () => {
      const hospital = createBaseHospital({ icu_beds_free: 3 });
      await HospitalRepository.create(hospital);

      const c1 = createTestCase('case_timeout_check');
      await CaseRepository.create(c1);

      const req = await RequestLifecycleService.createRequest({
        caseId: c1.id,
        hospitalId: hospital.id,
        attemptNumber: 1,
        matchScoreBreakdown: { capability_match_pct: 1, distance_km: 1, distance_factor: 1, load_factor: 1, freshness_factor: 1, final_score: 100 },
        reasonShownToDispatcher: 'Timeout Check',
        hospital,
        caseData: c1,
      });

      // Force expiration
      await RequestRepository.update(req.id, {
        expires_at: new Date(Date.now() - 10000) as any,
      });

      const timeoutRes = await TimeoutService.handleTimeout(req.id);
      expect(timeoutRes.success).toBe(true);
      expect(timeoutRes.request.status).toBe('timed_out');

      const hosp = await HospitalRepository.get(hospital.id);
      expect(hosp?.icu_beds_free).toBe(3); // Untouched
    });
  });
});

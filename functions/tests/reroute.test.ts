import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import {
  HospitalRepository,
  CaseRepository,
  RequestRepository,
  HoldRepository,
} from '../src/services/repositories';
import { Hospital, Case, NeedProfile } from '../src/services/types';
import { RequestLifecycleService } from '../src/routing/requestLifecycleService';
import { TimeoutService } from '../src/routing/timeoutService';
import { RerouteService } from '../src/routing/rerouteService';
import { AuditLogger } from '../src/audit/auditLogger';

describe('Part 4: Server-Authoritative Timeout & Automatic Rerouting Engine', () => {
  let mockDb: MockFirestore;

  const mockNeedProfile: NeedProfile = {
    specialists_needed: ['cardiologist'],
    capability_flags: ['ecg', 'icu'],
    blood_type_needed: null,
  };

  const mockCase: Case = {
    id: 'case_reroute_test',
    created_at: '2026-09-18T10:00:00Z',
    category: 'cardiac',
    severity: 'red',
    need_profile: mockNeedProfile,
    ambulance_location: { lat: 21.1702, lng: 72.8311 },
    incident_group_id: null,
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  };

  const hospitalA: Hospital = {
    id: 'hosp_A',
    name: 'Hospital Alpha',
    lat: 21.171,
    lng: 72.832,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist'],
    icu_beds_free: 2,
    ventilators_free: 1,
    blood_stock: {},
    er_load_score: 1,
    accepts_scheme_patients: true,
    last_updated_at: '2026-09-18T10:00:00Z',
    reliability_score: 0.9,
  };

  const hospitalB: Hospital = {
    id: 'hosp_B',
    name: 'Hospital Beta',
    lat: 21.175,
    lng: 72.835,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist'],
    icu_beds_free: 1,
    ventilators_free: 1,
    blood_stock: {},
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: '2026-09-18T10:00:00Z',
    reliability_score: 0.85,
  };

  const hospitalC: Hospital = {
    id: 'hosp_C',
    name: 'Hospital Gamma',
    lat: 21.19,
    lng: 72.85,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist'],
    icu_beds_free: 3,
    ventilators_free: 2,
    blood_stock: {},
    er_load_score: 3,
    accepts_scheme_patients: true,
    last_updated_at: '2026-09-18T10:00:00Z',
    reliability_score: 0.8,
  };

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);

    await CaseRepository.create(JSON.parse(JSON.stringify(mockCase)));
    await HospitalRepository.create(JSON.parse(JSON.stringify(hospitalA)));
    await HospitalRepository.create(JSON.parse(JSON.stringify(hospitalB)));
    await HospitalRepository.create(JSON.parse(JSON.stringify(hospitalC)));
  });

  describe('Server-Authoritative Timeout & Race Safety', () => {
    it('prevents timeout before deadline expires', async () => {
      // Create request with 30s timeout
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_reroute_test',
        hospitalId: 'hosp_A',
        attemptNumber: 1,
        matchScoreBreakdown: {
          capability_match_pct: 100,
          distance_km: 1.0,
          distance_factor: 0.95,
          load_factor: 1.0,
          staleness_factor: 1.0,
          final_score: 95.0,
        },
        reasonShownToDispatcher: 'Top candidate',
        hospital: hospitalA,
        caseData: mockCase,
        timeoutSeconds: 30,
      });

      // Immediate timeout attempt should fail
      await expect(TimeoutService.handleTimeout(req.id)).rejects.toThrow(
        'server deadline has not passed'
      );
    });

    it('transitions to timed_out when expired and auto-reroutes to next hospital', async () => {
      // Create request with 0s timeout so it is already expired
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_reroute_test',
        hospitalId: 'hosp_A',
        attemptNumber: 1,
        matchScoreBreakdown: {
          capability_match_pct: 100,
          distance_km: 1.0,
          distance_factor: 0.95,
          load_factor: 1.0,
          staleness_factor: 1.0,
          final_score: 95.0,
        },
        reasonShownToDispatcher: 'Top candidate',
        hospital: hospitalA,
        caseData: mockCase,
        timeoutSeconds: -1, // Expired immediately
      });

      const result = await TimeoutService.handleTimeout(req.id);
      expect(result.success).toBe(true);
      expect(result.request.status).toBe('timed_out');

      // Next candidate (Hospital B) should have been routed!
      expect(result.rerouteResult?.exhausted).toBe(false);
      expect(result.rerouteResult?.newRequest?.hospital_id).toBe('hosp_B');
      expect(result.rerouteResult?.newRequest?.status).toBe('pending');
      expect(result.rerouteResult?.newRequest?.attempt_number).toBe(2);

      // Verify audit events
      const logs = await AuditLogger.getCaseHistory('case_reroute_test');
      const eventTypes = logs.map((l) => l.event_type);
      expect(eventTypes).toContain('REQUEST_TIMED_OUT');
      expect(eventTypes).toContain('REROUTE_TRIGGERED');
    });

    it('handles accept / timeout race: timeout wins -> accept fails', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_reroute_test',
        hospitalId: 'hosp_A',
        attemptNumber: 1,
        matchScoreBreakdown: {
          capability_match_pct: 100,
          distance_km: 1.0,
          distance_factor: 0.95,
          load_factor: 1.0,
          staleness_factor: 1.0,
          final_score: 95.0,
        },
        reasonShownToDispatcher: 'Top candidate',
        hospital: hospitalA,
        caseData: mockCase,
        timeoutSeconds: -1,
      });

      // Timeout commits first
      await TimeoutService.handleTimeout(req.id);

      // Hospital clicks Accept afterwards -> must fail with STATE_CONFLICT
      await expect(RequestLifecycleService.acceptRequest(req.id)).rejects.toThrow(
        "current status is 'timed_out'"
      );
    });

    it('handles accept / timeout race: accept wins -> timeout fails', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_reroute_test',
        hospitalId: 'hosp_A',
        attemptNumber: 1,
        matchScoreBreakdown: {
          capability_match_pct: 100,
          distance_km: 1.0,
          distance_factor: 0.95,
          load_factor: 1.0,
          staleness_factor: 1.0,
          final_score: 95.0,
        },
        reasonShownToDispatcher: 'Top candidate',
        hospital: hospitalA,
        caseData: mockCase,
        timeoutSeconds: 30,
      });

      // Accept commits first
      await RequestLifecycleService.acceptRequest(req.id);

      // Late timeout command arriving after acceptance -> must fail with STATE_CONFLICT
      await expect(TimeoutService.handleTimeout(req.id)).rejects.toThrow(
        "status is 'accepted'"
      );
    });
  });

  describe('Reroute Execution & Candidate Exclusion Chain', () => {
    it('progresses through A (timeout) -> B (reject) -> C (accept)', async () => {
      // 1. Initial match to Hospital A
      const reroute1 = await RerouteService.rerouteCase('case_reroute_test', 'Initial routing');
      expect(reroute1.newRequest?.hospital_id).toBe('hosp_A');
      const reqA = reroute1.newRequest!;

      // 2. Hospital A times out
      await RequestRepository.update(reqA.id, { expires_at: '2020-01-01T00:00:00Z' });
      const timeoutRes = await TimeoutService.handleTimeout(reqA.id);
      expect(timeoutRes.rerouteResult?.newRequest?.hospital_id).toBe('hosp_B');
      const reqB = timeoutRes.rerouteResult?.newRequest!;

      // 3. Hospital B rejects
      await RequestLifecycleService.rejectRequest(reqB.id, 'hosp_b_staff');
      const reroute2 = await RerouteService.rerouteCase('case_reroute_test', 'Hospital B rejected');
      expect(reroute2.newRequest?.hospital_id).toBe('hosp_C');
      const reqC = reroute2.newRequest!;

      // 4. Hospital C accepts!
      const acceptC = await RequestLifecycleService.acceptRequest(reqC.id, 'hosp_c_staff');
      expect(acceptC.success).toBe(true);

      const finalCase = await CaseRepository.get('case_reroute_test');
      expect(finalCase?.status).toBe('accepted');
      expect(finalCase?.accepted_hospital_id).toBe('hosp_C');
    });

    it('transitions case to exhausted when no candidate hospitals remain', async () => {
      // 1. Route to A
      const r1 = await RerouteService.rerouteCase('case_reroute_test', 'Step 1');
      await RequestLifecycleService.rejectRequest(r1.newRequest!.id);

      // 2. Route to B
      const r2 = await RerouteService.rerouteCase('case_reroute_test', 'Step 2');
      await RequestLifecycleService.rejectRequest(r2.newRequest!.id);

      // 3. Route to C
      const r3 = await RerouteService.rerouteCase('case_reroute_test', 'Step 3');
      await RequestLifecycleService.rejectRequest(r3.newRequest!.id);

      // 4. All 3 hospitals attempted! Next reroute must mark case exhausted.
      const r4 = await RerouteService.rerouteCase('case_reroute_test', 'Step 4');
      expect(r4.exhausted).toBe(true);
      expect(r4.newRequest).toBeNull();

      const finalCase = await CaseRepository.get('case_reroute_test');
      expect(finalCase?.status).toBe('exhausted');

      const auditTrail = await AuditLogger.getCaseHistory('case_reroute_test');
      const exhaustLog = auditTrail.find((a) => a.metadata?.result === 'exhausted');
      expect(exhaustLog).toBeDefined();
    });
  });

  describe('Mid-Transit Capability Invalidation', () => {
    it('supersedes active commitment, releases hold, and reroutes immediately', async () => {
      // 1. Initial route to A and accept
      const r1 = await RerouteService.rerouteCase('case_reroute_test', 'Initial');
      await RequestLifecycleService.acceptRequest(r1.newRequest!.id);

      let hospA = await HospitalRepository.get('hosp_A');
      expect(hospA?.icu_beds_free).toBe(1); // 2 -> 1

      // 2. Mid-transit invalidation triggered
      const diversionResult = await RerouteService.handleMidTransitInvalidation(
        'case_reroute_test',
        'Hospital A power failure'
      );

      // 3. Hospital A's hold must be released
      hospA = await HospitalRepository.get('hosp_A');
      expect(hospA?.icu_beds_free).toBe(2); // Restored!

      // 4. Request A must be superseded
      const reqA = await RequestRepository.get(r1.newRequest!.id);
      expect(reqA?.status).toBe('superseded');

      // 5. New request created for Hospital B
      expect(diversionResult.newRequest?.hospital_id).toBe('hosp_B');
      expect(diversionResult.newRequest?.status).toBe('pending');
    });
  });
});

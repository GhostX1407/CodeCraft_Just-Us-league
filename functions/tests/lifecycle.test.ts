import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import {
  HospitalRepository,
  CaseRepository,
  RequestRepository,
  HoldRepository,
} from '../src/services/repositories';
import {
  Hospital,
  Case,
  NeedProfile,
  MatchScoreBreakdown,
} from '../src/services/types';
import { ResourceHoldService } from '../src/resources/resourceHoldService';
import {
  RequestLifecycleService,
  RequestLifecycleError,
} from '../src/routing/requestLifecycleService';
import { AuditLogger } from '../src/audit/auditLogger';

describe('Part 3: Request Lifecycle & Concurrency-Safe Resource Holds', () => {
  let mockDb: MockFirestore;

  const mockHospital: Hospital = {
    id: 'hosp_apex',
    name: 'Apex Super Specialty',
    lat: 21.1702,
    lng: 72.8311,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'orthopedist'],
    icu_beds_free: 1, // Only 1 ICU bed free for concurrency testing!
    ventilators_free: 2,
    blood_stock: { 'O-': 2, 'A+': 10 },
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: '2026-09-18T10:00:00Z',
    reliability_score: 0.94,
  };

  const mockNeedProfile: NeedProfile = {
    specialists_needed: ['cardiologist'],
    capability_flags: ['ecg', 'icu'],
    blood_type_needed: 'O-',
  };

  const mockCase: Case = {
    id: 'case_c1',
    created_at: '2026-09-18T10:05:00Z',
    category: 'cardiac',
    severity: 'red',
    need_profile: mockNeedProfile,
    ambulance_location: { lat: 21.1632, lng: 72.8398 },
    incident_group_id: null,
    status: 'routing',
    active_request_id: null,
    attempt_number: 1,
  };

  const mockMatchScore: MatchScoreBreakdown = {
    capability_match_pct: 100,
    distance_km: 3.5,
    distance_factor: 0.89,
    load_factor: 0.88,
    staleness_factor: 1.0,
    final_score: 78.3,
  };

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);

    await HospitalRepository.create(JSON.parse(JSON.stringify(mockHospital)));
    await CaseRepository.create(JSON.parse(JSON.stringify(mockCase)));
  });

  describe('ResourceHoldService calculations & validation', () => {
    it('calculates correct resource requirements from need profile', () => {
      const requirements = ResourceHoldService.calculateRequirements(mockNeedProfile);
      expect(requirements.icu).toBe(1);
      expect(requirements.ventilator).toBe(0);
      expect(requirements.blood).toEqual({ 'O-': 1 });
    });

    it('validates availability and flags deficits', () => {
      const hosp = JSON.parse(JSON.stringify(mockHospital)) as Hospital;
      const reqs = ResourceHoldService.calculateRequirements(mockNeedProfile);

      expect(ResourceHoldService.checkAvailability(hosp, reqs).available).toBe(true);

      // Deficit in ICU
      hosp.icu_beds_free = 0;
      const icuCheck = ResourceHoldService.checkAvailability(hosp, reqs);
      expect(icuCheck.available).toBe(false);
      expect(icuCheck.reason).toContain('Insufficient ICU beds');

      // Deficit in blood
      hosp.icu_beds_free = 2;
      hosp.blood_stock['O-'] = 0;
      const bloodCheck = ResourceHoldService.checkAvailability(hosp, reqs);
      expect(bloodCheck.available).toBe(false);
      expect(bloodCheck.reason).toContain('Insufficient blood stock for O-');
    });

    it('decrements and releases countable resources', () => {
      const hosp = JSON.parse(JSON.stringify(mockHospital)) as Hospital;
      const reqs = ResourceHoldService.calculateRequirements(mockNeedProfile);

      ResourceHoldService.applyDecrement(hosp, reqs);
      expect(hosp.icu_beds_free).toBe(0);
      expect(hosp.blood_stock['O-']).toBe(1);

      ResourceHoldService.applyRelease(hosp, reqs);
      expect(hosp.icu_beds_free).toBe(1);
      expect(hosp.blood_stock['O-']).toBe(2);
    });
  });

  describe('Request Creation', () => {
    it('creates a pending request and updates case status to routing', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Cardiologist available, ICU free, 3.5 km away',
        hospital: mockHospital,
        caseData: mockCase,
      });

      expect(req.id).toBeDefined();
      expect(req.status).toBe('pending');
      expect(req.attempt_number).toBe(1);

      const updatedCase = await CaseRepository.get('case_c1');
      expect(updatedCase?.status).toBe('routing');
      expect(updatedCase?.active_request_id).toBe(req.id);
    });

    it('prevents creating duplicate pending request for the same case', async () => {
      await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Cardiologist available, ICU free',
        hospital: mockHospital,
        caseData: mockCase,
      });

      await expect(
        RequestLifecycleService.createRequest({
          caseId: 'case_c1',
          hospitalId: 'hosp_apex',
          attemptNumber: 2,
          matchScoreBreakdown: mockMatchScore,
          reasonShownToDispatcher: 'Second request',
          hospital: mockHospital,
          caseData: mockCase,
        })
      ).rejects.toThrow('already has an active pending request');
    });
  });

  describe('Transactional Acceptance', () => {
    it('accepts request, decrements resources, creates hold, and updates case', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Apex Hospital Match',
        hospital: mockHospital,
        caseData: mockCase,
      });

      const result = await RequestLifecycleService.acceptRequest(req.id, 'dr_sharma');

      expect(result.success).toBe(true);
      expect(result.request.status).toBe('accepted');
      expect(result.hold).toBeDefined();
      expect(result.hold?.status).toBe('active');
      expect(result.hold?.resources.icu).toBe(1);
      expect(result.hold?.resources.blood['O-']).toBe(1);

      // Verify hospital counts were decremented
      const updatedHosp = await HospitalRepository.get('hosp_apex');
      expect(updatedHosp?.icu_beds_free).toBe(0); // 1 -> 0
      expect(updatedHosp?.blood_stock['O-']).toBe(1); // 2 -> 1

      // Verify case status is accepted
      const updatedCase = await CaseRepository.get('case_c1');
      expect(updatedCase?.status).toBe('accepted');
      expect(updatedCase?.accepted_hospital_id).toBe('hosp_apex');

      // Verify audit events recorded
      const auditTrail = await AuditLogger.getCaseHistory('case_c1');
      const eventTypes = auditTrail.map((a) => a.event_type);
      expect(eventTypes).toContain('REQUEST_ACCEPTED');
      expect(eventTypes).toContain('RESOURCE_HELD');
    });

    it('handles idempotent duplicate accept calls gracefully', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Apex Hospital Match',
        hospital: mockHospital,
        caseData: mockCase,
      });

      const firstAccept = await RequestLifecycleService.acceptRequest(req.id);
      expect(firstAccept.success).toBe(true);

      // Second click on Accept button
      const secondAccept = await RequestLifecycleService.acceptRequest(req.id);
      expect(secondAccept.success).toBe(true);
      expect(secondAccept.request.status).toBe('accepted');

      // Resources should NOT have been decremented twice!
      const hosp = await HospitalRepository.get('hosp_apex');
      expect(hosp?.icu_beds_free).toBe(0);
    });

    it('protects against double allocation when two cases compete for the last ICU bed', async () => {
      // Case 2 also requiring ICU
      const mockCase2: Case = {
        ...mockCase,
        id: 'case_c2',
      };
      await CaseRepository.create(mockCase2);

      // Request 1 for Case 1
      const req1 = await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Case 1',
        hospital: mockHospital,
        caseData: mockCase,
      });

      // Request 2 for Case 2
      const req2 = await RequestLifecycleService.createRequest({
        caseId: 'case_c2',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Case 2',
        hospital: mockHospital,
        caseData: mockCase2,
      });

      // Hospital only has 1 ICU bed. Request 1 claims it first.
      const accept1 = await RequestLifecycleService.acceptRequest(req1.id);
      expect(accept1.success).toBe(true);

      // Request 2 tries to accept but ICU is now 0! Must fail with CONCURRENCY_CONFLICT
      await expect(RequestLifecycleService.acceptRequest(req2.id)).rejects.toThrow(
        'Insufficient ICU beds'
      );

      // Confirm Case 2 was not accepted
      const c2 = await CaseRepository.get('case_c2');
      expect(c2?.status).toBe('routing');

      // Confirm ICU bed is 0 (not negative!)
      const hosp = await HospitalRepository.get('hosp_apex');
      expect(hosp?.icu_beds_free).toBe(0);
    });
  });

  describe('Rejection & Hold Release', () => {
    it('rejects a pending request without decrementing resources', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Test',
        hospital: mockHospital,
        caseData: mockCase,
      });

      const rejectResult = await RequestLifecycleService.rejectRequest(
        req.id,
        'dr_patel',
        'hospital_user',
        'ER at capacity'
      );
      expect(rejectResult.success).toBe(true);
      expect(rejectResult.request.status).toBe('rejected');

      // Resources remain intact
      const hosp = await HospitalRepository.get('hosp_apex');
      expect(hosp?.icu_beds_free).toBe(1);

      // Audit event
      const auditTrail = await AuditLogger.getCaseHistory('case_c1');
      expect(auditTrail.some((a) => a.event_type === 'REQUEST_REJECTED')).toBe(true);
    });

    it('supersedes a request and safely releases any held resources', async () => {
      const req = await RequestLifecycleService.createRequest({
        caseId: 'case_c1',
        hospitalId: 'hosp_apex',
        attemptNumber: 1,
        matchScoreBreakdown: mockMatchScore,
        reasonShownToDispatcher: 'Test',
        hospital: mockHospital,
        caseData: mockCase,
      });

      // Accept first
      await RequestLifecycleService.acceptRequest(req.id);
      let hosp = await HospitalRepository.get('hosp_apex');
      expect(hosp?.icu_beds_free).toBe(0);

      // Mid-transit invalidation: supersede request
      const superseded = await RequestLifecycleService.supersedeRequest(
        req.id,
        'Mid-transit diversion'
      );
      expect(superseded.status).toBe('superseded');

      // Hold should be marked released
      const hold = await HoldRepository.get('hosp_apex', req.id);
      expect(hold?.status).toBe('released');

      // Resources should be restored back to hospital
      hosp = await HospitalRepository.get('hosp_apex');
      expect(hosp?.icu_beds_free).toBe(1);

      // Audit event
      const auditTrail = await AuditLogger.getCaseHistory('case_c1');
      expect(auditTrail.some((a) => a.event_type === 'RESOURCE_RELEASED')).toBe(true);
      expect(auditTrail.some((a) => a.event_type === 'REQUEST_SUPERSEDED')).toBe(true);
    });
  });
});

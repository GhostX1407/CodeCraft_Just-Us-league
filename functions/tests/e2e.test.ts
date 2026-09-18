import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import { seedAllDemoData } from '../src/data/seedData';
import {
  CaseRepository,
  HospitalRepository,
  RequestRepository,
  HoldRepository,
  AuditRepository,
} from '../src/services/repositories';
import { Case, NeedProfile } from '../src/services/types';
import { generateNeedProfile } from '../src/index';
import { MatchingAdapter } from '../src/services/matchingAdapter';
import { RequestLifecycleService } from '../src/routing/requestLifecycleService';
import { TimeoutService } from '../src/routing/timeoutService';
import { RerouteService } from '../src/routing/rerouteService';
import { AdminService } from '../src/services/adminService';
import { ExplanationService } from '../src/ai/explanationService';

describe('Part 8: End-to-End Vertical Slice Integration', () => {
  let mockDb: MockFirestore;

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);

    // Seed the database with the canonical demo dataset
    await seedAllDemoData();
  });

  it('Slice 1 (Clean Match): Case -> Need Profile -> Match -> Request -> Accept -> Resource Hold', async () => {
    // 1. Ambulance creates cardiac case
    const needProfile = generateNeedProfile('cardiac');
    expect(needProfile.specialists_needed).toContain('cardiologist');
    expect(needProfile.capability_flags).toContain('icu');

    const newCase: Case = {
      id: 'case_live_slice_1',
      created_at: new Date().toISOString(),
      category: 'cardiac',
      severity: 'red',
      need_profile: needProfile,
      vitals_summary: 'Crushing chest pain, BP 100/60',
      incident_group_id: null,
      ambulance_location: { lat: 21.1702, lng: 72.8311 },
      status: 'routing',
      active_request_id: null,
      attempt_number: 0,
    };
    await CaseRepository.create(newCase);

    // 2. Perform Match
    const allHospitals = await HospitalRepository.listAll();
    const ranked = MatchingAdapter.rankEligibleCandidates(newCase, allHospitals);
    expect(ranked.length).toBeGreaterThan(0);

    const topCandidate = ranked[0];
    expect(topCandidate.eligible).toBe(true);

    // 3. Create Request
    const initialIcuBeds = topCandidate.hospital.icu_beds_free;
    const request = await RequestLifecycleService.createRequest({
      caseId: newCase.id,
      hospitalId: topCandidate.hospital.id,
      attemptNumber: 1,
      matchScoreBreakdown: topCandidate.breakdown,
      reasonShownToDispatcher: topCandidate.reason,
      hospital: topCandidate.hospital,
      caseData: newCase,
    });
    expect(request.status).toBe('pending');

    // 4. Hospital Accepts
    const acceptResult = await RequestLifecycleService.acceptRequest(
      request.id,
      'hospital_reception_demo'
    );
    expect(acceptResult.success).toBe(true);
    expect(acceptResult.request.status).toBe('accepted');

    // 5. Verify Resource Hold & Hospital Decrement
    const updatedHospital = await HospitalRepository.get(topCandidate.hospital.id);
    expect(updatedHospital?.icu_beds_free).toBe(initialIcuBeds - 1);

    const hold = await HoldRepository.get(topCandidate.hospital.id, request.id);
    expect(hold).not.toBeNull();
    expect(hold?.status).toBe('active');
    expect(hold?.resources.icu).toBe(1);

    // 6. Verify Ambulance Observes Accepted Destination
    const finalCase = await CaseRepository.get(newCase.id);
    expect(finalCase?.status).toBe('accepted');
    expect(finalCase?.accepted_hospital_id).toBe(topCandidate.hospital.id);
  });

  it('Slice 2 (Failure Path): Reject -> Auto-Reroute -> Next Hospital', async () => {
    const needProfile = generateNeedProfile('trauma');
    const traumaCase: Case = {
      id: 'case_live_slice_2',
      created_at: new Date().toISOString(),
      category: 'trauma',
      severity: 'red',
      need_profile: needProfile,
      ambulance_location: { lat: 21.1825, lng: 72.8198 },
      incident_group_id: null,
      status: 'routing',
      active_request_id: null,
      attempt_number: 0,
    };
    await CaseRepository.create(traumaCase);

    // Initial match
    const r1 = await RerouteService.rerouteCase(traumaCase.id, 'Initial routing');
    expect(r1.newRequest).not.toBeNull();
    const firstHospitalId = r1.newRequest!.hospital_id;

    // Hospital rejects
    await RequestLifecycleService.rejectRequest(
      r1.newRequest!.id,
      'staff_1',
      'hospital_user',
      'Operating theater full'
    );

    // Trigger auto-reroute
    const r2 = await RerouteService.rerouteCase(traumaCase.id, 'Rejected by first hospital');
    expect(r2.newRequest).not.toBeNull();
    expect(r2.newRequest?.hospital_id).not.toBe(firstHospitalId); // First hospital excluded!
    expect(r2.newRequest?.attempt_number).toBe(2);
  });

  it('Slice 3 (Timeout Path): Timeout -> Auto-Reroute', async () => {
    const needProfile = generateNeedProfile('cardiac');
    const caseData: Case = {
      id: 'case_live_slice_3',
      created_at: new Date().toISOString(),
      category: 'cardiac',
      severity: 'red',
      need_profile: needProfile,
      ambulance_location: { lat: 21.1702, lng: 72.8311 },
      incident_group_id: null,
      status: 'routing',
      active_request_id: null,
      attempt_number: 0,
    };
    await CaseRepository.create(caseData);

    const r1 = await RerouteService.rerouteCase(caseData.id, 'Initial routing');
    const req1 = r1.newRequest!;

    // Simulate expiration
    await RequestRepository.update(req1.id, { expires_at: '2020-01-01T00:00:00Z' });

    // Handle timeout
    const timeoutRes = await TimeoutService.handleTimeout(req1.id);
    expect(timeoutRes.success).toBe(true);
    expect(timeoutRes.request.status).toBe('timed_out');
    expect(timeoutRes.rerouteResult?.newRequest).not.toBeNull();
    expect(timeoutRes.rerouteResult?.newRequest?.hospital_id).not.toBe(req1.hospital_id);
  });

  it('Slice 4 (Admin Oversight & Explanation): Overview & Forensic Logs', async () => {
    // 1. Admin overview reflects hospitals
    const overview = await AdminService.getHospitalNetworkOverview();
    expect(overview.length).toBe(12);

    // 2. Audit logs exist
    const recentLogs = await AuditRepository.listRecent(10);
    expect(recentLogs.length).toBeGreaterThan(0);

    // 3. Explanation service generates clean explanation
    const explanation = await ExplanationService.explainMatch({
      hospitalName: overview[0].hospital.name,
      category: 'cardiac',
      severity: 'red',
      breakdown: {
        capability_match_pct: 100,
        distance_km: 2.5,
        distance_factor: 0.9,
        load_factor: 0.88,
        staleness_factor: 1.0,
        final_score: 79.2,
      },
      specialistsMatched: ['cardiologist'],
      capabilitiesMatched: ['ecg', 'icu'],
      distanceKm: 2.5,
      erLoadScore: 2,
      freshness: overview[0].freshness,
    });

    expect(explanation.explanation).toBeDefined();
    expect(explanation.source).toBe('deterministic');
  });
});

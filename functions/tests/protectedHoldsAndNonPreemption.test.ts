/**
 * Integration Tests: Protected Resource Holds, Non-Preemption & Complete Handoff
 * 
 * Verifies:
 * 1. Transactional acceptance holds resources atomically
 * 2. Case A accepts last ICU bed -> Case B attempting acceptance fails with CONCURRENCY_CONFLICT
 * 3. Non-Preemption: Case B with higher severity ('red') cannot steal Case A's existing commitment ('yellow')
 * 4. Hold Lifecycle: completeHandoff transitions hold to 'consumed', does NOT restore free resources, and marks reliability 'honored'
 */

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
  RequestLifecycleService,
  RequestLifecycleError,
} from '../src/routing/requestLifecycleService';
import { ReliabilityService } from '../src/reliability/reliabilityService';
import { Hospital, Case, Request } from '../src/services/types';
import { generateNeedProfile } from '../src/domain/needProfile';

describe('Protected Resource Reservation, Non-Preemption & Hold Lifecycle', () => {
  let mockDb: MockFirestore;
  let testHospital: Hospital;
  let caseA: Case;
  let caseB: Case;

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);


    // Hospital with EXACTLY 1 ICU bed
    testHospital = {
      id: 'hosp_solo_icu',
      name: 'Solo ICU Hospital',
      lat: 21.1702,
      lng: 72.8311,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist', 'anesthetist'],
      icu_beds_free: 1, // Only 1 bed!
      ventilators_free: 1,
      blood_stock: { 'O-': 2 },
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: new Date().toISOString(),
      reliability_score: 1.0,
    };
    await HospitalRepository.create(testHospital);

    // Case A: Severity 'yellow' (moderate cardiac need)
    caseA = {
      id: 'case_patient_A_yellow',
      category: 'cardiac',
      severity: 'yellow',
      need_profile: generateNeedProfile('cardiac', 'yellow'),
      incident_group_id: null,
      ambulance_location: { lat: 21.171, lng: 72.83 },
      status: 'routing',
      attempt_number: 0,
    };
    await CaseRepository.create(caseA);

    // Case B: Severity 'red' (critical trauma/cardiac need arriving shortly after)
    caseB = {
      id: 'case_patient_B_red',
      category: 'cardiac',
      severity: 'red',
      need_profile: generateNeedProfile('cardiac', 'red'),
      incident_group_id: null,
      ambulance_location: { lat: 21.172, lng: 72.832 },
      status: 'routing',
      attempt_number: 0,
    };
    await CaseRepository.create(caseB);
  });

  it('proves Case A reserves the last ICU bed and Case B cannot steal it despite higher severity', async () => {
    // 1. Create request for Case A (yellow severity)
    const reqA = await RequestLifecycleService.createRequest({
      caseId: caseA.id,
      hospitalId: testHospital.id,
      attemptNumber: 1,
      matchScoreBreakdown: {
        capability_match_pct: 100,
        distance_km: 1.2,
        distance_factor: 0.8,
        load_factor: 0.88,
        freshness_factor: 1.0,
        final_score: 70.4,
      },
      reasonShownToDispatcher: 'First matching facility',
      hospital: testHospital,
      caseData: caseA,
    });

    // 2. Case A is accepted by hospital
    const acceptResA = await RequestLifecycleService.acceptRequest(reqA.id, 'hospital_staff');
    expect(acceptResA.success).toBe(true);

    // Hospital ICU free beds must decrement from 1 to 0
    const hospAfterA = await HospitalRepository.get(testHospital.id);
    expect(hospAfterA?.icu_beds_free).toBe(0);

    // Active hold must exist for Case A
    const holdA = await HoldRepository.get(testHospital.id, reqA.id);
    expect(holdA).toBeDefined();
    expect(holdA?.status).toBe('active');
    expect(holdA?.resources.icu).toBe(1);

    // 3. Create request for Case B (RED severity)
    const reqB = await RequestLifecycleService.createRequest({
      caseId: caseB.id,
      hospitalId: testHospital.id,
      attemptNumber: 1,
      matchScoreBreakdown: {
        capability_match_pct: 100,
        distance_km: 1.0,
        distance_factor: 0.83,
        load_factor: 0.88,
        freshness_factor: 1.0,
        final_score: 73.0,
      },
      reasonShownToDispatcher: 'Closest hospital for severe case',
      hospital: hospAfterA!,
      caseData: caseB,
    });

    // 4. Hospital attempts to accept Case B -> MUST FAIL with CONCURRENCY_CONFLICT
    // Severity does NOT authorize preemption of Case A's commitment!
    await expect(
      RequestLifecycleService.acceptRequest(reqB.id, 'hospital_staff')
    ).rejects.toThrow(RequestLifecycleError);

    await expect(
      RequestLifecycleService.acceptRequest(reqB.id, 'hospital_staff')
    ).rejects.toThrow(/CONCURRENCY_CONFLICT|Insufficient ICU beds/);

    // Verify Case A's commitment and hold remain 100% intact
    const finalHosp = await HospitalRepository.get(testHospital.id);
    expect(finalHosp?.icu_beds_free).toBe(0);

    const verifiedHoldA = await HoldRepository.get(testHospital.id, reqA.id);
    expect(verifiedHoldA?.status).toBe('active');

    const verifiedCaseA = await CaseRepository.get(caseA.id);
    expect(verifiedCaseA?.status).toBe('accepted');
    expect(verifiedCaseA?.accepted_hospital_id).toBe(testHospital.id);
  });

  it('completes handoff lifecycle: marks hold consumed, does NOT restore free resources, and records reliability honored', async () => {
    // 1. Accept Case A
    const reqA = await RequestLifecycleService.createRequest({
      caseId: caseA.id,
      hospitalId: testHospital.id,
      attemptNumber: 1,
      matchScoreBreakdown: {
        capability_match_pct: 100,
        distance_km: 1.0,
        distance_factor: 0.8,
        load_factor: 0.88,
        freshness_factor: 1.0,
        final_score: 70.4,
      },
      reasonShownToDispatcher: 'Matched',
      hospital: testHospital,
      caseData: caseA,
    });
    await RequestLifecycleService.acceptRequest(reqA.id);

    // Verify hospital has 0 free beds
    let hosp = await HospitalRepository.get(testHospital.id);
    expect(hosp?.icu_beds_free).toBe(0);

    // 2. Patient arrives: Complete handoff
    const handoffRes = await RequestLifecycleService.completeHandoff(reqA.id, 'nurse_reception');
    expect(handoffRes.success).toBe(true);
    expect(handoffRes.caseData.status).toBe('completed');
    expect(handoffRes.hold?.status).toBe('consumed');

    // CRITICAL: Consumed resources are NOT released back to availability
    hosp = await HospitalRepository.get(testHospital.id);
    expect(hosp?.icu_beds_free).toBe(0); // Still 0, occupied by arrived patient!

    // Reliability score must record commitment as honored
    const reliability = await ReliabilityService.getHospitalReliability(testHospital.id);
    expect(reliability.accepted_commitments).toBe(1);
    expect(reliability.honored_commitments).toBe(1);
    expect(reliability.reliability_score).toBe(1.0);
  });
});

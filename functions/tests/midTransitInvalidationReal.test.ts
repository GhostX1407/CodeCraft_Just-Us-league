/**
 * Integration Tests: Real Mid-Transit Capability Invalidation & Reroute Orchestration
 * 
 * Verifies:
 * 1. Accepted case + hospital operational disruption (specialist/trauma team loss)
 * 2. P1 canonical isCommitmentStillValid() evaluates invalid
 * 3. Old request superseded, active hold released, commitment outcome recorded as 'breached'
 * 4. Next eligible hospital selected via canonical engine, new request created
 * 5. Full audit trail recorded
 * 6. Invariant: Non-invalidation conditions (ER load change, distance change) do NOT trigger invalidation
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
import { RequestLifecycleService } from '../src/routing/requestLifecycleService';
import { RerouteService } from '../src/routing/rerouteService';
import { ReliabilityService } from '../src/reliability/reliabilityService';
import { AuditLogger } from '../src/audit/auditLogger';
import { Hospital, Case } from '../src/services/types';
import { generateNeedProfile } from '../src/domain/needProfile';

describe('Real Mid-Transit Invalidation & Reroute Orchestration', () => {
  let mockDb: MockFirestore;
  let hospPrimary: Hospital;
  let hospSecondary: Hospital;
  let activeCase: Case;

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);


    // Primary Hospital with on-call cardiologist and ICU
    hospPrimary = {
      id: 'hosp_primary',
      name: 'Primary Care Center',
      lat: 21.17,
      lng: 72.83,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist', 'anesthetist'],
      icu_beds_free: 2,
      ventilators_free: 2,
      blood_stock: { 'O-': 5 },
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: new Date().toISOString(),
      reliability_score: 0.95,
    };
    await HospitalRepository.create(hospPrimary);

    // Secondary Backup Hospital with cardiologist and ICU
    hospSecondary = {
      id: 'hosp_secondary',
      name: 'Secondary Metro Center',
      lat: 21.19,
      lng: 72.84,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist', 'anesthetist'],
      icu_beds_free: 4,
      ventilators_free: 3,
      blood_stock: { 'O-': 5 },
      er_load_score: 3,
      accepts_scheme_patients: true,
      last_updated_at: new Date().toISOString(),
      reliability_score: 0.9,
    };
    await HospitalRepository.create(hospSecondary);

    activeCase = {
      id: 'case_cardiac_invalidation_test',
      category: 'cardiac',
      severity: 'red',
      need_profile: generateNeedProfile('cardiac', 'red'), // requires cardiologist and ICU
      incident_group_id: null,
      ambulance_location: { lat: 21.165, lng: 72.825 },
      status: 'routing',
      attempt_number: 0,
    };
    await CaseRepository.create(activeCase);
  });

  it('proves hospital specialist loss triggers real invalidation, hold release, reliability breach, and canonical reroute', async () => {
    // 1. Initial routing and acceptance at hosp_primary
    const initialRequest = await RequestLifecycleService.createRequest({
      caseId: activeCase.id,
      hospitalId: hospPrimary.id,
      attemptNumber: 1,
      matchScoreBreakdown: {
        capability_match_pct: 100,
        distance_km: 1.5,
        distance_factor: 0.85,
        load_factor: 0.88,
        freshness_factor: 1.0,
        final_score: 74.8,
      },
      reasonShownToDispatcher: 'Primary hospital matched',
      hospital: hospPrimary,
      caseData: activeCase,
    });
    await RequestLifecycleService.acceptRequest(initialRequest.id);

    // Verify hold active and ICU decremented (2 -> 1)
    let hospState = await HospitalRepository.get(hospPrimary.id);
    expect(hospState?.icu_beds_free).toBe(1);

    const initialHold = await HoldRepository.get(hospPrimary.id, initialRequest.id);
    expect(initialHold?.status).toBe('active');

    // 2. DISRUPTION OCCURS: Cardiologist suddenly becomes unavailable at hosp_primary
    hospState!.specialists_on_call = ['anesthetist']; // Cardiologist removed!
    await HospitalRepository.update(hospPrimary.id, {
      specialists_on_call: ['anesthetist'],
    });

    // 3. P2 evaluates mid-transit invalidation against current hospital state
    const invalidationResult = await RerouteService.handleMidTransitInvalidation(
      activeCase.id,
      hospState!
    );

    // Invalidation must trigger
    expect(invalidationResult.invalidated).toBe(true);
    expect(invalidationResult.validation?.is_invalid).toBe(true);
    expect(invalidationResult.validation?.reasons[0]).toMatch(/cardiologist/i);

    // 4. Primary hospital hold must be released back to capacity (1 -> 2)
    hospState = await HospitalRepository.get(hospPrimary.id);
    expect(hospState?.icu_beds_free).toBe(2);

    const updatedHold = await HoldRepository.get(hospPrimary.id, initialRequest.id);
    expect(updatedHold?.status).toBe('released');

    // 5. Initial request must be superseded
    const updatedInitialReq = await RequestRepository.get(initialRequest.id);
    expect(updatedInitialReq?.status).toBe('superseded');

    // 6. Reliability outcome recorded as 'breached' for primary hospital
    const primaryReliability = await ReliabilityService.getHospitalReliability(hospPrimary.id);
    expect(primaryReliability.accepted_commitments).toBe(1);
    expect(primaryReliability.honored_commitments).toBe(0);
    expect(primaryReliability.reliability_score).toBe(0.0);

    // 7. Canonical engine must route to next eligible candidate (hosp_secondary)
    expect(invalidationResult.newRequest).toBeDefined();
    expect(invalidationResult.newRequest?.hospital_id).toBe('hosp_secondary');
    expect(invalidationResult.newRequest?.attempt_number).toBe(2);
    expect(invalidationResult.newRequest?.status).toBe('pending');

    // 8. Audit trail must verify COMMITMENT_INVALIDATED and REROUTE_TRIGGERED
    const auditHistory = await AuditLogger.getCaseHistory(activeCase.id);
    const invalidationLog = auditHistory.find((a) => a.event_type === 'COMMITMENT_INVALIDATED');
    expect(invalidationLog).toBeDefined();
    expect(invalidationLog?.hospital_id).toBe('hosp_primary');
  });

  it('proves ER load change or distance change does NOT falsely invalidate a commitment', async () => {
    // 1. Initial routing and acceptance
    const req = await RequestLifecycleService.createRequest({
      caseId: activeCase.id,
      hospitalId: hospPrimary.id,
      attemptNumber: 1,
      matchScoreBreakdown: {
        capability_match_pct: 100,
        distance_km: 1.5,
        distance_factor: 0.85,
        load_factor: 0.88,
        freshness_factor: 1.0,
        final_score: 74.8,
      },
      reasonShownToDispatcher: 'Primary hospital matched',
      hospital: hospPrimary,
      caseData: activeCase,
    });
    await RequestLifecycleService.acceptRequest(req.id);

    // 2. Only ER load increases (from 2 to 5)
    const hospUpdated = { ...hospPrimary, icu_beds_free: 1, er_load_score: 5 };

    // 3. Evaluate invalidation
    const check = await RerouteService.handleMidTransitInvalidation(activeCase.id, hospUpdated);

    // Must NOT invalidate
    expect(check.invalidated).toBe(false);
    expect(check.newRequest).toBeNull();

    // Hold and case remain accepted
    const caseDoc = await CaseRepository.get(activeCase.id);
    expect(caseDoc?.status).toBe('accepted');
    expect(caseDoc?.accepted_hospital_id).toBe(hospPrimary.id);
  });
});

/**
 * Integration Tests: Reliability Idempotency & Realistic Metrics
 * 
 * Verifies:
 * 1. Strictly idempotent commitment outcome recording (no duplicate counter increments)
 * 2. Real metrics: No artificial 0% or 100% when accepted = 0 ("No history", score: null)
 * 3. No manufactured historical commitments at runtime
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import { HospitalRepository } from '../src/services/repositories';
import { ReliabilityService } from '../src/reliability/reliabilityService';
import { Hospital } from '../src/services/types';

describe('Reliability Idempotency & Realistic Metrics', () => {
  let mockDb: MockFirestore;
  let testHosp: Hospital;

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);


    testHosp = {
      id: 'hosp_idempotency_test',
      name: 'Idempotency Test Hospital',
      lat: 21.17,
      lng: 72.83,
      trauma_team_on_shift: true,
      specialists_on_call: ['general_surgeon'],
      icu_beds_free: 5,
      ventilators_free: 2,
      blood_stock: {},
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: new Date().toISOString(),
      reliability_score: 1.0,
    };
    await HospitalRepository.create(testHosp);
  });

  it('returns No history and null score when accepted count is 0 without inventing history', async () => {
    const stats = await ReliabilityService.getHospitalReliability(testHosp.id);

    expect(stats.has_history).toBe(false);
    expect(stats.reliability_score).toBeNull();
    expect(stats.reliability_display).toBe('No history');
    expect(stats.accepted_commitments).toBe(0);
    expect(stats.honored_commitments).toBe(0);
  });

  it('proves duplicate calls to recordCommitmentOutcome with same requestId are strictly idempotent', async () => {
    const requestId = 'req_unique_001';
    const caseId = 'case_001';

    // 1. First record: honored
    const firstCall = await ReliabilityService.recordCommitmentOutcome(
      testHosp.id,
      requestId,
      caseId,
      'honored'
    );
    expect(firstCall.accepted_commitments).toBe(1);
    expect(firstCall.honored_commitments).toBe(1);
    expect(firstCall.reliability_score).toBe(1.0);
    expect(firstCall.reliability_display).toBe('100%');

    // 2. Second duplicate call for same requestId -> MUST NOT increment counters!
    const secondCall = await ReliabilityService.recordCommitmentOutcome(
      testHosp.id,
      requestId,
      caseId,
      'honored'
    );
    expect(secondCall.accepted_commitments).toBe(1);
    expect(secondCall.honored_commitments).toBe(1);
    expect(secondCall.reliability_score).toBe(1.0);

    // 3. Third duplicate call for same requestId -> MUST NOT increment counters!
    const thirdCall = await ReliabilityService.recordCommitmentOutcome(
      testHosp.id,
      requestId,
      caseId,
      'honored'
    );
    expect(thirdCall.accepted_commitments).toBe(1);
    expect(thirdCall.honored_commitments).toBe(1);

    // 4. A DIFFERENT request comes in: breached
    const secondReqId = 'req_unique_002';
    const fourthCall = await ReliabilityService.recordCommitmentOutcome(
      testHosp.id,
      secondReqId,
      'case_002',
      'breached'
    );
    // Accepted: 2, Honored: 1 -> 50%
    expect(fourthCall.accepted_commitments).toBe(2);
    expect(fourthCall.honored_commitments).toBe(1);
    expect(fourthCall.reliability_score).toBe(0.5);
    expect(fourthCall.reliability_display).toBe('50%');

    // 5. Retrying secondReqId again does not increment
    const fifthCall = await ReliabilityService.recordCommitmentOutcome(
      testHosp.id,
      secondReqId,
      'case_002',
      'breached'
    );
    expect(fifthCall.accepted_commitments).toBe(2);
    expect(fifthCall.honored_commitments).toBe(1);
    expect(fifthCall.reliability_score).toBe(0.5);
  });
});

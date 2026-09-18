import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import { AuditLogger, AUDIT_EVENT_TYPES, captureDecisionSnapshot } from '../src/audit/auditLogger';
import { Case, Hospital, NeedProfile, MatchScoreBreakdown } from '../src/services/types';

describe('Part 2: Audit Logging & Decision Snapshots', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);
  });

  it('verifies all 13 canonical audit event types exist', () => {
    const expectedTypes = [
      'CASE_CREATED',
      'NEED_PROFILE_GENERATED',
      'MATCH_COMPUTED',
      'REQUEST_CREATED',
      'REQUEST_SENT',
      'REQUEST_ACCEPTED',
      'REQUEST_REJECTED',
      'REQUEST_TIMED_OUT',
      'REQUEST_SUPERSEDED',
      'REROUTE_TRIGGERED',
      'RESOURCE_HELD',
      'RESOURCE_RELEASED',
      'HOSPITAL_STATUS_UPDATED',
    ];

    for (const type of expectedTypes) {
      expect(AUDIT_EVENT_TYPES[type as keyof typeof AUDIT_EVENT_TYPES]).toBe(type);
    }
  });

  it('rejects logging with invalid event type or empty caseId', async () => {
    await expect(
      AuditLogger.log({
        caseId: '',
        eventType: 'CASE_CREATED',
      })
    ).rejects.toThrow('AuditLog requires a non-empty caseId');

    await expect(
      AuditLogger.log({
        caseId: 'case_1',
        eventType: 'UNKNOWN_EVENT' as any,
      })
    ).rejects.toThrow('Invalid audit event type');
  });

  it('captures full decision-time snapshot and ensures immutability against later mutations', async () => {
    const mutableCase: Partial<Case> = {
      category: 'cardiac',
      severity: 'red',
    };

    const mutableNeed: NeedProfile = {
      specialists_needed: ['cardiologist'],
      capability_flags: ['ecg', 'icu'],
      blood_type_needed: null,
    };

    const mutableHospital: Partial<Hospital> = {
      icu_beds_free: 3,
      ventilators_free: 1,
      er_load_score: 2,
      specialists_on_call: ['cardiologist'],
      trauma_team_on_shift: true,
      last_updated_at: '2026-09-18T12:00:00Z',
    };

    const mutableMatch: Partial<MatchScoreBreakdown> = {
      capability_match_pct: 100,
      distance_km: 4.2,
      distance_factor: 0.88,
      load_factor: 0.8,
      staleness_factor: 1.0,
      final_score: 70.4,
    };

    const log = await AuditLogger.log({
      caseId: 'case_101',
      hospitalId: 'hosp_01',
      requestId: 'req_001',
      eventType: 'REQUEST_ACCEPTED',
      actorType: 'hospital_user',
      actorId: 'hosp_staff_demo',
      caseData: mutableCase,
      needProfile: mutableNeed,
      hospitalData: mutableHospital,
      matchData: mutableMatch,
      metadata: { reason: 'Bed reserved' },
    });

    expect(log.id).toBeDefined();
    expect(log.snapshot_of_data_at_decision_time).toBeDefined();
    expect(log.snapshot_of_data_at_decision_time?.hospital?.icu_beds_free).toBe(3);
    expect(log.snapshot_of_data_at_decision_time?.case?.severity).toBe('red');

    // Mutate source objects to simulate subsequent live changes
    mutableHospital.icu_beds_free = 0;
    mutableNeed.specialists_needed.push('neurologist');
    (mutableCase as any).severity = 'green';

    // Verify snapshot was deeply copied and remains unaffected
    const retrievedHistory = await AuditLogger.getCaseHistory('case_101');
    expect(retrievedHistory.length).toBe(1);
    const storedSnapshot = retrievedHistory[0].snapshot_of_data_at_decision_time;

    expect(storedSnapshot?.hospital?.icu_beds_free).toBe(3); // untouched!
    expect(storedSnapshot?.need_profile?.specialists_needed).toEqual(['cardiologist']); // untouched!
    expect(storedSnapshot?.case?.severity).toBe('red'); // untouched!
  });

  it('records chronological audit trail for a case across its lifecycle', async () => {
    const caseId = 'case_demo_cycle';

    await AuditLogger.log({
      caseId,
      eventType: 'CASE_CREATED',
      metadata: { source: 'ambulance_app' },
    });

    await AuditLogger.log({
      caseId,
      eventType: 'NEED_PROFILE_GENERATED',
      needProfile: {
        specialists_needed: ['cardiologist'],
        capability_flags: ['ecg'],
        blood_type_needed: null,
      },
    });

    await AuditLogger.log({
      caseId,
      hospitalId: 'hosp_A',
      requestId: 'req_1',
      eventType: 'REQUEST_SENT',
    });

    await AuditLogger.log({
      caseId,
      hospitalId: 'hosp_A',
      requestId: 'req_1',
      eventType: 'REQUEST_TIMED_OUT',
    });

    await AuditLogger.log({
      caseId,
      hospitalId: 'hosp_B',
      requestId: 'req_2',
      eventType: 'REROUTE_TRIGGERED',
      metadata: { attempted_hospitals: ['hosp_A'] },
    });

    await AuditLogger.log({
      caseId,
      hospitalId: 'hosp_B',
      requestId: 'req_2',
      eventType: 'REQUEST_ACCEPTED',
    });

    const history = await AuditLogger.getCaseHistory(caseId);
    expect(history.length).toBe(6);

    const eventTypes = history.map((h) => h.event_type);
    expect(eventTypes).toEqual([
      'CASE_CREATED',
      'NEED_PROFILE_GENERATED',
      'REQUEST_SENT',
      'REQUEST_TIMED_OUT',
      'REROUTE_TRIGGERED',
      'REQUEST_ACCEPTED',
    ]);
  });

  it('retrieves audit history filtered by hospital', async () => {
    await AuditLogger.log({
      caseId: 'case_1',
      hospitalId: 'hosp_target',
      eventType: 'REQUEST_ACCEPTED',
    });
    await AuditLogger.log({
      caseId: 'case_2',
      hospitalId: 'hosp_target',
      eventType: 'REQUEST_REJECTED',
    });
    await AuditLogger.log({
      caseId: 'case_3',
      hospitalId: 'hosp_other',
      eventType: 'REQUEST_ACCEPTED',
    });

    const targetLogs = await AuditLogger.getHospitalHistory('hosp_target');
    expect(targetLogs.length).toBe(2);
    expect(targetLogs.every((l) => l.hospital_id === 'hosp_target')).toBe(true);
  });

  it('retrieves recent logs with limits for admin dashboard', async () => {
    for (let i = 1; i <= 5; i++) {
      await AuditLogger.log({
        caseId: `case_${i}`,
        eventType: 'CASE_CREATED',
      });
    }

    const recent = await AuditLogger.getRecentLogs(3);
    expect(recent.length).toBe(3);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import { HospitalRepository } from '../src/services/repositories';
import { Hospital } from '../src/services/types';
import { ReliabilityService } from '../src/reliability/reliabilityService';
import { AdminService } from '../src/services/adminService';
import { AuditLogger } from '../src/audit/auditLogger';

describe('Part 5: Hospital Reliability Aggregate & Admin Forensic Queries', () => {
  let mockDb: MockFirestore;

  const mockHospital: Hospital = {
    id: 'hosp_rel_1',
    name: 'Reliability Center',
    lat: 21.1702,
    lng: 72.8311,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist'],
    icu_beds_free: 4,
    ventilators_free: 2,
    blood_stock: {},
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: new Date().toISOString(),
    reliability_score: 0.9,
  };

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);
    await HospitalRepository.create(JSON.parse(JSON.stringify(mockHospital)));
  });

  describe('Reliability Metric Computation', () => {
    it('returns "No history" and null score when accepted count is 0', () => {
      const result = ReliabilityService.computeScore(0, 0);
      expect(result.hasHistory).toBe(false);
      expect(result.score).toBeNull();
      expect(result.display).toBe('No history');
    });

    it('computes accurate decimal score and percentage display', () => {
      const res1 = ReliabilityService.computeScore(10, 9);
      expect(res1.hasHistory).toBe(true);
      expect(res1.score).toBe(0.9);
      expect(res1.display).toBe('90%');

      const res2 = ReliabilityService.computeScore(20, 19);
      expect(res2.score).toBe(0.95);
      expect(res2.display).toBe('95%');

      const res3 = ReliabilityService.computeScore(5, 5);
      expect(res3.score).toBe(1.0);
      expect(res3.display).toBe('100%');
    });
  });

  describe('Recording Commitment Outcomes & State Updates', () => {
    it('records honored commitment, updates cached hospital score, and writes audit', async () => {
      const stats = await ReliabilityService.recordCommitmentOutcome(
        'hosp_rel_1',
        'req_test_1',
        'case_test_1',
        'honored'
      );

      expect(stats.accepted_commitments).toBe(1);
      expect(stats.honored_commitments).toBe(1);
      expect(stats.reliability_score).toBe(1.0);
      expect(stats.reliability_display).toBe('100%');

      // Check hospital document cached score updated
      const hosp = await HospitalRepository.get('hosp_rel_1');
      expect(hosp?.reliability_score).toBe(1.0);

      // Check audit event recorded
      const history = await AuditLogger.getHospitalHistory('hosp_rel_1');
      expect(history.some((h) => h.event_type === 'HOSPITAL_STATUS_UPDATED')).toBe(true);
    });

    it('records breached commitment and decreases score', async () => {
      // 1st commitment honored
      await ReliabilityService.recordCommitmentOutcome(
        'hosp_rel_1',
        'req_test_1',
        'case_test_1',
        'honored'
      );

      // 2nd commitment breached
      const stats = await ReliabilityService.recordCommitmentOutcome(
        'hosp_rel_1',
        'req_test_2',
        'case_test_2',
        'breached'
      );

      expect(stats.accepted_commitments).toBe(2);
      expect(stats.honored_commitments).toBe(1);
      expect(stats.reliability_score).toBe(0.5);
      expect(stats.reliability_display).toBe('50%');
    });
  });

  describe('Admin Service Queries', () => {
    it('queries hospital network overview with freshness and reliability', async () => {
      const overview = await AdminService.getHospitalNetworkOverview();
      expect(overview.length).toBe(1);
      expect(overview[0].hospital.id).toBe('hosp_rel_1');
      expect(overview[0].freshness).toBe('fresh');
      expect(overview[0].reliability).toBeDefined();
    });

    it('queries audit logs with filters', async () => {
      await AuditLogger.log({
        caseId: 'case_filter_1',
        hospitalId: 'hosp_rel_1',
        eventType: 'REQUEST_ACCEPTED',
      });
      await AuditLogger.log({
        caseId: 'case_filter_2',
        hospitalId: 'hosp_rel_1',
        eventType: 'REQUEST_REJECTED',
      });

      const caseLogs = await AdminService.queryAuditLogs({ caseId: 'case_filter_1' });
      expect(caseLogs.length).toBe(1);
      expect(caseLogs[0].case_id).toBe('case_filter_1');

      const hospLogs = await AdminService.queryAuditLogs({ hospitalId: 'hosp_rel_1' });
      expect(hospLogs.length).toBeGreaterThanOrEqual(2);
    });
  });
});

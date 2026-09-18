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
import {
  Hospital,
  Case,
  Request,
  ResourceHold,
  AuditLog,
} from '../src/services/types';
import {
  classifyFreshness,
  getFreshnessFactor,
  isRequestExpired,
  calculateExpirationTimestamp,
  calculateElapsedMinutes,
} from '../src/services/timestampUtils';

describe('Part 1: Repositories & Timestamp Utilities', () => {
  let mockDb: MockFirestore;

  beforeEach(() => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);
  });

  describe('HospitalRepository', () => {
    const mockHospital: Hospital = {
      id: 'hosp_01',
      name: 'City Trauma Center',
      lat: 21.1702,
      lng: 72.8311,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist', 'orthopedist'],
      icu_beds_free: 5,
      ventilators_free: 3,
      blood_stock: { 'O-': 4, 'A+': 12 },
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: new Date().toISOString(),
      reliability_score: 0.95,
    };

    it('creates and retrieves a hospital', async () => {
      await HospitalRepository.create(mockHospital);
      const retrieved = await HospitalRepository.get('hosp_01');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('hosp_01');
      expect(retrieved?.name).toBe('City Trauma Center');
      expect(retrieved?.icu_beds_free).toBe(5);
    });

    it('updates hospital resource counts', async () => {
      await HospitalRepository.create(mockHospital);
      await HospitalRepository.update('hosp_01', { icu_beds_free: 4, er_load_score: 3 });

      const updated = await HospitalRepository.get('hosp_01');
      expect(updated?.icu_beds_free).toBe(4);
      expect(updated?.er_load_score).toBe(3);
      expect(updated?.name).toBe('City Trauma Center');
    });

    it('lists all hospitals', async () => {
      await HospitalRepository.create(mockHospital);
      await HospitalRepository.create({
        ...mockHospital,
        id: 'hosp_02',
        name: 'Metro General',
      });

      const list = await HospitalRepository.listAll();
      expect(list.length).toBe(2);
    });
  });

  describe('CaseRepository', () => {
    const mockCase: Case = {
      id: 'case_001',
      created_at: new Date().toISOString(),
      category: 'cardiac',
      severity: 'red',
      need_profile: {
        specialists_needed: ['cardiologist'],
        capability_flags: ['ecg', 'icu'],
        blood_type_needed: null,
      },
      vitals_summary: 'Severe chest pain, BP 90/60',
      incident_group_id: null,
      ambulance_location: { lat: 21.1632, lng: 72.8398 },
      status: 'routing',
      active_request_id: null,
      attempt_number: 1,
    };

    it('creates and retrieves a case', async () => {
      await CaseRepository.create(mockCase);
      const retrieved = await CaseRepository.get('case_001');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.category).toBe('cardiac');
      expect(retrieved?.need_profile.specialists_needed).toContain('cardiologist');
    });

    it('queries cases by incident_group_id for mass-casualty', async () => {
      await CaseRepository.create({ ...mockCase, id: 'case_m1', incident_group_id: 'incident_42' });
      await CaseRepository.create({ ...mockCase, id: 'case_m2', incident_group_id: 'incident_42' });
      await CaseRepository.create({ ...mockCase, id: 'case_single', incident_group_id: null });

      const massCases = await CaseRepository.listByIncident('incident_42');
      expect(massCases.length).toBe(2);
      expect(massCases.map((c) => c.id)).toEqual(['case_m1', 'case_m2']);
    });
  });

  describe('RequestRepository', () => {
    const mockRequest: Request = {
      id: 'req_001',
      case_id: 'case_001',
      hospital_id: 'hosp_01',
      status: 'pending',
      sent_at: new Date().toISOString(),
      responded_at: null,
      expires_at: new Date(Date.now() + 30000).toISOString(),
      attempt_number: 1,
      match_score_breakdown: {
        capability_match_pct: 100,
        distance_km: 3.2,
        distance_factor: 0.9,
        load_factor: 0.88,
        staleness_factor: 1.0,
        final_score: 79.2,
      },
      reason_shown_to_dispatcher: 'Cardiologist available, ICU free, 3.2 km away',
      need_profile_snapshot: {
        specialists_needed: ['cardiologist'],
        capability_flags: ['ecg', 'icu'],
        blood_type_needed: null,
      },
      hospital_capability_snapshot: {
        trauma_team_on_shift: true,
        specialists_on_call: ['cardiologist'],
        icu_beds_free: 4,
        ventilators_free: 2,
        er_load_score: 2,
        last_updated_at: new Date().toISOString(),
      },
    };

    it('creates and finds active pending request for a case', async () => {
      await RequestRepository.create(mockRequest);
      const active = await RequestRepository.getActiveRequestForCase('case_001');

      expect(active).not.toBeNull();
      expect(active?.id).toBe('req_001');
      expect(active?.status).toBe('pending');
    });

    it('finds pending requests for a specific hospital queue', async () => {
      await RequestRepository.create(mockRequest);
      await RequestRepository.create({
        ...mockRequest,
        id: 'req_002',
        case_id: 'case_002',
        hospital_id: 'hosp_01',
        status: 'pending',
      });
      await RequestRepository.create({
        ...mockRequest,
        id: 'req_003',
        case_id: 'case_003',
        hospital_id: 'hosp_02',
        status: 'pending',
      });

      const hosp1Requests = await RequestRepository.listPendingByHospital('hosp_01');
      expect(hosp1Requests.length).toBe(2);
    });
  });

  describe('HoldRepository', () => {
    const mockHold: ResourceHold = {
      request_id: 'req_001',
      case_id: 'case_001',
      hospital_id: 'hosp_01',
      created_at: new Date().toISOString(),
      status: 'active',
      resources: {
        icu: 1,
        ventilator: 0,
        blood: {},
      },
    };

    it('creates and retrieves a resource hold', async () => {
      await HoldRepository.create(mockHold);
      const hold = await HoldRepository.get('hosp_01', 'req_001');

      expect(hold).not.toBeNull();
      expect(hold?.status).toBe('active');
      expect(hold?.resources.icu).toBe(1);
    });

    it('lists active holds for a hospital', async () => {
      await HoldRepository.create(mockHold);
      await HoldRepository.create({
        ...mockHold,
        request_id: 'req_002',
        case_id: 'case_002',
        status: 'active',
      });
      await HoldRepository.create({
        ...mockHold,
        request_id: 'req_003',
        case_id: 'case_003',
        status: 'released',
      });

      const activeHolds = await HoldRepository.listActiveForHospital('hosp_01');
      expect(activeHolds.length).toBe(2);
    });
  });

  describe('AuditRepository', () => {
    const mockAudit: AuditLog = {
      id: 'audit_001',
      request_id: 'req_001',
      case_id: 'case_001',
      hospital_id: 'hosp_01',
      event_type: 'REQUEST_ACCEPTED',
      timestamp: new Date().toISOString(),
      actor_type: 'hospital_user',
      actor_id: 'hosp_admin_1',
      snapshot_of_data_at_decision_time: {
        case: { category: 'cardiac', severity: 'red' },
        hospital: { icu_beds_free: 4 },
      },
    };

    it('appends and lists audit entries by case', async () => {
      await AuditRepository.append(mockAudit);
      await AuditRepository.append({
        ...mockAudit,
        id: 'audit_002',
        event_type: 'RESOURCE_HELD',
      });

      const caseLogs = await AuditRepository.listByCase('case_001');
      expect(caseLogs.length).toBe(2);
    });
  });

  describe('Timestamp and Freshness Utilities', () => {
    it('accurately calculates expiration from sent timestamp', () => {
      const now = new Date();
      const expiresAt = calculateExpirationTimestamp(now, 30);
      const diffSec = (expiresAt.toDate().getTime() - now.getTime()) / 1000;
      expect(diffSec).toBe(30);
    });

    it('detects when request has expired', () => {
      const now = new Date();
      const pastExpiry = new Date(now.getTime() - 5000);
      const futureExpiry = new Date(now.getTime() + 10000);

      expect(isRequestExpired(pastExpiry, now)).toBe(true);
      expect(isRequestExpired(futureExpiry, now)).toBe(false);
    });

    it('classifies freshness correctly: <= 10m fresh, 10-30m stale, > 30m unknown', () => {
      const now = new Date();

      const freshDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago
      const staleDate = new Date(now.getTime() - 20 * 60 * 1000); // 20 min ago
      const unknownDate = new Date(now.getTime() - 45 * 60 * 1000); // 45 min ago

      expect(classifyFreshness(freshDate, now)).toBe('fresh');
      expect(classifyFreshness(staleDate, now)).toBe('stale');
      expect(classifyFreshness(unknownDate, now)).toBe('unknown');

      expect(getFreshnessFactor('fresh')).toBe(1.0);
      expect(getFreshnessFactor('stale')).toBe(0.85);
      expect(getFreshnessFactor('unknown')).toBe(0.7);
    });
  });
});

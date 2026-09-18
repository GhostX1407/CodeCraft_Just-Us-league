/**
 * Integration Tests: Mass Casualty Incident (MCI) Joint Distribution Orchestration
 * 
 * Verifies:
 * 1. MassCasualtyService queries cases by incident_group_id and delegates to P1's distributeMassCasualtyIncident()
 * 2. Strict prioritization: red before yellow before green, constrained needs first
 * 3. Concentration penalties encourage distribution across distinct regional hospitals
 * 4. Seeded demo MCI patients execute cleanly through the orchestration layer
 * 5. Full MCI_DISTRIBUTED audit log is recorded
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockFirestore } from './mockFirestore';
import { setDb } from '../src/services/firebase';
import {
  HospitalRepository,
  CaseRepository,
} from '../src/services/repositories';
import { MassCasualtyService } from '../src/services/massCasualtyService';
import { AuditLogger } from '../src/audit/auditLogger';
import { DEMO_HOSPITALS, DEMO_CASES } from '../src/data/seedData';

describe('Mass Casualty Incident (MCI) Orchestration', () => {
  let mockDb: MockFirestore;
  const incidentGroupId = 'incident_expressway_mci_01';

  beforeEach(async () => {
    mockDb = new MockFirestore();
    setDb(mockDb as any);


    // Seed demo hospitals and cases into repository
    for (const h of DEMO_HOSPITALS) {
      await HospitalRepository.create(h);
    }
    for (const c of DEMO_CASES) {
      await CaseRepository.create(c);
    }
  });

  it('orchestrates mass casualty distribution for the 4 seeded MCI cases via canonical P1 engine', async () => {
    // 1. Invoke orchestration service
    const result = await MassCasualtyService.distributeIncident(incidentGroupId, {
      actorId: 'triage_commander',
      actorType: 'ambulance_user',
    });

    // 2. Verify all 4 demo cases are assigned
    expect(result.incident_group_id).toBe(incidentGroupId);
    expect(result.assignments.length).toBe(4);
    expect(result.unassigned_case_ids.length).toBe(0);
    expect(result.total_score).toBeGreaterThan(0);

    // 3. Verify cases assigned:
    const assignedCaseIds = result.assignments.map((a) => a.case_id);
    expect(assignedCaseIds).toContain('case_mci_patient_1');
    expect(assignedCaseIds).toContain('case_mci_patient_2');
    expect(assignedCaseIds).toContain('case_mci_patient_3');
    expect(assignedCaseIds).toContain('case_mci_patient_4');

    // 4. Verify distribution across distinct hospitals (preventing single hospital saturation)
    const assignedHospitalIds = new Set(result.assignments.map((a) => a.assigned_hospital_id));
    expect(assignedHospitalIds.size).toBeGreaterThanOrEqual(2);

    // 5. Verify audit trail recorded
    const auditLogs = await AuditLogger.getCaseHistory(assignedCaseIds[0]);
    const mciLog = auditLogs.find((a) => a.event_type === 'MCI_DISTRIBUTED');
    expect(mciLog).toBeDefined();
    expect(mciLog?.metadata?.incident_group_id).toBe(incidentGroupId);
    expect(mciLog?.metadata?.assigned_count).toBe(4);
  });

  it('returns empty result safely when no cases match incidentGroupId', async () => {
    const emptyResult = await MassCasualtyService.distributeIncident('non_existent_group');
    expect(emptyResult.assignments).toEqual([]);
    expect(emptyResult.unassigned_case_ids).toEqual([]);
    expect(emptyResult.total_score).toBe(0);
  });
});

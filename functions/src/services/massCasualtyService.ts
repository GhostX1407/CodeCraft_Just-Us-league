/**
 * Mass Casualty Incident (MCI) Joint Distribution Orchestration Service
 * 
 * Orchestrates multi-patient regional distribution across available hospitals
 * by loading incident cases and delegating directly to P1's canonical
 * distributeMassCasualtyIncident() engine.
 * 
 * Grounded in docs/spec.md (§63-70) and team work distribution.
 * Owned by Person 2 within the services layer.
 */

import { CaseRepository, HospitalRepository } from './repositories';
import { Case, Hospital, MassCasualtyResult } from './types';
import { distributeMassCasualtyIncident } from '../matching';
import { AuditLogger } from '../audit/auditLogger';
import { generateDynamicNeedProfile } from '../domain/vitalsIntelligence';

export interface DistributeIncidentOptions {
  actorId?: string;
  actorType?: 'system' | 'ambulance_user' | 'admin_user';
  cases?: Case[]; // Optional direct injection for testing or simulation
  hospitals?: Hospital[]; // Optional direct injection
}

export class MassCasualtyService {
  /**
   * Loads all cases belonging to incident_group_id and all available hospitals,
   * invokes P1's canonical distributeMassCasualtyIncident engine, and logs audit trail.
   */
  static async distributeIncident(
    incidentGroupId: string,
    options: DistributeIncidentOptions = {}
  ): Promise<MassCasualtyResult> {
    if (!incidentGroupId) {
      throw new Error('incidentGroupId is required for mass casualty distribution');
    }

    // 1. Load cases for the incident group (or use injected cases)
    let cases: Case[] = options.cases || [];
    if (!options.cases) {
      cases = await CaseRepository.listByIncidentGroup(incidentGroupId);
    }

    if (cases.length === 0) {
      return {
        incident_group_id: incidentGroupId,
        assignments: [],
        total_score: 0,
        concentration_penalties: {},
        unassigned_case_ids: [],
      };
    }

    // Ensure every case has a complete need_profile for capability matching
    cases = cases.map((c) => {
      if (!c.need_profile) {
        return {
          ...c,
          need_profile: generateDynamicNeedProfile(
            c.category || 'trauma',
            c.severity || 'red',
            (c as any).subcategory,
            (c as any).vitals,
            (c as any).symptoms
          ),
        };
      }
      return c;
    });

    // 2. Load hospitals (or use injected hospitals)
    let hospitals: Hospital[] = options.hospitals || [];
    if (!options.hospitals) {
      hospitals = await HospitalRepository.listAll();
    }

    // 3. Invoke P1's canonical deterministic mass-casualty distribution engine
    const distributionResult = distributeMassCasualtyIncident(
      incidentGroupId,
      cases,
      hospitals
    );


    // 4. Record audit event for the MCI distribution
    await AuditLogger.log({
      caseId: cases[0]?.id || incidentGroupId,
      eventType: 'MCI_DISTRIBUTED',
      actorType: options.actorType || 'system',
      actorId: options.actorId || 'system',
      metadata: {
        incident_group_id: incidentGroupId,
        patient_count: cases.length,
        assigned_count: distributionResult.assignments.length,
        unassigned_count: distributionResult.unassigned_case_ids.length,
        total_score: distributionResult.total_score,
        concentration_penalties: distributionResult.concentration_penalties,
        assignments: distributionResult.assignments.map((a) => ({
          case_id: a.case_id,
          hospital_id: a.assigned_hospital_id,
          score: a.individual_score,
        })),
      },
    });

    return distributionResult;
  }
}

/**
 * Authoritative Audit Logging & Forensic Trail Service
 * 
 * Implements immutable, append-only decision audit logging with full
 * decision-time state snapshots per docs/data-model.md §18-20 and docs/spec.md.
 * 
 * Owned by Person 2.
 */

import { AuditRepository } from '../services/repositories';
import {
  AuditLog,
  AuditEventType,
  AuditSnapshot,
  Case,
  Hospital,
  NeedProfile,
  MatchScoreBreakdown,
} from '../services/types';
import { nowTimestamp } from '../services/timestampUtils';

export const AUDIT_EVENT_TYPES: Record<AuditEventType, AuditEventType> = {
  CASE_CREATED: 'CASE_CREATED',
  NEED_PROFILE_GENERATED: 'NEED_PROFILE_GENERATED',
  MATCH_COMPUTED: 'MATCH_COMPUTED',
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_SENT: 'REQUEST_SENT',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_TIMED_OUT: 'REQUEST_TIMED_OUT',
  REQUEST_SUPERSEDED: 'REQUEST_SUPERSEDED',
  REROUTE_TRIGGERED: 'REROUTE_TRIGGERED',
  RESOURCE_HELD: 'RESOURCE_HELD',
  RESOURCE_RELEASED: 'RESOURCE_RELEASED',
  RESOURCE_CONSUMED: 'RESOURCE_CONSUMED',
  HANDOFF_COMPLETED: 'HANDOFF_COMPLETED',
  COMMITMENT_INVALIDATED: 'COMMITMENT_INVALIDATED',
  MCI_DISTRIBUTED: 'MCI_DISTRIBUTED',
  HOSPITAL_STATUS_UPDATED: 'HOSPITAL_STATUS_UPDATED',
} as const;


export interface CreateAuditLogParams {
  id?: string;
  requestId?: string | null;
  caseId: string;
  hospitalId?: string | null;
  eventType: AuditEventType;
  actorType?: 'system' | 'hospital_user' | 'ambulance_user' | 'admin_user';
  actorId?: string;
  caseData?: Partial<Case>;
  needProfile?: NeedProfile;
  hospitalData?: Partial<Hospital>;
  matchData?: Partial<MatchScoreBreakdown>;
  metadata?: Record<string, any>;
  timestamp?: FirebaseFirestore.Timestamp | Date | string;
}

/**
 * Creates an immutable deep copy of decision-time state
 */
export function captureDecisionSnapshot(params: {
  caseData?: Partial<Case>;
  needProfile?: NeedProfile;
  hospitalData?: Partial<Hospital>;
  matchData?: Partial<MatchScoreBreakdown>;
}): AuditSnapshot | undefined {
  const snapshot: AuditSnapshot = {};
  let hasData = false;

  if (params.caseData) {
    snapshot.case = {
      category: params.caseData.category,
      severity: params.caseData.severity,
      incident_group_id: params.caseData.incident_group_id,
      status: params.caseData.status,
    };
    hasData = true;
  }

  if (params.needProfile) {
    snapshot.need_profile = {
      specialists_needed: [...params.needProfile.specialists_needed],
      capability_flags: [...params.needProfile.capability_flags],
      blood_type_needed: params.needProfile.blood_type_needed,
    };
    hasData = true;
  }

  if (params.hospitalData) {
    snapshot.hospital = {
      icu_beds_free: params.hospitalData.icu_beds_free,
      ventilators_free: params.hospitalData.ventilators_free,
      er_load_score: params.hospitalData.er_load_score,
      specialists_on_call: params.hospitalData.specialists_on_call
        ? [...params.hospitalData.specialists_on_call]
        : undefined,
      trauma_team_on_shift: params.hospitalData.trauma_team_on_shift,
      last_updated_at: params.hospitalData.last_updated_at,
    };
    hasData = true;
  }

  if (params.matchData) {
    snapshot.match = {
      capability_match_pct: params.matchData.capability_match_pct,
      distance_km: params.matchData.distance_km,
      distance_factor: params.matchData.distance_factor,
      load_factor: params.matchData.load_factor,
      staleness_factor: params.matchData.staleness_factor,
      final_score: params.matchData.final_score,
    };
    hasData = true;
  }

  return hasData ? JSON.parse(JSON.stringify(snapshot)) : undefined;
}

export class AuditLogger {
  /**
   * Generates a unique, chronological audit ID
   */
  static generateAuditId(): string {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 9);
    return `audit_${timestamp}_${rand}`;
  }

  /**
   * Constructs a validated AuditLog object (ready for persistence or transactional write)
   */
  static buildAuditLog(params: CreateAuditLogParams): AuditLog {
    if (!params.caseId) {
      throw new Error('AuditLog requires a non-empty caseId');
    }
    if (!params.eventType || !AUDIT_EVENT_TYPES[params.eventType]) {
      throw new Error(`Invalid audit event type: ${params.eventType}`);
    }

    const snapshot = captureDecisionSnapshot({
      caseData: params.caseData,
      needProfile: params.needProfile,
      hospitalData: params.hospitalData,
      matchData: params.matchData,
    });

    const auditRecord: AuditLog = {
      id: params.id || this.generateAuditId(),
      request_id: params.requestId ?? null,
      case_id: params.caseId,
      hospital_id: params.hospitalId ?? null,
      event_type: params.eventType,
      timestamp: params.timestamp ? params.timestamp : nowTimestamp(),
      actor_type: params.actorType || 'system',
      actor_id: params.actorId || 'system',
      snapshot_of_data_at_decision_time: snapshot,
      metadata: params.metadata ? { ...params.metadata } : undefined,
    };

    return auditRecord;
  }

  /**
   * Appends an audit event to the append-only audit trail
   */
  static async log(params: CreateAuditLogParams): Promise<AuditLog> {
    const auditRecord = this.buildAuditLog(params);
    await AuditRepository.append(auditRecord);
    return auditRecord;
  }

  /**
   * Retrieves all audit records for a case in chronological sequence
   */
  static async getCaseHistory(caseId: string): Promise<AuditLog[]> {
    return AuditRepository.listByCase(caseId);
  }

  /**
   * Retrieves all audit records for a hospital
   */
  static async getHospitalHistory(hospitalId: string): Promise<AuditLog[]> {
    return AuditRepository.listByHospital(hospitalId);
  }

  /**
   * Retrieves recent audit records for administrative review
   */
  static async getRecentLogs(limit: number = 50): Promise<AuditLog[]> {
    return AuditRepository.listRecent(limit);
  }
}

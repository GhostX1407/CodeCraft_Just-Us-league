/**
 * Canonical Data Model & Contract Types for Raahi Backend Services
 * 
 * Reconciled in Person 2 Integration Pass.
 * Re-exports and consumes canonical domain structures from functions/src/types/index.ts
 * while declaring service-specific orchestration models (Request, ResourceHold, AuditLog, etc.).
 * 
 * Grounded in docs/data-model.md, docs/spec.md, and docs/api-contract.md.
 */

import type {
  Hospital as CanonicalHospital,
  Case as CanonicalCase,
  NeedProfile as CanonicalNeedProfile,
  MatchScoreBreakdown as CanonicalMatchScoreBreakdown,
  BloodStock as CanonicalBloodStock,
  EmergencyCategory,
  SeverityLevel,
  Coordinates,
  SpecialistType,
  CapabilityFlag,
  MatchResult,
  EligibilityResult,
  FreshnessInfo,
  RankingOptions,
  MassCasualtyResult,
  MassCasualtyAssignment,
  CommitmentValidationResult,
  InvalidationReason,
} from '../types';

// ============================================================================
// 1. Re-export Canonical Domain Types from P1
// ============================================================================

export type {
  EmergencyCategory,
  SeverityLevel,
  Coordinates,
  SpecialistType,
  CapabilityFlag,
  MatchResult,
  EligibilityResult,
  FreshnessInfo,
  RankingOptions,
  MassCasualtyResult,
  MassCasualtyAssignment,
  CommitmentValidationResult,
  InvalidationReason,
};

export type BloodStock = CanonicalBloodStock;
export type NeedProfile = CanonicalNeedProfile;
export type Hospital = CanonicalHospital;

// Aliases for emergency category and severity
export type CaseCategory = EmergencyCategory;
export type CaseSeverity = SeverityLevel;
export type CaseRoutingStatus = 'routing' | 'accepted' | 'exhausted' | 'completed';

// Extended MatchScoreBreakdown supporting both canonical freshness_factor and backwards-compatible staleness_factor
export interface MatchScoreBreakdown extends CanonicalMatchScoreBreakdown {
  staleness_factor?: number;
}

// Service-layer Case model extending canonical Case with live routing state
export interface Case extends Omit<CanonicalCase, 'created_at'> {
  created_at?: any;
  status?: CaseRoutingStatus;
  active_request_id?: string | null;
  attempt_number?: number;
  accepted_hospital_id?: string | null;
}


// ============================================================================
// 2. Service-Specific Orchestration Structures (P2 Owned)
// ============================================================================

export interface HospitalCapabilitySnapshot {
  trauma_team_on_shift: boolean;
  specialists_on_call: string[];
  icu_beds_free: number;
  ventilators_free: number;
  er_load_score: number;
  last_updated_at: any;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'timed_out' | 'superseded';

export interface Request {
  id: string;
  case_id: string;
  hospital_id: string;
  status: RequestStatus;
  sent_at: any;
  responded_at: any;
  expires_at: any;
  attempt_number: number;
  match_score_breakdown: MatchScoreBreakdown;
  reason_shown_to_dispatcher: string;
  need_profile_snapshot: NeedProfile;
  hospital_capability_snapshot: HospitalCapabilitySnapshot;
}

export type HoldStatus = 'active' | 'released' | 'consumed';

export interface HoldResources {
  icu: number;
  ventilator: number;
  blood: Record<string, number>;
}

export interface ResourceHold {
  request_id: string;
  case_id: string;
  hospital_id: string;
  created_at: any;
  consumed_at?: any;
  status: HoldStatus;
  resources: HoldResources;
}

export type AuditEventType =
  | 'CASE_CREATED'
  | 'NEED_PROFILE_GENERATED'
  | 'MATCH_COMPUTED'
  | 'REQUEST_CREATED'
  | 'REQUEST_SENT'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_TIMED_OUT'
  | 'REQUEST_SUPERSEDED'
  | 'REROUTE_TRIGGERED'
  | 'RESOURCE_HELD'
  | 'RESOURCE_RELEASED'
  | 'RESOURCE_CONSUMED'
  | 'HANDOFF_COMPLETED'
  | 'COMMITMENT_INVALIDATED'
  | 'MCI_DISTRIBUTED'
  | 'HOSPITAL_STATUS_UPDATED';

export interface AuditSnapshot {
  case?: Partial<Case>;
  need_profile?: NeedProfile;
  hospital?: Partial<Hospital>;
  match?: Partial<MatchScoreBreakdown>;
}

export interface AuditLog {
  id: string;
  request_id: string | null;
  case_id: string;
  hospital_id: string | null;
  event_type: AuditEventType;
  timestamp: any;
  actor_type: 'system' | 'hospital_user' | 'ambulance_user' | 'admin_user';
  actor_id: string;
  snapshot_of_data_at_decision_time?: AuditSnapshot;
  metadata?: Record<string, any>;
}

export interface CandidateScore {
  hospital: Hospital;
  breakdown: MatchScoreBreakdown;
  reason: string;
  eligible: boolean;
  rank?: number;
}

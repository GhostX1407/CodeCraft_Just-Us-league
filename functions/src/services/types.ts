/**
 * Canonical Data Model & Contract Types for Raahi Backend Services
 * 
 * Conforms strictly to docs/data-model.md, docs/spec.md, and docs/api-contract.md.
 * Owned by Person 2 within the services layer.
 */

export interface BloodStock {
  'O-'?: number;
  'O+'?: number;
  'A+'?: number;
  'A-'?: number;
  'B+'?: number;
  'B-'?: number;
  'AB+'?: number;
  'AB-'?: number;
  [key: string]: number | undefined;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trauma_team_on_shift: boolean;
  specialists_on_call: string[];
  icu_beds_free: number;
  ventilators_free: number;
  blood_stock: BloodStock;
  er_load_score: number; // 1 = low, 2 = mod-low, 3 = med, 4 = high, 5 = very high
  accepts_scheme_patients: boolean;
  last_updated_at: FirebaseFirestore.Timestamp | Date | string;
  reliability_score: number; // 0.0 to 1.0
}

export interface NeedProfile {
  specialists_needed: string[];
  capability_flags: string[];
  blood_type_needed: string | null;
}

export type CaseCategory = 'cardiac' | 'trauma' | 'obstetric' | 'pediatric';
export type CaseSeverity = 'red' | 'yellow' | 'green';
export type CaseRoutingStatus = 'routing' | 'accepted' | 'exhausted';

export interface Case {
  id: string;
  created_at: FirebaseFirestore.Timestamp | Date | string;
  category: CaseCategory;
  severity: CaseSeverity;
  need_profile: NeedProfile;
  vitals_summary?: string;
  onset_time?: string;
  treatment_administered?: string;
  patient_basic_info?: {
    age?: number;
    sex?: 'male' | 'female' | 'other';
  };
  incident_group_id: string | null;
  ambulance_location: {
    lat: number;
    lng: number;
  };
  status?: CaseRoutingStatus;
  active_request_id?: string | null;
  attempt_number?: number;
  accepted_hospital_id?: string | null;
}

export interface MatchScoreBreakdown {
  capability_match_pct: number;
  distance_km: number;
  distance_factor: number;
  load_factor: number;
  staleness_factor: number;
  final_score: number;
}

export interface HospitalCapabilitySnapshot {
  trauma_team_on_shift: boolean;
  specialists_on_call: string[];
  icu_beds_free: number;
  ventilators_free: number;
  er_load_score: number;
  last_updated_at: FirebaseFirestore.Timestamp | Date | string;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'timed_out' | 'superseded';

export interface Request {
  id: string;
  case_id: string;
  hospital_id: string;
  status: RequestStatus;
  sent_at: FirebaseFirestore.Timestamp | Date | string;
  responded_at: FirebaseFirestore.Timestamp | Date | string | null;
  expires_at: FirebaseFirestore.Timestamp | Date | string;
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
  created_at: FirebaseFirestore.Timestamp | Date | string;
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
  timestamp: FirebaseFirestore.Timestamp | Date | string;
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
}

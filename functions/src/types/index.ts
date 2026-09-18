/**
 * RAAHI — DOMAIN TYPES & INTERFACES
 *
 * Canonical data structures for the deterministic matching engine and domain layer.
 * Grounded in docs/data-model.md, docs/api-contract.md, and docs/spec.md.
 */

// ============================================================================
// 1. Core Enumerations & Primitives
// ============================================================================

export type EmergencyCategory = 'cardiac' | 'trauma' | 'obstetric' | 'pediatric' | string;

export type SeverityLevel = 'red' | 'yellow' | 'green';

export type SpecialistType =
  | 'cardiologist'
  | 'orthopedist'
  | 'neurologist'
  | 'obgyn'
  | 'pediatrician'
  | 'general_surgeon'
  | 'anesthetist'
  | string;

export type CapabilityFlag =
  | 'ecg'
  | 'icu'
  | 'ventilator'
  | 'trauma_team'
  | 'maternity'
  | 'pediatric_emergency'
  | string;

export type BloodGroup = 'O-' | 'O+' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | string;

export type BloodStock = Record<string, number>;

export interface Coordinates {
  lat: number;
  lng: number;
}

// ============================================================================
// 2. Need Profile & Case
// ============================================================================

export interface NeedProfile {
  specialists_needed: SpecialistType[];
  capability_flags: CapabilityFlag[];
  blood_type_needed: BloodGroup | null;
}

export interface PatientBasicInfo {
  age?: number;
  sex?: 'male' | 'female' | 'other' | string;
}

export interface Case {
  id: string;
  created_at?: string | number | Date;
  category: EmergencyCategory;
  severity: SeverityLevel;
  need_profile: NeedProfile;
  vitals_summary?: string;
  onset_time?: string;
  treatment_administered?: string;
  patient_basic_info?: PatientBasicInfo;
  incident_group_id?: string | null;
  ambulance_location: Coordinates;
}

// ============================================================================
// 3. Hospital Capability Profile
// ============================================================================

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trauma_team_on_shift: boolean;
  specialists_on_call: SpecialistType[];
  icu_beds_free: number;
  ventilators_free: number;
  blood_stock: BloodStock;
  er_load_score: number; // 1 to 5
  accepts_scheme_patients: boolean;
  last_updated_at: string | number | Date;
  reliability_score: number; // 0.0 to 1.0
  capabilities?: CapabilityFlag[]; // Optional non-specialist capability flags
}

export interface CommittedResourceHolds {
  icu_holds?: number;
  ventilator_holds?: number;
  blood_holds?: Record<string, number>;
}

// ============================================================================
// 4. Match & Ranking Objects
// ============================================================================

export type FreshnessStatus = 'fresh' | 'stale' | 'unknown';

export interface FreshnessInfo {
  status: FreshnessStatus;
  age_minutes: number;
  factor: number;
  last_updated_at: string | number | Date;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string | null;
  missing_specialists?: string[];
  missing_capabilities?: string[];
  missing_blood?: string | null;
  insufficient_resources?: string[];
}

export interface MatchScoreBreakdown {
  capability_match_pct: number;
  distance_km: number;
  distance_factor: number;
  load_factor: number;
  freshness_factor: number;
  final_score: number;
}

export interface MatchResult {
  hospital_id: string;
  hospital_name?: string;
  rank: number;
  capability_match_pct: number;
  distance_km: number;
  distance_factor: number;
  load_factor: number;
  freshness_factor: number;
  final_score: number;
  eligibility: EligibilityResult;
  freshness: FreshnessInfo;
  reasons: string[];
}

export interface RankingOptions {
  current_time?: number | Date;
  already_attempted_hospital_ids?: string[];
  committed_holds?: Record<string, CommittedResourceHolds>;
  include_ineligible?: boolean;
}

// ============================================================================
// 5. Mass Casualty Distribution
// ============================================================================

export interface MassCasualtyAssignment {
  case_id: string;
  assigned_hospital_id: string;
  hospital_name?: string;
  individual_score: number;
  breakdown: MatchScoreBreakdown;
  rank_for_case: number;
}

export interface MassCasualtyResult {
  incident_group_id: string;
  assignments: MassCasualtyAssignment[];
  total_score: number;
  concentration_penalties: Record<string, number>;
  unassigned_case_ids: string[];
}

// ============================================================================
// 6. Commitment Invalidation & Mid-Transit Monitoring (T-P1-044)
// ============================================================================

export type InvalidationReasonType =
  | 'missing_specialist'
  | 'trauma_team_unavailable'
  | 'icu_unavailable'
  | 'ventilator_unavailable'
  | 'blood_unavailable'
  | 'missing_capability_flag';

export interface InvalidationReason {
  type: InvalidationReasonType;
  detail: string;
  required_item: string;
}

export interface CommitmentValidationResult {
  is_valid: boolean;
  is_invalid: boolean;
  reasons: string[];
  detailed_reasons: InvalidationReason[];
}

export interface CommitmentValidationOptions {
  current_holds?: CommittedResourceHolds;
  is_case_hold_allocated?: boolean;
}

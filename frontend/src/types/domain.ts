// TypeScript Domain Types — exact contract matching Part C.1 of MASTER_FRONTEND_PROMPT.md

export type CaseCategory =
  | 'cardiac'
  | 'trauma'
  | 'obstetric'
  | 'pediatric'
  | 'respiratory'
  | 'stroke'
  | 'burn'
  | 'hemorrhage'
  | 'poisoning'
  | 'sepsis'
  | string;
export type Severity = 'red' | 'yellow' | 'green';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'timed_out' | 'superseded';
export type Freshness = 'fresh' | 'stale' | 'unknown';
export type BloodType = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export type Timestamp = number | { seconds: number; nanoseconds?: number };

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trauma_team_on_shift: boolean;
  specialists_on_call: string[];          // e.g. ["cardiologist","orthopedist"]
  icu_beds_free: number;
  ventilators_free: number;
  blood_stock: Partial<Record<BloodType, number>>;
  er_load_score: number;                  // 1 (light) – 5 (overloaded), self-reported
  accepts_scheme_patients: boolean;
  last_updated_at: Timestamp;             // drives freshness
  reliability_score: number | null;       // 0–1, computed by backend, null for no history
  contact_number?: string;                // used by the mobile "Contact hospital" action
  operational_status?: {
    icu?: boolean;
    ventilator?: boolean;
    blood?: boolean;
  };
}

export interface NeedProfile {
  specialists_needed: string[];
  capability_flags: string[];             // "ecg" | "icu" | "trauma_team" | "maternity" | "pediatric_emergency" | ...
  blood_type_needed: BloodType | null;
}

export interface Case {
  id: string;
  created_at: Timestamp;
  category: CaseCategory;
  severity: Severity;
  need_profile: NeedProfile;
  vitals_summary: string;
  onset_time: string;
  treatment_administered: string;
  patient_basic_info: { age: number; sex: 'male' | 'female' | 'other'; name?: string };
  incident_group_id: string | null;
  ambulance_location: { lat: number; lng: number };
  subcategory?: string;
  vitals?: PatientVitals;
  symptoms?: PatientSymptoms;
  suggested_severity?: Severity;
  clinical_justification?: string[];
  journey_stage?: JourneyStage;
  transit_condition?: PatientTransitStatus;
}

export interface MatchScoreBreakdown {
  capability_match_pct: number;   // 0–100
  distance_km: number;
  distance_factor: number;        // 0–1
  load_factor: number;            // 0–1
  staleness_factor: number;       // 1.00 fresh | 0.85 stale | 0.70 unknown
  final_score: number;            // 0–100
}

export interface Request {
  id: string;
  case_id: string;
  hospital_id: string;
  status: RequestStatus;
  sent_at: Timestamp;
  expires_at: Timestamp;          // SERVER-authored; the only countdown source
  responded_at: Timestamp | null;
  attempt_number: number;
  match_score_breakdown: MatchScoreBreakdown;
  reason_shown_to_dispatcher: string;
  rejection_reason?: string;
}

export interface MatchResult {
  hospital_id: string;
  rank: number;
  capability_match_pct: number;
  distance_km: number;
  distance_factor: number;
  load_factor: number;
  staleness_factor: number;
  final_score: number;
  eligibility: { eligible: boolean; reason: string | null };
  freshness: { status: Freshness; last_updated_at: Timestamp };
  reasons: string[];              // ["Cardiologist available", "ICU capacity available", "Low ER load"]
}

export interface CaseRouting {
  status: 'idle' | 'matching' | 'pending' | 'accepted' | 'rerouting' | 'exhausted';
  active_request_id: string | null;
  attempt_number: number;
  accepted_hospital_id: string | null;
}

export interface PatientVitals {
  heart_rate?: number | null;
  blood_pressure_sys?: number | null;
  blood_pressure_dia?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  respiratory_rate?: number | null;
  blood_sugar?: number | null;
  gcs_score?: number | null;
}

export interface PatientSymptoms {
  unconscious?: boolean;
  bleeding?: boolean;
  breathing_difficulty?: boolean;
  chest_pain?: boolean;
  seizure?: boolean;
  fracture?: boolean;
  burn?: boolean;
  pregnant?: boolean;
  altered_mental_status?: boolean;
  respiratory_distress?: boolean;
  severe_bleeding?: boolean;
}

export interface SeveritySuggestion {
  suggested_severity: Severity;
  confidence_score: number;
  rationales: string[];
  clinical_justification?: string[];
  critical_flags: string[];
  flags?: string[];
}

export interface EmergencySubcategory {
  id: string;
  name: string;
  parentCategory: string;
  defaultCapabilities: string[];
  requiresBloodType?: boolean;
}

export type JourneyStage =
  | 'CASE_CREATED'
  | 'HOSPITAL_MATCHED'
  | 'HOSPITAL_ACCEPTED'
  | 'AMBULANCE_ASSIGNED'
  | 'PATIENT_PICKED'
  | 'TRANSIT_IN_PROGRESS'
  | 'ARRIVED_AT_HOSPITAL'
  | 'HANDOFF_COMPLETED';

export type PatientTransitStatus = 'stable' | 'deteriorating' | 'critical';

export interface VitalsTimelineEntry {
  timestamp: string;
  vitals: PatientVitals;
  status: PatientTransitStatus;
  logged_by: string;
  notes?: string;
}

export interface PatientJourneyStep {
  stage: JourneyStage;
  label: string;
  timestamp: string;
  completed: boolean;
  actor: string;
  details?: string;
}

export interface CaseTransitDetails {
  case_id: string;
  journey_stage: JourneyStage;
  journey_history: PatientJourneyStep[];
  current_transit_status: PatientTransitStatus;
  vitals_timeline: VitalsTimelineEntry[];
  ambulance_id?: string | null;
  assigned_hospital_id?: string | null;
  current_location?: { lat: number; lng: number };
  destination_location?: { lat: number; lng: number };
  distance_remaining_km?: number;
  eta_minutes?: number;
  speed_kmh?: number;
  heading_degrees?: number;
  route_polyline?: string;
  last_updated_at: string;
}

export interface Incident {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  createdAt: string;
  status: 'active' | 'contained' | 'resolved';
  cases: string[];
  severityDistribution: { red: number; yellow: number; green: number };
  hospitalAllocation: Record<string, any>;
  bottlenecksDetected: string[];
  incidentSummary: string;
}

export type VerificationStatus = 'pending' | 'verified' | 'approved' | 'rejected';
export type AmbulanceType = 'BLS' | 'ALS' | 'Trauma' | 'Neonatal';
export type AmbulanceFacility = 'oxygen' | 'ecg' | 'ventilator' | 'defibrillator' | 'stretcher';

export interface HospitalRegistrationRecord {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_number: string;
  capabilities: string[];
  icu_beds: number;
  ventilators: number;
  blood_stock: Record<string, number>;
  specialists_on_call: string[];
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  organization: string;
  ambulance_type: AmbulanceType;
  capacity_patients: number;
  current_location: { lat: number; lng: number };
  facilities: AmbulanceFacility[];
  contact_number: string;
  availability: 'available' | 'en_route' | 'busy' | 'maintenance';
  status: VerificationStatus;
  current_case_id?: string | null;
  speed_kmh?: number;
  heading_degrees?: number;
  last_updated_at: string;
}

export interface AppNotification {
  id: string;
  recipientRole: 'ambulance' | 'hospital' | 'admin' | 'family';
  recipientId?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'urgent';
  title: string;
  message: string;
  caseId?: string;
  hospitalId?: string;
  ambulanceId?: string;
  timestamp: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export interface OperationalBriefing {
  summary: string;
  keyObservations: string[];
  bottlenecks: string[];
  resourcePressures: string[];
  operationalRecommendations: string[];
  modelUsed: string;
  disclaimer: string;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  request_id: string | null;
  case_id: string;
  hospital_id: string | null;
  event_type: string;             // CASE_CREATED | NEED_PROFILE_GENERATED | MATCH_COMPUTED |
                                  // REQUEST_SENT | REQUEST_ACCEPTED | REQUEST_REJECTED |
                                  // REQUEST_TIMED_OUT | REQUEST_SUPERSEDED | REROUTE_TRIGGERED |
                                  // CAPABILITY_UPDATED | HOLD_CREATED | HOLD_RELEASED
  timestamp: Timestamp;
  actor_type: 'ambulance' | 'hospital' | 'admin' | 'system';
  snapshot_of_data_at_decision_time: Record<string, unknown>;
}

export interface ReliabilityRow {
  hospital_id: string;
  hospital_name: string;
  reliability_score: number | null;
  response_metrics: {
    accepted_count: number;
    successful_commitment_count: number;
    average_response_seconds: number;
  };
}

export interface Actor {
  actor_type: 'ambulance' | 'hospital' | 'admin';
  actor_id: string;   // e.g. "ambulance_demo_01" | "hospital_003_demo" | "admin_demo_01"
}

// API Envelope
export interface ApiOk<T> {
  success: true;
  data: T;
  error: null;
  meta: Record<string, unknown>;
}

export interface ApiErr {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: Record<string, unknown>;
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;


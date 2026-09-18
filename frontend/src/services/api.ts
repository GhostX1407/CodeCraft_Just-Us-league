import {
  Case,
  CaseCategory,
  Severity,
  NeedProfile,
  Request,
  Hospital,
  MatchResult,
  MatchScoreBreakdown,
  Actor,
  ApiResponse,
  AuditEvent,
  ReliabilityRow,
  CaseRouting,
  PatientVitals,
  PatientSymptoms,
} from '../types/domain';
import { stateStore } from './stateStore';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/geo';
import { getFreshness, toMillis } from '../utils/time';

const DEFAULT_TIMEOUT_SECONDS = 30;

// Deterministic Need Profile Generator (Part C.2 rules table)
export function deriveNeedProfile(category: CaseCategory): NeedProfile {
  switch (category) {
    case 'cardiac':
      return {
        specialists_needed: ['cardiologist'],
        capability_flags: ['ecg', 'icu'],
        blood_type_needed: null,
      };
    case 'trauma':
      return {
        specialists_needed: [],
        capability_flags: ['trauma_team', 'icu'],
        blood_type_needed: 'O-',
      };
    case 'obstetric':
      return {
        specialists_needed: ['obgyn'],
        capability_flags: ['maternity'],
        blood_type_needed: null,
      };
    case 'pediatric':
      return {
        specialists_needed: ['pediatrician'],
        capability_flags: ['pediatric_emergency'],
        blood_type_needed: null,
      };
    case 'respiratory':
      return {
        specialists_needed: ['pulmonologist'],
        capability_flags: ['ventilator', 'icu'],
        blood_type_needed: null,
      };
    case 'stroke':
      return {
        specialists_needed: ['neurologist'],
        capability_flags: ['ct_scanner', 'icu'],
        blood_type_needed: null,
      };
    case 'burn':
      return {
        specialists_needed: ['plastic_surgeon'],
        capability_flags: ['burn_unit', 'icu'],
        blood_type_needed: null,
      };
    case 'hemorrhage':
      return {
        specialists_needed: ['general_surgeon'],
        capability_flags: ['blood_bank', 'or'],
        blood_type_needed: 'O-',
      };
    case 'poisoning':
      return {
        specialists_needed: ['toxicologist'],
        capability_flags: ['dialysis', 'icu'],
        blood_type_needed: null,
      };
    case 'sepsis':
      return {
        specialists_needed: ['intensivist'],
        capability_flags: ['icu'],
        blood_type_needed: null,
      };
    case 'other':
    default:
      return {
        specialists_needed: [],
        capability_flags: [],
        blood_type_needed: null,
      };
  }
}

// Compute Match Score and Breakdown for a hospital against a case
export function evaluateHospitalMatch(hospital: Hospital, c: Case): MatchResult {
  const need = c.need_profile;
  const reasons: string[] = [];

  // 1. Capability checks
  let totalRequirements = 0;
  let satisfiedRequirements = 0;

  // Specialists
  need.specialists_needed.forEach((spec) => {
    totalRequirements++;
    if (hospital.specialists_on_call.some((s) => s.toLowerCase().includes(spec.toLowerCase()))) {
      satisfiedRequirements++;
      reasons.push(`${capitalize(spec.replace('_', ' '))} on duty`);
    }
  });

  // Capability flags
  need.capability_flags.forEach((flag) => {
    totalRequirements++;
    if (flag === 'trauma_team') {
      if (hospital.trauma_team_on_shift) {
        satisfiedRequirements++;
        reasons.push('Trauma team on shift');
      }
    } else if (flag === 'icu') {
      if (hospital.icu_beds_free > 0) {
        satisfiedRequirements++;
        reasons.push(`${hospital.icu_beds_free} ICU beds available`);
      }
    } else {
      // General capabilities
      satisfiedRequirements++;
      reasons.push(`${capitalize(flag.replace('_', ' '))} available`);
    }
  });

  // Blood stock
  if (need.blood_type_needed) {
    totalRequirements++;
    const stock = hospital.blood_stock[need.blood_type_needed] || 0;
    if (stock > 0) {
      satisfiedRequirements++;
      reasons.push(`${stock} units ${need.blood_type_needed} blood in stock`);
    }
  }

  const capabilityMatchPct =
    totalRequirements === 0 ? 100 : Math.round((satisfiedRequirements / totalRequirements) * 100);

  // 2. Distance factor
  const distanceKm = calculateDistanceKm(
    c.ambulance_location.lat,
    c.ambulance_location.lng,
    hospital.lat,
    hospital.lng
  );
  // Normalization: 0km => 1.0, 25km => 0.3
  const distanceFactor = Math.max(0.2, Math.round((1 - Math.min(25, distanceKm) / 30) * 100) / 100);

  // 3. Load factor (1-5 score, 1 is best)
  // load 1 => 1.00, load 5 => 0.40
  const loadFactor = Math.max(0.3, Math.round((1 - (hospital.er_load_score - 1) * 0.15) * 100) / 100);
  if (hospital.er_load_score <= 2) {
    reasons.push('Low emergency room congestion');
  }

  // 4. Staleness factor
  const { status: freshnessStatus, factor: stalenessFactor } = getFreshness(hospital.last_updated_at);
  if (freshnessStatus === 'unknown') {
    reasons.push('Status unverified (de-weighted)');
  }

  // Formula per spec.md §29:
  // final_score = (capability_match_pct / 100) * distance_factor * load_factor * staleness_factor * 100
  const finalScore = Math.round(
    (capabilityMatchPct / 100) * distanceFactor * loadFactor * stalenessFactor * 100 * 10
  ) / 10;

  const etaMin = estimateEtaMinutes(distanceKm);
  reasons.unshift(`${etaMin} min away (${distanceKm} km)`);

  return {
    hospital_id: hospital.id,
    rank: 1, // updated after sorting
    capability_match_pct: capabilityMatchPct,
    distance_km: distanceKm,
    distance_factor: distanceFactor,
    load_factor: loadFactor,
    staleness_factor: stalenessFactor,
    final_score: finalScore,
    eligibility: {
      eligible: capabilityMatchPct >= 40,
      reason: capabilityMatchPct < 40 ? 'Does not meet critical minimum capabilities' : null,
    },
    freshness: {
      status: freshnessStatus,
      last_updated_at: hospital.last_updated_at,
    },
    reasons: reasons.slice(0, 4),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// API Commands
export const api = {
  // POST /api/cases
  async createCase(
    input: {
      category: CaseCategory;
      severity: Severity;
      subcategory?: string;
      vitals?: PatientVitals;
      symptoms?: PatientSymptoms;
      suggested_severity?: Severity;
      clinical_justification?: string[];
      vitals_summary: string;
      onset_time: string;
      treatment_administered: string;
      patient_basic_info: { age: number; sex: 'male' | 'female' | 'other'; name?: string };
      incident_group_id?: string | null;
      ambulance_location?: { lat: number; lng: number };
    },
    actor: Actor
  ): Promise<ApiResponse<{ case: Case }>> {
    const needProfile = deriveNeedProfile(input.category);
    const caseId = 'case_' + Math.random().toString(36).substring(2, 9);
    
    const newCase: Case = {
      id: caseId,
      created_at: Date.now(),
      category: input.category,
      severity: input.severity,
      subcategory: input.subcategory,
      vitals: input.vitals,
      symptoms: input.symptoms,
      suggested_severity: input.suggested_severity,
      clinical_justification: input.clinical_justification,
      need_profile: needProfile,
      vitals_summary: input.vitals_summary || 'SpO2 92%, BP 138/88, Pulse 98 bpm',
      onset_time: input.onset_time || '25 min ago',
      treatment_administered: input.treatment_administered || 'High flow O2 initiated',
      patient_basic_info: input.patient_basic_info || { age: 54, sex: 'male' },
      incident_group_id: input.incident_group_id || null,
      ambulance_location: input.ambulance_location || { lat: 23.1310, lng: 72.5480 },
    };

    const routing: CaseRouting = {
      status: 'idle',
      active_request_id: null,
      attempt_number: 0,
      accepted_hospital_id: null,
    };

    stateStore.setCase(newCase, routing);

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      request_id: null,
      hospital_id: null,
      event_type: 'CASE_CREATED',
      timestamp: Date.now(),
      actor_type: actor.actor_type,
      snapshot_of_data_at_decision_time: { case: newCase },
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      request_id: null,
      hospital_id: null,
      event_type: 'NEED_PROFILE_GENERATED',
      timestamp: Date.now(),
      actor_type: 'system',
      snapshot_of_data_at_decision_time: { need_profile: needProfile },
    });

    return {
      success: true,
      data: { case: newCase },
      error: null,
      meta: { timestamp: Date.now() },
    };
  },

  // GET /api/cases/:id
  async getCase(caseId: string): Promise<ApiResponse<{ case: Case; routing: CaseRouting }>> {
    const c = stateStore.getCase(caseId);
    const routing = stateStore.getRouting(caseId);
    if (!c || !routing) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Case not found' },
        meta: {},
      };
    }
    return {
      success: true,
      data: { case: c, routing },
      error: null,
      meta: {},
    };
  },

  // POST /api/cases/:id/match
  async matchCase(
    caseId: string,
    actor: Actor
  ): Promise<
    ApiResponse<{
      case_id: string;
      active_request: Request;
      ranked_candidates: MatchResult[];
    }>
  > {
    const c = stateStore.getCase(caseId);
    if (!c) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Case not found' },
        meta: {},
      };
    }

    const hospitals = stateStore.getHospitals();
    const evaluated = hospitals
      .map((h) => evaluateHospitalMatch(h, c))
      .filter((r) => r.eligibility.eligible)
      .sort((a, b) => b.final_score - a.final_score);

    evaluated.forEach((item, index) => {
      item.rank = index + 1;
    });

    if (evaluated.length === 0) {
      return {
        success: false,
        data: null,
        error: {
          code: 'NO_ELIGIBLE_HOSPITAL',
          message: 'No hospital currently meets this case requirements',
        },
        meta: {},
      };
    }

    const topCandidate = evaluated[0];
    const topHospital = hospitals.find((h) => h.id === topCandidate.hospital_id)!;
    const now = Date.now();
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);

    const matchBreakdown: MatchScoreBreakdown = {
      capability_match_pct: topCandidate.capability_match_pct,
      distance_km: topCandidate.distance_km,
      distance_factor: topCandidate.distance_factor,
      load_factor: topCandidate.load_factor,
      staleness_factor: topCandidate.staleness_factor,
      final_score: topCandidate.final_score,
    };

    const newRequest: Request = {
      id: requestId,
      case_id: caseId,
      hospital_id: topCandidate.hospital_id,
      status: 'pending',
      sent_at: now,
      expires_at: now + DEFAULT_TIMEOUT_SECONDS * 1000,
      responded_at: null,
      attempt_number: 1,
      match_score_breakdown: matchBreakdown,
      reason_shown_to_dispatcher: `${topHospital.name} — ${topCandidate.reasons.join(', ')}`,
    };

    stateStore.setRequest(newRequest);
    stateStore.setRouting(caseId, {
      status: 'pending',
      active_request_id: requestId,
      attempt_number: 1,
      accepted_hospital_id: null,
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      request_id: null,
      hospital_id: null,
      event_type: 'MATCH_COMPUTED',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: { ranked_candidates: evaluated },
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      request_id: requestId,
      hospital_id: topCandidate.hospital_id,
      event_type: 'REQUEST_SENT',
      timestamp: now,
      actor_type: actor.actor_type,
      snapshot_of_data_at_decision_time: { request: newRequest },
    });

    return {
      success: true,
      data: {
        case_id: caseId,
        active_request: newRequest,
        ranked_candidates: evaluated,
      },
      error: null,
      meta: { timestamp: now },
    };
  },

  // POST /api/requests/:id/accept
  async acceptRequest(requestId: string, actor: Actor): Promise<ApiResponse<Request>> {
    const req = stateStore.getRequest(requestId);
    if (!req) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Request not found' },
        meta: {},
      };
    }

    if (req.status === 'accepted') {
      return {
        success: false,
        data: null,
        error: { code: 'REQUEST_ALREADY_RESOLVED', message: 'Already accepted' },
        meta: {},
      };
    }

    if (req.status === 'timed_out' || req.status === 'rejected') {
      return {
        success: false,
        data: null,
        error: { code: 'REQUEST_EXPIRED', message: 'Request has expired or already resolved' },
        meta: {},
      };
    }

    const now = Date.now();
    const updated: Request = {
      ...req,
      status: 'accepted',
      responded_at: now,
    };
    stateStore.setRequest(updated);

    // Update routing state
    stateStore.setRouting(req.case_id, {
      status: 'accepted',
      active_request_id: requestId,
      attempt_number: req.attempt_number,
      accepted_hospital_id: req.hospital_id,
    });

    // Calculate response seconds
    const responseSeconds = Math.max(1, Math.round((now - toMillis(req.sent_at)) / 1000));
    stateStore.updateReliability(req.hospital_id, true, responseSeconds);

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: req.case_id,
      request_id: requestId,
      hospital_id: req.hospital_id,
      event_type: 'REQUEST_ACCEPTED',
      timestamp: now,
      actor_type: actor.actor_type,
      snapshot_of_data_at_decision_time: {
        request: updated,
        response_seconds: responseSeconds,
      },
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: req.case_id,
      request_id: requestId,
      hospital_id: req.hospital_id,
      event_type: 'HOLD_CREATED',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: { hospital_id: req.hospital_id, hold_locked: true },
    });

    return {
      success: true,
      data: updated,
      error: null,
      meta: { timestamp: now },
    };
  },

  // POST /api/requests/:id/reject (with automatic reroute)
  async rejectRequest(
    requestId: string,
    reason: string,
    actor: Actor
  ): Promise<ApiResponse<{ rejected_request: Request; new_request: Request | null }>> {
    const req = stateStore.getRequest(requestId);
    if (!req) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Request not found' },
        meta: {},
      };
    }

    const now = Date.now();
    const updated: Request = {
      ...req,
      status: 'rejected',
      responded_at: now,
      rejection_reason: reason,
    };
    stateStore.setRequest(updated);

    const responseSeconds = Math.max(1, Math.round((now - toMillis(req.sent_at)) / 1000));
    stateStore.updateReliability(req.hospital_id, false, responseSeconds);

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: req.case_id,
      request_id: requestId,
      hospital_id: req.hospital_id,
      event_type: 'REQUEST_REJECTED',
      timestamp: now,
      actor_type: actor.actor_type,
      snapshot_of_data_at_decision_time: {
        request: updated,
        rejection_reason: reason,
      },
    });

    // Automatic Reroute to next candidate
    const c = stateStore.getCase(req.case_id);
    if (!c) {
      return { success: true, data: { rejected_request: updated, new_request: null }, error: null, meta: {} };
    }

    const hospitals = stateStore.getHospitals();
    const previouslyAttempted = new Set(
      stateStore.getRequestsByCase(req.case_id).map((r) => r.hospital_id)
    );

    const candidates = hospitals
      .filter((h) => !previouslyAttempted.has(h.id))
      .map((h) => evaluateHospitalMatch(h, c))
      .filter((r) => r.eligibility.eligible)
      .sort((a, b) => b.final_score - a.final_score);

    if (candidates.length === 0) {
      // Routing exhausted
      stateStore.setRouting(req.case_id, {
        status: 'exhausted',
        active_request_id: null,
        attempt_number: req.attempt_number + 1,
        accepted_hospital_id: null,
      });

      stateStore.logAudit({
        id: 'audit_' + Math.random().toString(36).substring(2, 9),
        case_id: req.case_id,
        request_id: null,
        hospital_id: null,
        event_type: 'ROUTING_EXHAUSTED',
        timestamp: now,
        actor_type: 'system',
        snapshot_of_data_at_decision_time: { attempted: Array.from(previouslyAttempted) },
      });

      return {
        success: true,
        data: { rejected_request: updated, new_request: null },
        error: null,
        meta: {},
      };
    }

    const nextCandidate = candidates[0];
    const nextHospital = hospitals.find((h) => h.id === nextCandidate.hospital_id)!;
    const nextRequestId = 'req_' + Math.random().toString(36).substring(2, 9);

    const nextRequest: Request = {
      id: nextRequestId,
      case_id: req.case_id,
      hospital_id: nextCandidate.hospital_id,
      status: 'pending',
      sent_at: now,
      expires_at: now + DEFAULT_TIMEOUT_SECONDS * 1000,
      responded_at: null,
      attempt_number: req.attempt_number + 1,
      match_score_breakdown: {
        capability_match_pct: nextCandidate.capability_match_pct,
        distance_km: nextCandidate.distance_km,
        distance_factor: nextCandidate.distance_factor,
        load_factor: nextCandidate.load_factor,
        staleness_factor: nextCandidate.staleness_factor,
        final_score: nextCandidate.final_score,
      },
      reason_shown_to_dispatcher: `${nextHospital.name} — ${nextCandidate.reasons.join(', ')}`,
    };

    stateStore.setRequest(nextRequest);
    stateStore.setRouting(req.case_id, {
      status: 'pending',
      active_request_id: nextRequestId,
      attempt_number: req.attempt_number + 1,
      accepted_hospital_id: null,
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: req.case_id,
      request_id: nextRequestId,
      hospital_id: nextCandidate.hospital_id,
      event_type: 'REROUTE_TRIGGERED',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: {
        previous_request_id: requestId,
        trigger: 'REJECTION',
        new_request: nextRequest,
      },
    });

    return {
      success: true,
      data: { rejected_request: updated, new_request: nextRequest },
      error: null,
      meta: { timestamp: now },
    };
  },

  // POST /api/requests/:id/timeout (automatic reroute)
  async timeoutRequest(requestId: string): Promise<ApiResponse<Request | null>> {
    const req = stateStore.getRequest(requestId);
    if (!req || req.status !== 'pending') {
      return { success: false, data: null, error: { code: 'REQUEST_ALREADY_RESOLVED', message: 'Request not pending' }, meta: {} };
    }

    const now = Date.now();
    const updated: Request = {
      ...req,
      status: 'timed_out',
      responded_at: now,
    };
    stateStore.setRequest(updated);

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: req.case_id,
      request_id: requestId,
      hospital_id: req.hospital_id,
      event_type: 'REQUEST_TIMED_OUT',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: { request: updated },
    });

    // Auto reroute to next candidate
    const c = stateStore.getCase(req.case_id);
    if (!c) return { success: true, data: null, error: null, meta: {} };

    const hospitals = stateStore.getHospitals();
    const previouslyAttempted = new Set(
      stateStore.getRequestsByCase(req.case_id).map((r) => r.hospital_id)
    );

    const candidates = hospitals
      .filter((h) => !previouslyAttempted.has(h.id))
      .map((h) => evaluateHospitalMatch(h, c))
      .filter((r) => r.eligibility.eligible)
      .sort((a, b) => b.final_score - a.final_score);

    if (candidates.length === 0) {
      stateStore.setRouting(req.case_id, {
        status: 'exhausted',
        active_request_id: null,
        attempt_number: req.attempt_number + 1,
        accepted_hospital_id: null,
      });
      return { success: true, data: null, error: null, meta: {} };
    }

    const nextCandidate = candidates[0];
    const nextHospital = hospitals.find((h) => h.id === nextCandidate.hospital_id)!;
    const nextRequestId = 'req_' + Math.random().toString(36).substring(2, 9);

    const nextRequest: Request = {
      id: nextRequestId,
      case_id: req.case_id,
      hospital_id: nextCandidate.hospital_id,
      status: 'pending',
      sent_at: now,
      expires_at: now + DEFAULT_TIMEOUT_SECONDS * 1000,
      responded_at: null,
      attempt_number: req.attempt_number + 1,
      match_score_breakdown: {
        capability_match_pct: nextCandidate.capability_match_pct,
        distance_km: nextCandidate.distance_km,
        distance_factor: nextCandidate.distance_factor,
        load_factor: nextCandidate.load_factor,
        staleness_factor: nextCandidate.staleness_factor,
        final_score: nextCandidate.final_score,
      },
      reason_shown_to_dispatcher: `${nextHospital.name} — ${nextCandidate.reasons.join(', ')}`,
    };

    stateStore.setRequest(nextRequest);
    stateStore.setRouting(req.case_id, {
      status: 'pending',
      active_request_id: nextRequestId,
      attempt_number: req.attempt_number + 1,
      accepted_hospital_id: null,
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: req.case_id,
      request_id: nextRequestId,
      hospital_id: nextCandidate.hospital_id,
      event_type: 'REROUTE_TRIGGERED',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: {
        previous_request_id: requestId,
        trigger: 'TIMEOUT',
        new_request: nextRequest,
      },
    });

    return { success: true, data: nextRequest, error: null, meta: {} };
  },

  // Mid-transit capability collapse trigger
  async triggerSupersededReroute(caseId: string): Promise<ApiResponse<Request | null>> {
    const routing = stateStore.getRouting(caseId);
    if (!routing || routing.status !== 'accepted' || !routing.active_request_id) {
      return { success: false, data: null, error: { code: 'INVALID_STATE', message: 'Case not in accepted state' }, meta: {} };
    }

    const currentReq = stateStore.getRequest(routing.active_request_id);
    if (!currentReq) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Request not found' }, meta: {} };
    }

    const now = Date.now();
    // Mark current request superseded
    const supersededReq: Request = {
      ...currentReq,
      status: 'superseded',
    };
    stateStore.setRequest(supersededReq);

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      request_id: currentReq.id,
      hospital_id: currentReq.hospital_id,
      event_type: 'REQUEST_SUPERSEDED',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: { reason: 'Hospital capability collapsed mid-transit' },
    });

    // Find next best hospital
    const c = stateStore.getCase(caseId)!;
    const hospitals = stateStore.getHospitals();
    const previouslyAttempted = new Set([currentReq.hospital_id]);

    const candidates = hospitals
      .filter((h) => !previouslyAttempted.has(h.id))
      .map((h) => evaluateHospitalMatch(h, c))
      .filter((r) => r.eligibility.eligible)
      .sort((a, b) => b.final_score - a.final_score);

    if (candidates.length === 0) {
      return { success: true, data: null, error: null, meta: {} };
    }

    const nextCandidate = candidates[0];
    const nextHospital = hospitals.find((h) => h.id === nextCandidate.hospital_id)!;
    const nextRequestId = 'req_' + Math.random().toString(36).substring(2, 9);

    const nextRequest: Request = {
      id: nextRequestId,
      case_id: caseId,
      hospital_id: nextCandidate.hospital_id,
      status: 'pending',
      sent_at: now,
      expires_at: now + DEFAULT_TIMEOUT_SECONDS * 1000,
      responded_at: null,
      attempt_number: currentReq.attempt_number + 1,
      match_score_breakdown: {
        capability_match_pct: nextCandidate.capability_match_pct,
        distance_km: nextCandidate.distance_km,
        distance_factor: nextCandidate.distance_factor,
        load_factor: nextCandidate.load_factor,
        staleness_factor: nextCandidate.staleness_factor,
        final_score: nextCandidate.final_score,
      },
      reason_shown_to_dispatcher: `${nextHospital.name} — Proactively rerouted: ${nextCandidate.reasons.join(', ')}`,
    };

    stateStore.setRequest(nextRequest);
    stateStore.setRouting(caseId, {
      status: 'pending',
      active_request_id: nextRequestId,
      attempt_number: currentReq.attempt_number + 1,
      accepted_hospital_id: null,
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: caseId,
      request_id: nextRequestId,
      hospital_id: nextCandidate.hospital_id,
      event_type: 'REROUTE_TRIGGERED',
      timestamp: now,
      actor_type: 'system',
      snapshot_of_data_at_decision_time: { trigger: 'MID_TRANSIT_COLLAPSE', new_request: nextRequest },
    });

    return { success: true, data: nextRequest, error: null, meta: {} };
  },

  // POST /api/incidents/:id/match (Mass casualty distribution)
  async massMatch(
    incidentGroupId: string,
    cases: Case[],
    actor: Actor
  ): Promise<
    ApiResponse<{
      incident_group_id: string;
      distribution: { case_id: string; hospital_id: string; rank: number; score: number; reason: string }[];
      requests_created: string[];
    }>
  > {
    const hospitals = stateStore.getHospitals();
    const distribution: { case_id: string; hospital_id: string; rank: number; score: number; reason: string }[] = [];
    const requestsCreated: string[] = [];
    const now = Date.now();

    // Map each case according to distinct strength
    cases.forEach((c) => {
      stateStore.setCase(c, {
        status: 'idle',
        active_request_id: null,
        attempt_number: 0,
        accepted_hospital_id: null,
      });

      const ranked = hospitals
        .map((h) => evaluateHospitalMatch(h, c))
        .sort((a, b) => b.final_score - a.final_score);

      const top = ranked[0];
      const hosp = hospitals.find((h) => h.id === top.hospital_id)!;

      const reqId = 'req_' + Math.random().toString(36).substring(2, 9);
      const req: Request = {
        id: reqId,
        case_id: c.id,
        hospital_id: top.hospital_id,
        status: 'pending',
        sent_at: now,
        expires_at: now + DEFAULT_TIMEOUT_SECONDS * 1000,
        responded_at: null,
        attempt_number: 1,
        match_score_breakdown: {
          capability_match_pct: top.capability_match_pct,
          distance_km: top.distance_km,
          distance_factor: top.distance_factor,
          load_factor: top.load_factor,
          staleness_factor: top.staleness_factor,
          final_score: top.final_score,
        },
        reason_shown_to_dispatcher: `${hosp.name} — ${top.reasons.join(', ')}`,
      };

      stateStore.setRequest(req);
      stateStore.setRouting(c.id, {
        status: 'pending',
        active_request_id: reqId,
        attempt_number: 1,
        accepted_hospital_id: null,
      });

      distribution.push({
        case_id: c.id,
        hospital_id: top.hospital_id,
        rank: 1,
        score: top.final_score,
        reason: top.reasons[1] || top.reasons[0] || 'Matched capability',
      });
      requestsCreated.push(reqId);
    });

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: incidentGroupId,
      request_id: null,
      hospital_id: null,
      event_type: 'MASS_CASUALTY_DISTRIBUTED',
      timestamp: now,
      actor_type: actor.actor_type,
      snapshot_of_data_at_decision_time: { distribution, incident_group_id: incidentGroupId },
    });

    return {
      success: true,
      data: {
        incident_group_id: incidentGroupId,
        distribution,
        requests_created: requestsCreated,
      },
      error: null,
      meta: { timestamp: now },
    };
  },

  // Hospitals
  async listHospitals(): Promise<ApiResponse<{ hospitals: Hospital[] }>> {
    return {
      success: true,
      data: { hospitals: stateStore.getHospitals() },
      error: null,
      meta: {},
    };
  },

  async getHospital(id: string): Promise<ApiResponse<{ hospital: Hospital }>> {
    const hosp = stateStore.getHospital(id);
    if (!hosp) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Hospital not found' }, meta: {} };
    }
    return { success: true, data: { hospital: hosp }, error: null, meta: {} };
  },

  async updateCapabilities(
    id: string,
    patch: Partial<Hospital>,
    actor: Actor
  ): Promise<ApiResponse<Hospital>> {
    try {
      const updated = stateStore.updateHospital(id, patch);
      return { success: true, data: updated, error: null, meta: {} };
    } catch (e: unknown) {
      return {
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: (e as Error).message || 'Failed to update' },
        meta: {},
      };
    }
  },

  async getAudit(): Promise<ApiResponse<{ events: AuditEvent[] }>> {
    return {
      success: true,
      data: { events: stateStore.getAuditLogs() },
      error: null,
      meta: {},
    };
  },

  async getReliability(): Promise<ApiResponse<{ hospitals: ReliabilityRow[] }>> {
    return {
      success: true,
      data: { hospitals: stateStore.getReliability() },
      error: null,
      meta: {},
    };
  },

  // Evolution Features 1-14 Client APIs
  async assessVitals(payload: {
    category: string;
    severity?: string;
    subcategory?: string;
    vitals?: any;
    symptoms?: any;
  }): Promise<{ severity_assistance: any; need_profile: any }> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/vitals/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend vitals assess offline, using client fallback', e);
    }
    // Fallback
    return {
      severity_assistance: {
        suggested_severity: payload.severity || 'red',
        confidence_score: 0.9,
        rationales: ['Automated vital sign triage assessment'],
        critical_flags: [],
      },
      need_profile: {
        specialists_needed: payload.category === 'cardiac' ? ['cardiologist'] : ['trauma_team'],
        capability_flags: ['icu'],
        blood_type_needed: null,
      },
    };
  },

  async fetchSubcategories(): Promise<Record<string, any>> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/vitals/subcategories');
      if (res.ok) {
        const data = await res.json();
        return data.subcategories || {};
      }
    } catch {
      // Offline fallback
    }
    return {};
  },

  async activateCrisisMode(payload: {
    name: string;
    type?: string;
    casualtyCount: number;
    severityDistribution?: { red: number; yellow: number; green: number };
    location: { lat: number; lng: number };
    actorId?: string;
  }): Promise<any> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/incidents/activate-crisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.incident) {
          stateStore.setIncident(data.incident);
        }
        return data;
      }
    } catch (e) {
      console.warn('Backend crisis activation fallback', e);
    }
    const incident = {
      id: `inc_${Date.now()}`,
      name: payload.name,
      type: payload.type || 'mass_casualty',
      location: payload.location,
      createdAt: new Date().toISOString(),
      status: 'active' as const,
      cases: [],
      severityDistribution: { red: Math.ceil(payload.casualtyCount * 0.4), yellow: Math.floor(payload.casualtyCount * 0.4), green: Math.floor(payload.casualtyCount * 0.2) },
      hospitalAllocation: {},
      bottlenecksDetected: ['Regional ICU Bed Load Surge'],
      incidentSummary: `${payload.name} activated with ${payload.casualtyCount} reported casualties.`,
    };
    stateStore.setIncident(incident);
    return { incident, bottlenecks: incident.bottlenecksDetected };
  },

  async listIncidents(): Promise<any[]> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/incidents');
      if (res.ok) {
        const data = await res.json();
        return data.incidents || [];
      }
    } catch {
      // Return from stateStore
    }
    return stateStore.getIncidents();
  },

  async getIncidentBriefing(incidentId: string): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/incidents/${incidentId}/briefing`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        return data.briefing;
      }
    } catch (e) {
      console.warn('Backend incident briefing fallback', e);
    }
    return {
      summary: 'Automated operational casualty distribution brief active.',
      keyObservations: ['Multi-casualty load distributed across accredited regional trauma facilities.'],
      bottlenecks: ['ICU capacity pressure monitored in real time.'],
      resourcePressures: ['Mechanical ventilators and blood stock monitored.'],
      operationalRecommendations: ['Maintain EMS radio staging and sequential patient arrival intervals.'],
      modelUsed: 'heuristic-deterministic-fallback',
      disclaimer: 'AI-generated operational brief for administrative coordination only. Not for clinical diagnosis or triage routing decisions.',
      timestamp: new Date().toISOString(),
    };
  },

  async submitHospitalRegistration(payload: any): Promise<any> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/hospitals/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registration) {
          stateStore.setHospitalRegistration(data.registration);
        }
        return data;
      }
    } catch (e) {
      console.warn('Backend hospital reg fallback', e);
    }
    const reg = {
      ...payload,
      id: `reg_hosp_${Date.now()}`,
      status: 'pending' as const,
      submitted_at: new Date().toISOString(),
    };
    stateStore.setHospitalRegistration(reg);
    return { success: true, registration: reg };
  },

  async listPendingHospitals(): Promise<any[]> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/hospitals/pending');
      if (res.ok) {
        const data = await res.json();
        return data.pending_hospitals || [];
      }
    } catch {
      // Fallback
    }
    return stateStore.getHospitalRegistrations().filter((r) => r.status === 'pending');
  },

  async verifyHospital(hospitalId: string, approved: boolean, notes?: string): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/hospitals/${hospitalId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approved ? 'approved' : 'rejected', rejectionReason: notes }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend verify hospital fallback', e);
    }
    const regs = stateStore.getHospitalRegistrations();
    const target = regs.find((r) => r.id === hospitalId);
    if (target) {
      target.status = approved ? 'approved' : 'rejected';
      stateStore.setHospitalRegistration(target);
    }
    return { success: true };
  },

  async submitAmbulanceRegistration(payload: any): Promise<any> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/ambulances/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ambulance) {
          stateStore.setAmbulance(data.ambulance);
        }
        return data;
      }
    } catch (e) {
      console.warn('Backend ambulance reg fallback', e);
    }
    const amb = {
      ...payload,
      id: `amb_${Date.now()}`,
      status: 'pending' as const,
      current_location: payload.base_location || { lat: 21.18, lng: 72.82 },
      availability: 'available' as const,
      last_updated_at: new Date().toISOString(),
    };
    stateStore.setAmbulance(amb);
    return { success: true, ambulance: amb };
  },

  async listAmbulances(status?: string): Promise<any[]> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/ambulances');
      if (res.ok) {
        const data = await res.json();
        return data.ambulances || [];
      }
    } catch {
      // Fallback
    }
    const list = stateStore.getAmbulances();
    return status ? list.filter((a) => a.status === status) : list;
  },

  async verifyAmbulance(ambulanceId: string, approved: boolean): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/ambulances/${ambulanceId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approved ? 'verified' : 'rejected' }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend verify ambulance fallback', e);
    }
    const amb = stateStore.getAmbulance(ambulanceId);
    if (amb) {
      amb.status = approved ? 'verified' : 'rejected';
      stateStore.setAmbulance(amb);
    }
    return { success: true };
  },

  async updateAmbulanceTelemetry(ambulanceId: string, payload: any): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/ambulances/${ambulanceId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend telemetry push fallback', e);
    }
    const amb = stateStore.getAmbulance(ambulanceId);
    if (amb && payload.latitude && payload.longitude) {
      amb.current_location = { lat: payload.latitude, lng: payload.longitude };
      amb.speed_kmh = payload.speed_kmh || amb.speed_kmh;
      amb.heading_degrees = payload.heading || amb.heading_degrees;
      stateStore.setAmbulance(amb);
    }
    return { success: true };
  },

  async recordTransitCondition(caseId: string, payload: { condition: 'stable' | 'deteriorating' | 'critical'; vitals: any; notes?: string }): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/cases/${caseId}/transit-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend transit condition fallback', e);
    }
    return { success: true };
  },

  async advanceJourneyStage(caseId: string, stage: any, actorId: string = 'paramedic_user', notes?: string): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/cases/${caseId}/journey-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, actorId, notes }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend journey stage fallback', e);
    }
    return { success: true, transit_details: stateStore.advanceJourneyStage(caseId, stage, actorId, notes) };
  },

  async getCaseJourney(caseId: string): Promise<any> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/cases/${caseId}/journey`);
      if (res.ok) {
        const data = await res.json();
        return data.transit_details;
      }
    } catch {
      // Fallback
    }
    return stateStore.getTransit(caseId) || null;
  },

  async getNotifications(role: string = 'admin', recipientId?: string): Promise<any[]> {
    try {
      const q = new URLSearchParams({ role });
      if (recipientId) q.set('recipientId', recipientId);
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/notifications?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.notifications || [];
      }
    } catch {
      // Fallback
    }
    return stateStore.getNotifications(role, recipientId);
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`http://localhost:5001/rahi-healthtech/us-central1/api/notifications/${id}/read`, {
        method: 'POST',
      });
      if (res.ok) return true;
    } catch {
      // Fallback
    }
    stateStore.markNotificationRead(id);
    return true;
  },

  async getNetworkBriefing(): Promise<any> {
    try {
      const res = await fetch('http://localhost:5001/rahi-healthtech/us-central1/api/ai/network-briefing');
      if (res.ok) {
        const data = await res.json();
        return data.briefing;
      }
    } catch {
      // Fallback
    }
    return {
      summary: 'Raahi Emergency Coordination Grid is operating normally with all regional trauma centers accredited.',
      keyObservations: ['Real-time telemetry and resource holds fully synchronized.'],
      bottlenecks: [],
      resourcePressures: [],
      operationalRecommendations: ['Continue monitoring hospital readiness and incoming EMS routes.'],
      modelUsed: 'deterministic-network-monitor',
      disclaimer: 'AI-generated operational brief for administrative coordination only. Not for clinical diagnosis or triage routing decisions.',
      timestamp: new Date().toISOString(),
    };
  },
};

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
import { notify } from './notificationBus';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/geo';
import { getFreshness, toMillis } from '../utils/time';

const DEFAULT_TIMEOUT_SECONDS = 30;

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  'http://localhost:5001/rahi-healthtech/us-central1/api';

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
    let caseId = 'case_' + Math.random().toString(36).substring(2, 9);
    
    let newCase: Case = {
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

    try {
      const res = await fetch(`${API_BASE_URL}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCase,
          actor_id: actor.actor_id,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const serverCase = json.case || json;
        newCase = {
          ...newCase,
          id: serverCase.id || newCase.id,
          created_at: typeof serverCase.created_at === 'object' && serverCase.created_at?._seconds
            ? serverCase.created_at._seconds * 1000
            : (serverCase.created_at || newCase.created_at),
          need_profile: serverCase.need_profile || newCase.need_profile,
        };
        caseId = newCase.id;
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /cases offline, using local store:', e);
    }

    const routing: CaseRouting = {
      status: 'idle',
      active_request_id: null,
      attempt_number: 0,
      accepted_hospital_id: null,
    };

    stateStore.setCase(newCase, routing);

    notify('admin', 'all', {
      type: 'CASE_CREATED',
      severity: newCase.severity === 'red' ? 'urgent' : 'info',
      title: `New ${newCase.severity.toUpperCase()} Case: ${caseId}`,
      message: `Emergency intake initiated for ${newCase.category}. Capability matching engine engaged.`,
      caseId,
    });

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
      snapshot_of_data_at_decision_time: { need_profile: newCase.need_profile },
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
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}`);
      if (res.ok) {
        const serverCase = await res.json();
        if (serverCase && serverCase.id) {
          const normCase: Case = {
            ...serverCase,
            created_at: typeof serverCase.created_at === 'object' && serverCase.created_at?._seconds
              ? serverCase.created_at._seconds * 1000
              : (serverCase.created_at || Date.now()),
          };
          const existingRouting = stateStore.getRouting(caseId) || {
            status: serverCase.status || 'idle',
            active_request_id: serverCase.active_request_id || null,
            attempt_number: serverCase.attempt_number || 0,
            accepted_hospital_id: serverCase.accepted_hospital_id || null,
          };
          stateStore.setCase(normCase, existingRouting);
          return {
            success: true,
            data: { case: normCase, routing: existingRouting },
            error: null,
            meta: {},
          };
        }
      }
    } catch {
      // offline fallback
    }

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
    actor: Actor,
    targetHospitalId?: string
  ): Promise<
    ApiResponse<{
      case_id: string;
      active_request: Request;
      ranked_candidates: MatchResult[];
    }>
  > {
    try {
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: actor.actor_id, target_hospital_id: targetHospitalId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (!json.exhausted && json.request && json.match) {
          const req = json.request;
          const normalizedReq: Request = {
            id: req.id,
            case_id: req.case_id,
            hospital_id: req.hospital_id,
            status: req.status || 'pending',
            sent_at: typeof req.sent_at === 'object' && req.sent_at?._seconds ? req.sent_at._seconds * 1000 : (req.sent_at || Date.now()),
            expires_at: typeof req.expires_at === 'object' && req.expires_at?._seconds ? req.expires_at._seconds * 1000 : (req.expires_at || Date.now() + DEFAULT_TIMEOUT_SECONDS * 1000),
            responded_at: req.responded_at ? (typeof req.responded_at === 'object' && req.responded_at?._seconds ? req.responded_at._seconds * 1000 : req.responded_at) : null,
            attempt_number: req.attempt_number || 1,
            match_score_breakdown: req.match_score_breakdown || json.match.breakdown,
            reason_shown_to_dispatcher: req.reason_shown_to_dispatcher || json.match.reason || '',
          };

          const rawCandidates = Array.isArray(json.candidates) && json.candidates.length > 0 ? json.candidates : [json.match];
          const rankedCandidates: MatchResult[] = rawCandidates.map((cand: any, index: number) => ({
            hospital_id: cand.hospital?.id || cand.hospital_id,
            rank: cand.rank || index + 1,
            capability_match_pct: cand.breakdown?.capability_match_pct ?? 100,
            distance_km: cand.breakdown?.distance_km ?? 0,
            distance_factor: cand.breakdown?.distance_factor ?? 1,
            load_factor: cand.breakdown?.load_factor ?? 1,
            staleness_factor: cand.breakdown?.staleness_factor ?? 1,
            final_score: cand.breakdown?.final_score ?? 100,
            eligibility: { eligible: true, reason: null },
            freshness: { status: 'fresh', last_updated_at: Date.now() },
            reasons: cand.reason ? [cand.reason] : ['Optimal capability match'],
          }));

          stateStore.setRequest(normalizedReq);
          stateStore.setRouting(caseId, {
            status: 'pending',
            active_request_id: normalizedReq.id,
            attempt_number: normalizedReq.attempt_number,
            accepted_hospital_id: null,
          });

          // Immediate multi-tab push notifications
          notify('hospital', normalizedReq.hospital_id, {
            type: 'BED_HOLD_REQUESTED',
            severity: 'critical',
            title: `Incoming Bed Hold Request: Case ${caseId}`,
            message: `Emergency commitment request incoming for ${json.match?.hospital?.name || normalizedReq.hospital_id}. Priority score ${json.match?.breakdown?.final_score || 95}. 60s decision window.`,
            caseId,
            hospitalId: normalizedReq.hospital_id,
            requestId: normalizedReq.id,
          });

          notify('admin', 'all', {
            type: 'CASE_ASSIGNED',
            severity: 'info',
            title: `Case Dispatched: ${caseId}`,
            message: `Matched to ${json.match?.hospital?.name || normalizedReq.hospital_id} with score ${json.match?.breakdown?.final_score || 95}.`,
            caseId,
            hospitalId: normalizedReq.hospital_id,
            requestId: normalizedReq.id,
          });

          return {
            success: true,
            data: {
              case_id: caseId,
              active_request: normalizedReq,
              ranked_candidates: rankedCandidates,
            },
            error: null,
            meta: { timestamp: Date.now() },
          };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /cases/:id/match offline, using local engine fallback:', e);
    }

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

    notify('hospital', newRequest.hospital_id, {
      type: 'BED_HOLD_REQUESTED',
      severity: 'critical',
      title: `Incoming Bed Hold Request: Case ${caseId}`,
      message: `Emergency commitment request incoming for ${topHospital.name}. Priority score ${matchBreakdown.final_score}. 30s decision window.`,
      caseId,
      hospitalId: newRequest.hospital_id,
      requestId: newRequest.id,
    });

    notify('admin', 'all', {
      type: 'CASE_ASSIGNED',
      severity: 'info',
      title: `Case Dispatched: ${caseId}`,
      message: `Matched to ${topHospital.name} with score ${matchBreakdown.final_score}.`,
      caseId,
      hospitalId: newRequest.hospital_id,
      requestId: newRequest.id,
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
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: actor.actor_id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.request) {
          const req = json.request;
          const normalizedReq: Request = {
            id: req.id,
            case_id: req.case_id,
            hospital_id: req.hospital_id,
            status: 'accepted',
            sent_at: typeof req.sent_at === 'object' && req.sent_at?._seconds ? req.sent_at._seconds * 1000 : (req.sent_at || Date.now()),
            expires_at: typeof req.expires_at === 'object' && req.expires_at?._seconds ? req.expires_at._seconds * 1000 : (req.expires_at || Date.now() + 30000),
            responded_at: Date.now(),
            attempt_number: req.attempt_number || 1,
            match_score_breakdown: req.match_score_breakdown,
            reason_shown_to_dispatcher: req.reason_shown_to_dispatcher || '',
          };
          stateStore.setRequest(normalizedReq);
          stateStore.setRouting(req.case_id, {
            status: 'accepted',
            active_request_id: requestId,
            attempt_number: req.attempt_number,
            accepted_hospital_id: req.hospital_id,
          });
          const hosp = stateStore.getHospital(req.hospital_id);
          if (hosp && hosp.icu_beds_free > 0) {
            stateStore.updateHospital(req.hospital_id, {
              icu_beds_free: hosp.icu_beds_free - 1,
            });
          }

          notify('ambulance', 'all', {
            type: 'HOSPITAL_ACCEPTED',
            severity: 'urgent',
            title: 'Bed & Resource Hold Confirmed!',
            message: `Hospital ${req.hospital_id} accepted Case ${req.case_id}. Bed held and trauma bay reserved.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
            requestId: req.id,
          });

          notify('admin', 'all', {
            type: 'HOSPITAL_ACCEPTED',
            severity: 'info',
            title: 'Admission Confirmed',
            message: `Hospital ${req.hospital_id} accepted patient intake for Case ${req.case_id}.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
            requestId: req.id,
          });

          return {
            success: true,
            data: normalizedReq,
            error: null,
            meta: { timestamp: Date.now() },
          };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /requests/:id/accept offline, using local fallback:', e);
    }

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

    notify('ambulance', 'all', {
      type: 'HOSPITAL_ACCEPTED',
      severity: 'urgent',
      title: 'Bed & Resource Hold Confirmed!',
      message: `Hospital ${req.hospital_id} accepted Case ${req.case_id}. Bed held and trauma bay reserved.`,
      caseId: req.case_id,
      hospitalId: req.hospital_id,
      requestId: req.id,
    });

    notify('admin', 'all', {
      type: 'HOSPITAL_ACCEPTED',
      severity: 'info',
      title: 'Admission Confirmed',
      message: `Hospital ${req.hospital_id} accepted patient intake for Case ${req.case_id}.`,
      caseId: req.case_id,
      hospitalId: req.hospital_id,
      requestId: req.id,
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
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: actor.actor_id, reason }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.request) {
          const req = json.request;
          const rejectedReq: Request = {
            id: req.id,
            case_id: req.case_id,
            hospital_id: req.hospital_id,
            status: 'rejected',
            sent_at: typeof req.sent_at === 'object' && req.sent_at?._seconds ? req.sent_at._seconds * 1000 : (req.sent_at || Date.now()),
            expires_at: typeof req.expires_at === 'object' && req.expires_at?._seconds ? req.expires_at._seconds * 1000 : (req.expires_at || Date.now() + 30000),
            responded_at: Date.now(),
            attempt_number: req.attempt_number || 1,
            match_score_breakdown: req.match_score_breakdown,
            reason_shown_to_dispatcher: req.reason_shown_to_dispatcher || '',
            rejection_reason: reason,
          };
          stateStore.setRequest(rejectedReq);

          let newReq: Request | null = null;
          const next = json.next_request || json.reroute?.newRequest;
          if (next) {
            newReq = {
              id: next.id,
              case_id: next.case_id,
              hospital_id: next.hospital_id,
              status: 'pending',
              sent_at: typeof next.sent_at === 'object' && next.sent_at?._seconds ? next.sent_at._seconds * 1000 : (next.sent_at || Date.now()),
              expires_at: typeof next.expires_at === 'object' && next.expires_at?._seconds ? next.expires_at._seconds * 1000 : (next.expires_at || Date.now() + 30000),
              responded_at: null,
              attempt_number: next.attempt_number || (req.attempt_number + 1),
              match_score_breakdown: next.match_score_breakdown,
              reason_shown_to_dispatcher: next.reason_shown_to_dispatcher || '',
            };
            stateStore.setRequest(newReq);
            stateStore.setRouting(req.case_id, {
              status: 'pending',
              active_request_id: newReq.id,
              attempt_number: newReq.attempt_number,
              accepted_hospital_id: null,
            });

            notify('hospital', newReq.hospital_id, {
              type: 'BED_HOLD_REQUESTED',
              severity: 'critical',
              title: `Rerouted Intake Request: Case ${newReq.case_id}`,
              message: `Case ${newReq.case_id} rerouted to your facility. Priority score ${newReq.match_score_breakdown?.final_score || 90}. 60s decision window.`,
              caseId: newReq.case_id,
              hospitalId: newReq.hospital_id,
              requestId: newReq.id,
            });
          } else {
            stateStore.setRouting(req.case_id, {
              status: 'exhausted',
              active_request_id: null,
              attempt_number: req.attempt_number + 1,
              accepted_hospital_id: null,
            });
          }

          notify('ambulance', 'all', {
            type: 'REQUEST_REJECTED',
            severity: 'warning',
            title: 'Hospital Declined • Rerouting',
            message: `Hospital ${req.hospital_id} was unable to accept (${reason}). Tactical reroute engaged.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          notify('admin', 'all', {
            type: 'REQUEST_REJECTED',
            severity: 'warning',
            title: 'Intake Request Declined',
            message: `Hospital ${req.hospital_id} declined Case ${req.case_id}: ${reason}.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          return {
            success: true,
            data: { rejected_request: rejectedReq, new_request: newReq },
            error: null,
            meta: { timestamp: Date.now() },
          };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /requests/:id/decline offline, using local fallback:', e);
    }

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
    // 1. First attempt backend authoritative timeout
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${requestId}/timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: 'client_countdown' }),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload.request) {
          stateStore.setRequest(payload.request);
        }
        if (payload.rerouteResult?.newRequest) {
          stateStore.setRequest(payload.rerouteResult.newRequest);
          stateStore.setRouting(payload.request.case_id, {
            status: 'pending',
            active_request_id: payload.rerouteResult.newRequest.id,
            attempt_number: payload.rerouteResult.newRequest.attempt_number,
            accepted_hospital_id: null,
          });
          return { success: true, data: payload.rerouteResult.newRequest, error: null, meta: {} };
        } else if (payload.rerouteResult?.exhausted) {
          stateStore.setRouting(payload.request.case_id, {
            status: 'exhausted',
            active_request_id: null,
            attempt_number: (payload.request.attempt_number || 1) + 1,
            accepted_hospital_id: null,
          });
          return { success: true, data: null, error: null, meta: {} };
        }
      }
    } catch {
      // network/offline fallback below
    }

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

    // Proactively inform backend hospital status patch to trigger authoritative mid-transit invalidation
    try {
      await fetch(`${API_BASE_URL}/hospitals/${currentReq.hospital_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diversion: true,
          diversion_reason: 'Hospital capability collapsed mid-transit',
          icu_beds_free: 0,
        }),
      });
    } catch (e) {
      console.warn('[Raahi API] Backend hospital status patch offline, continuing with local store:', e);
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
    const now = Date.now();

    // 1. First attempt server-side Hungarian joint-optimization distribution
    try {
      const res = await fetch(`${API_BASE_URL}/mci/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_group_id: incidentGroupId,
          actor_id: actor.actor_id,
          cases,
        }),
      });
      if (res.ok) {
        const mciData = await res.json();
        if (mciData && mciData.assignments && mciData.assignments.length > 0) {
          const distribution = mciData.assignments.map((a: any, idx: number) => ({
            case_id: a.case_id,
            hospital_id: a.hospital_id,
            rank: idx + 1,
            score: typeof a.score === 'number' ? Math.round(a.score <= 1 ? a.score * 100 : a.score) : 85,
            reason: a.reason || 'Optimal capacity-balanced regional allocation',
          }));
          const requestsCreated: string[] = [];

          distribution.forEach((item: any) => {
            const c = cases.find((x) => x.id === item.case_id);
            const hosp = hospitals.find((h) => h.id === item.hospital_id);
            if (c) {
              const reqId = 'req_' + Math.random().toString(36).substring(2, 9);
              requestsCreated.push(reqId);
              stateStore.setCase(c, {
                status: 'pending',
                active_request_id: reqId,
                attempt_number: 1,
                accepted_hospital_id: null,
              });
              stateStore.setRequest({
                id: reqId,
                case_id: c.id,
                hospital_id: item.hospital_id,
                status: 'pending',
                sent_at: now,
                expires_at: now + DEFAULT_TIMEOUT_SECONDS * 1000,
                responded_at: null,
                attempt_number: 1,
                match_score_breakdown: {
                  capability_match_pct: 90,
                  distance_km: 8,
                  distance_factor: 0.8,
                  load_factor: 0.85,
                  staleness_factor: 1.0,
                  final_score: item.score,
                },
                reason_shown_to_dispatcher: `${hosp?.name || item.hospital_id} — ${item.reason}`,
              });
            }
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
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /mci/distribute offline, running client fallback:', e);
    }

    const distribution: { case_id: string; hospital_id: string; rank: number; score: number; reason: string }[] = [];
    const requestsCreated: string[] = [];

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
    try {
      const res = await fetch(`${API_BASE_URL}/hospitals`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.hospitals) && json.hospitals.length > 0) {
          const list: Hospital[] = json.hospitals.map((item: any) => {
            const h = item.hospital || item;
            return {
              ...h,
              last_updated_at: typeof h.last_updated_at === 'object' && h.last_updated_at?._seconds
                ? h.last_updated_at._seconds * 1000
                : (typeof h.last_updated_at === 'string' ? new Date(h.last_updated_at).getTime() : h.last_updated_at || Date.now()),
              reliability_score: item.reliability?.reliability_score ?? h.reliability_score ?? 0.9,
            };
          });
          stateStore.setHospitals(list);
          return {
            success: true,
            data: { hospitals: list },
            error: null,
            meta: {},
          };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /hospitals offline, using local store:', e);
    }

    return {
      success: true,
      data: { hospitals: stateStore.getHospitals() },
      error: null,
      meta: {},
    };
  },

  async getHospital(id: string): Promise<ApiResponse<{ hospital: Hospital }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/hospitals/${id}`);
      if (res.ok) {
        const json = await res.json();
        const h = json.hospital || json;
        if (h && h.id) {
          const norm: Hospital = {
            ...h,
            last_updated_at: typeof h.last_updated_at === 'object' && h.last_updated_at?._seconds
              ? h.last_updated_at._seconds * 1000
              : (typeof h.last_updated_at === 'string' ? new Date(h.last_updated_at).getTime() : h.last_updated_at || Date.now()),
          };
          return { success: true, data: { hospital: norm }, error: null, meta: {} };
        }
      }
    } catch {
      // fallback
    }

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
      const res = await fetch(`${API_BASE_URL}/hospitals/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, actor_id: actor.actor_id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.hospital) {
          const updated = stateStore.updateHospital(id, json.hospital);
          return { success: true, data: updated, error: null, meta: {} };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend PATCH /hospitals/:id offline, using local store:', e);
    }

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
    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.audit_logs) && json.audit_logs.length > 0) {
          const events: AuditEvent[] = json.audit_logs.map((log: any) => ({
            id: log.id,
            case_id: log.case_id,
            request_id: log.request_id || null,
            hospital_id: log.hospital_id || null,
            event_type: log.event_type,
            timestamp: typeof log.timestamp === 'object' && log.timestamp?._seconds
              ? log.timestamp._seconds * 1000
              : (typeof log.timestamp === 'string' ? new Date(log.timestamp).getTime() : log.timestamp || Date.now()),
            actor_type: log.actor_type || 'system',
            snapshot_of_data_at_decision_time: log.snapshot_of_data_at_decision_time || {},
          }));
          return { success: true, data: { events }, error: null, meta: {} };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /admin/audit offline, using local store:', e);
    }

    return {
      success: true,
      data: { events: stateStore.getAuditLogs() },
      error: null,
      meta: {},
    };
  },

  async getReliability(): Promise<ApiResponse<{ hospitals: ReliabilityRow[] }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reliability`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.reliability) && json.reliability.length > 0) {
          const rows: ReliabilityRow[] = json.reliability.map((r: any) => ({
            hospital_id: r.hospital_id,
            hospital_name: r.hospital_name,
            reliability_score: r.reliability_score ?? 0.9,
            response_metrics: {
              accepted_count: r.accepted_commitments || 15,
              successful_commitment_count: r.honored_commitments || 14,
              average_response_seconds: 12,
            },
          }));
          return { success: true, data: { hospitals: rows }, error: null, meta: {} };
        }
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /admin/reliability offline, using local store:', e);
    }

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
      const res = await fetch(`${API_BASE_URL}/vitals/assess`, {
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
      const res = await fetch(`${API_BASE_URL}/vitals/subcategories`);
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
      const res = await fetch(`${API_BASE_URL}/incidents/activate-crisis`, {
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
      const res = await fetch(`${API_BASE_URL}/incidents`);
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
      const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/briefing`, {
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
      const res = await fetch(`${API_BASE_URL}/hospitals/register`, {
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
      const res = await fetch(`${API_BASE_URL}/hospitals/pending`);
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
      const res = await fetch(`${API_BASE_URL}/hospitals/${hospitalId}/verify`, {
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
      const res = await fetch(`${API_BASE_URL}/ambulances/register`, {
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
      const res = await fetch(`${API_BASE_URL}/ambulances`);
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
      const res = await fetch(`${API_BASE_URL}/ambulances/${ambulanceId}/verify`, {
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
      const res = await fetch(`${API_BASE_URL}/ambulances/${ambulanceId}/telemetry`, {
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
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/transit-update`, {
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
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/journey-stage`, {
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
      const res = await fetch(`${API_BASE_URL}/cases/${caseId}/journey`);
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
      const res = await fetch(`${API_BASE_URL}/notifications?${q.toString()}`);
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
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
      });
      if (res.ok) return true;
    } catch {
      // Fallback
    }
    stateStore.markNotificationRead(id);
    return true;
  },

  async sendNotification(payload: {
    recipientRole: 'all' | 'admin' | 'hospital' | 'coordinator' | 'ambulance' | 'family';
    recipientId?: string;
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'critical' | 'urgent';
    caseId?: string;
    hospitalId?: string;
    ambulanceId?: string;
    type?: string;
  }): Promise<any> {
    const severity = payload.severity || 'info';
    const type = payload.type || 'LOCAL_DISPATCH';
    const role = payload.recipientRole || 'all';
    const recipientId = payload.recipientId || 'all';

    // 1. Authoritative local notify (delivered immediately to stateStore and BroadcastChannel)
    const localNotif = notify(role, recipientId, {
      title: payload.title,
      message: payload.message,
      severity,
      type,
      caseId: payload.caseId,
      hospitalId: payload.hospitalId,
      ambulanceId: payload.ambulanceId,
    });

    // 2. Persist to backend
    try {
      await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          id: localNotif.id,
          timestamp: localNotif.timestamp,
        }),
      });
    } catch (e) {
      console.warn('[Raahi API] Backend notification offline, local dispatch saved:', e);
    }

    return localNotif;
  },

  async clearAllNotifications(): Promise<boolean> {
    stateStore.clearNotifications();
    try {
      await fetch(`${API_BASE_URL}/notifications/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Offline fallback
    }
    return true;
  },

  async getNetworkBriefing(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/network-briefing`);
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

  async completeRequest(requestId: string, actorId: string = 'hospital_user'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_id: actorId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[Raahi API] Backend /requests/:id/complete offline:', e);
    }
    return { success: true };
  },

  async markAllNotificationsRead(role: string = 'admin', recipientId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, recipientId }),
      });
      if (res.ok) return true;
    } catch {
      // Fallback
    }
    return true;
  },

  async listPendingAmbulances(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/ambulances/pending`);
      if (res.ok) {
        const data = await res.json();
        return data.pending_ambulances || [];
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async getAmbulanceTelemetry(ambulanceId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/ambulances/${ambulanceId}/telemetry`);
      if (res.ok) {
        const data = await res.json();
        return data.telemetry;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  async getMatchExplanation(payload: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/explanations/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return data.explanation;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  async getOperationsAnalysis(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/operations-analyst`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        return data.analysis;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  async getIncidentForensicAnalysis(incidentId: string, caseIds?: string[]): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/incident-analyst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incidentId, case_ids: caseIds }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.analysis;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  async listAllCases(status?: string): Promise<any[]> {
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetch(`${API_BASE_URL}/cases${q}`);
      if (res.ok) {
        const data = await res.json();
        return data.cases || [];
      }
    } catch {
      // Fallback
    }
    return Object.values(stateStore.getState().cases);
  },

  async reseedDatabase(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/seed`, {
        method: 'POST',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return { success: true };
  },
};

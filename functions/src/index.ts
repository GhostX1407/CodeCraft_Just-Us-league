/**
 * Raahi Backend Cloud Functions Entry Point
 * 
 * Exposes the REST API and Cloud Functions interface matching docs/api-contract.md.
 * 
 * Owned by Person 2.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

import {
  CaseRepository,
  HospitalRepository,
  RequestRepository,
  AuditRepository,
} from './services/repositories';
import { AiOperationsAnalyst } from './ai/operationsAnalyst';
import { AiIncidentAnalyst } from './ai/incidentAnalyst';
import {
  Case,
  Hospital,
  CaseCategory,
  CaseSeverity,
} from './services/types';

import { nowTimestamp } from './services/timestampUtils';
import { RequestLifecycleService, RequestLifecycleError } from './routing/requestLifecycleService';
import { TimeoutService } from './routing/timeoutService';
import { RerouteService } from './routing/rerouteService';
import { MatchingAdapter } from './services/matchingAdapter';
import { MassCasualtyService } from './services/massCasualtyService';
import { AdminService } from './services/adminService';
import { ExplanationService, ExplanationRequest } from './ai/explanationService';
import { AuditLogger } from './audit/auditLogger';
import { seedAllDemoData } from './data/seedData';
import { generateNeedProfile } from './domain/needProfile';
import {
  evaluateSeverityAssistance,
  generateDynamicNeedProfile,
  EMERGENCY_SUBCATEGORIES,
} from './domain/vitalsIntelligence';
import { CrisisManagementService, IncidentRepository } from './domain/crisisManagement';
import { RegistrationRepository } from './domain/registrations';
import { TrackingAndTransitService, JourneyStage } from './domain/trackingAndTransit';
import { NotificationRepository, RecipientRole } from './domain/notifications';
import { AiOperationsService } from './domain/aiOperations';

// Re-export canonical P1 need profile generator for consumers
export { generateNeedProfile };

/**
 * Health check endpoint for verifying backend deployment & connectivity
 */
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'ok',

    system: 'Raahi Coordination Engine',
    timestamp: new Date().toISOString(),
    phase: 'full_integration',
  });
});

/**
 * Unified API Request Router (docs/api-contract.md)
 */
export const api = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Normalize path removing leading /rahi-healthtech/us-central1/api, /api or /
  const rawPath = (req.path || '')
    .replace(/^\/rahi-healthtech\/us-central1\/api/, '')
    .replace(/^\/api/, '')
    .replace(/^\//, '');
  const pathParts = rawPath.split('/').filter(Boolean);
  const method = req.method;

  try {
    // 0. GET / - Base API documentation & health status
    if (pathParts.length === 0) {
      res.status(200).json({
        status: 'ok',
        system: 'Raahi Coordination Engine Backend API',
        version: '1.0.0',
        ready: true,
        endpoints: [
          { method: 'GET', path: '/hospitals', description: 'List all hospitals with live telemetry & capabilities' },
          { method: 'POST', path: '/cases', description: 'Create a new emergency case with vitals' },
          { method: 'POST', path: '/cases/:id/match', description: 'Run deterministic ranking & capability-match routing' },
          { method: 'GET', path: '/cases/:id', description: 'Fetch case status and routing data' },
          { method: 'GET', path: '/admin/audit', description: 'Stream tamper-evident chronological audit log' },
          { method: 'GET', path: '/admin/reliability', description: 'Compute rolling 30-day SLA hospital reliability metrics' },
          { method: 'GET', path: '/ai/network-briefing', description: 'Generate AI operational network status report' },
          { method: 'POST', path: '/incidents/activate-crisis', description: 'Activate mass-casualty crisis incident protocol' }
        ]
      });
      return;
    }

    // 1. POST /cases - Create Case
    if (method === 'POST' && pathParts[0] === 'cases' && pathParts.length === 1) {
      const body = req.body || {};
      const category: CaseCategory = body.category || 'cardiac';
      const severity: CaseSeverity = body.severity || 'red';

      // Strict location validation: no silent fallback to Surat coordinates!
      const location = body.ambulance_location;
      if (
        !location ||
        typeof location !== 'object' ||
        typeof location.lat !== 'number' ||
        typeof location.lng !== 'number' ||
        !Number.isFinite(location.lat) ||
        !Number.isFinite(location.lng)
      ) {
        res.status(400).json({
          error: 'Valid ambulance_location with numeric lat and lng is required',
          code: 'INVALID_LOCATION',
        });
        return;
      }

      // Dynamic need profile taking into account subcategory, vitals, symptoms, and capability graph DAG dependencies
      const needProfile = generateDynamicNeedProfile(
        category,
        severity,
        body.subcategory,
        body.vitals,
        body.symptoms
      );
      const caseId = body.id || `case_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newCase: Case = {
        id: caseId,
        created_at: nowTimestamp(),
        category,
        severity,
        need_profile: needProfile,
        vitals_summary: body.vitals_summary || '',
        onset_time: body.onset_time || '',
        treatment_administered: body.treatment_administered || '',
        patient_basic_info: body.patient_basic_info,
        incident_group_id: body.incident_group_id || null,
        ambulance_location: { lat: location.lat, lng: location.lng },
        status: 'routing',
        active_request_id: null,
        attempt_number: 0,
        subcategory: body.subcategory,
        vitals: body.vitals,
        symptoms: body.symptoms,
        suggested_severity: body.suggested_severity,
        clinical_justification: body.clinical_justification,
        journey_stage: 'CASE_CREATED',
        transit_condition: 'stable',
      };

      await CaseRepository.create(newCase);

      // Initialize tracking and transit lifecycle
      await TrackingAndTransitService.initializeCaseTransit(caseId, location, body.ambulance_id || 'AMB-01');

      // Send dispatch notifications
      await NotificationRepository.create({
        recipientRole: 'admin',
        type: 'CASE_CREATED',
        severity: severity === 'red' ? 'urgent' : 'info',
        title: `New ${severity.toUpperCase()} Case Created`,
        message: `Case ${caseId} (${category}${body.subcategory ? ` - ${body.subcategory}` : ''}) created and entering routing.`,
        caseId,
      });

      await NotificationRepository.create({
        recipientRole: 'ambulance',
        recipientId: body.ambulance_id || 'AMB-01',
        type: 'NEW_DISPATCH',
        severity: 'info',
        title: `Case Dispatched: ${caseId}`,
        message: `Searching for best matching hospital based on capability profile.`,
        caseId,
      });

      await AuditLogger.log({
        caseId,
        eventType: 'CASE_CREATED',
        actorType: 'ambulance_user',
        actorId: body.actor_id || 'ambulance_demo',
        caseData: newCase,
        needProfile,
      });

      await AuditLogger.log({
        caseId,
        eventType: 'NEED_PROFILE_GENERATED',
        actorType: 'system',
        needProfile,
      });

      res.status(201).json({ success: true, case: newCase });
      return;
    }

    // 1b. GET /cases - List All Cases
    if (method === 'GET' && pathParts[0] === 'cases' && pathParts.length === 1) {
      const allCases = await CaseRepository.listAll();
      res.status(200).json({ cases: allCases });
      return;
    }

    // 2. GET /cases/:caseId - Retrieve Case
    if (method === 'GET' && pathParts[0] === 'cases' && pathParts.length === 2) {
      const caseId = pathParts[1];
      const caseData = await CaseRepository.get(caseId);
      if (!caseData) {
        res.status(404).json({ error: 'Case not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json(caseData);
      return;
    }

    // 3. POST /cases/:caseId/match - Match & Route Case
    if (method === 'POST' && pathParts[0] === 'cases' && pathParts[2] === 'match') {
      const caseId = pathParts[1];
      const caseData = await CaseRepository.get(caseId);
      if (!caseData) {
        res.status(404).json({ error: 'Case not found', code: 'NOT_FOUND' });
        return;
      }

      // Check if already accepted
      if (caseData.status === 'accepted') {
        res.status(400).json({
          error: 'Case is already accepted',
          code: 'CASE_ALREADY_ACCEPTED',
          accepted_hospital_id: caseData.accepted_hospital_id,
        });
        return;
      }

      // Find attempted hospitals to exclude
      const existingReqs = await RequestRepository.listByCase(caseId);
      const attemptedIds = existingReqs.map((r) => r.hospital_id);

      const targetHospitalId = req.body?.target_hospital_id || req.body?.targetHospitalId;
      const allHospitals = await HospitalRepository.listAll();
      const rankedCandidates = MatchingAdapter.rankEligibleCandidates(
        caseData,
        allHospitals,
        attemptedIds
      );

      if (rankedCandidates.length === 0) {
        await CaseRepository.update(caseId, { status: 'exhausted' });
        await NotificationRepository.create({
          recipientRole: 'admin',
          type: 'ROUTING_EXHAUSTED',
          severity: 'critical',
          title: `Routing Exhausted: Case ${caseId}`,
          message: `No eligible hospitals found for Case ${caseId}. Manual intervention required.`,
          caseId,
        });
        await NotificationRepository.create({
          recipientRole: 'ambulance',
          type: 'ROUTING_EXHAUSTED',
          severity: 'critical',
          title: `No Available Hospital`,
          message: `All hospital options exhausted for Case ${caseId}. Contact dispatch coordinator immediately.`,
          caseId,
        });
        res.status(200).json({
          exhausted: true,
          match: null,
          request: null,
          candidates: [],
        });
        return;
      }

      const top = targetHospitalId
        ? (rankedCandidates.find((c) => c.hospital.id === targetHospitalId) || rankedCandidates[0])
        : rankedCandidates[0];
      const attemptNum = (caseData.attempt_number || 0) + 1;

      const request = await RequestLifecycleService.createRequest({
        caseId,
        hospitalId: top.hospital.id,
        attemptNumber: attemptNum,
        matchScoreBreakdown: top.breakdown,
        reasonShownToDispatcher: top.reason,
        hospital: top.hospital,
        caseData,
      });

      // Update journey stage and dispatch match notifications
      await TrackingAndTransitService.updateJourneyStage(
        caseId,
        'HOSPITAL_MATCHED',
        'system',
        'system',
        `Deterministic match: ${top.hospital.name} (Score: ${top.breakdown.final_score})`
      );

      await NotificationRepository.create({
        recipientRole: 'ambulance',
        type: 'HOSPITAL_MATCHED',
        severity: 'info',
        title: `Hospital Matched: ${top.hospital.name}`,
        message: `Compatibility score ${top.breakdown.final_score}. Commitment request transmitted.`,
        caseId,
        hospitalId: top.hospital.id,
        requestId: request.id,
      });

      await NotificationRepository.create({
        recipientRole: 'hospital',
        recipientId: top.hospital.id,
        type: 'BED_HOLD_REQUESTED',
        severity: 'critical',
        title: `Incoming Bed Hold Request: Case ${caseId}`,
        message: `Emergency commitment request incoming for ${top.hospital.name}. Priority score ${top.breakdown.final_score}. 60s decision window.`,
        caseId,
        hospitalId: top.hospital.id,
        requestId: request.id,
      });

      await NotificationRepository.create({
        recipientRole: 'admin',
        type: 'CASE_ASSIGNED',
        severity: 'info',
        title: `Case Dispatched: ${caseId}`,
        message: `Matched to ${top.hospital.name} with score ${top.breakdown.final_score}.`,
        caseId,
        hospitalId: top.hospital.id,
        requestId: request.id,
      });

      res.status(200).json({
        exhausted: false,
        match: top,
        request,
        candidates: rankedCandidates,
      });
      return;
    }

    // 4. POST /requests/:requestId/accept - Accept Request
    if (method === 'POST' && pathParts[0] === 'requests' && pathParts[2] === 'accept') {
      const requestId = pathParts[1];
      const actorId = req.body?.actor_id || 'hospital_user';

      const result = await RequestLifecycleService.acceptRequest(requestId, actorId);

      if (result.success && result.request) {
        await TrackingAndTransitService.updateJourneyStage(
          result.request.case_id,
          'HOSPITAL_ACCEPTED',
          actorId,
          'hospital',
          `Hospital accepted commitment request. Reserving resources.`
        );

        await NotificationRepository.create({
          recipientRole: 'ambulance',
          type: 'HOSPITAL_ACCEPTED',
          severity: 'urgent',
          title: `Bed & Resource Hold Confirmed!`,
          message: `Hospital ${result.request.hospital_id} accepted the case. Proceed immediately.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
        });

        await NotificationRepository.create({
          recipientRole: 'hospital',
          recipientId: result.request.hospital_id,
          type: 'INCOMING_CRITICAL_PATIENT',
          severity: 'urgent',
          title: `Inbound Emergency Patient`,
          message: `Hold active. Prepare trauma/critical care bay for Case ${result.request.case_id}.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
        });

        await NotificationRepository.create({
          recipientRole: 'family',
          type: 'HOSPITAL_CONFIRMED',
          severity: 'info',
          title: `Hospital Confirmed`,
          message: `Your loved one is routed to confirmed facility: ${result.request.hospital_id}.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
        });

        await NotificationRepository.create({
          recipientRole: 'admin',
          type: 'HOSPITAL_ACCEPTED',
          severity: 'info',
          title: `Bed Confirmed: ${result.request.hospital_id}`,
          message: `Hospital ${result.request.hospital_id} accepted Case ${result.request.case_id}. Bed held and bay prepped.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
          requestId: result.request.id,
        });
      }

      res.status(200).json(result);
      return;
    }

    // 5. POST /requests/:requestId/reject (or /decline) - Reject Request & Trigger Reroute
    if (method === 'POST' && pathParts[0] === 'requests' && (pathParts[2] === 'reject' || pathParts[2] === 'decline')) {
      const requestId = pathParts[1];
      const actorId = req.body?.actor_id || 'hospital_user';
      const reason = req.body?.reason || 'Hospital declined case';

      const rejectResult = await RequestLifecycleService.rejectRequest(
        requestId,
        actorId,
        'hospital_user',
        reason
      );

      await NotificationRepository.create({
        recipientRole: 'admin',
        type: 'REQUEST_REJECTED',
        severity: 'warning',
        title: `Request Declined: ${rejectResult.request.hospital_id}`,
        message: `Hospital ${rejectResult.request.hospital_id} declined Case ${rejectResult.request.case_id}: ${reason}. Auto-reroute triggered.`,
        caseId: rejectResult.request.case_id,
        hospitalId: rejectResult.request.hospital_id,
        requestId: rejectResult.request.id,
      });

      await NotificationRepository.create({
        recipientRole: 'ambulance',
        type: 'REQUEST_REJECTED',
        severity: 'warning',
        title: `Hospital Declined Case`,
        message: `Hospital ${rejectResult.request.hospital_id} was unable to accept (${reason}). Tactical reroute engaged.`,
        caseId: rejectResult.request.case_id,
        hospitalId: rejectResult.request.hospital_id,
        requestId: rejectResult.request.id,
      });

      // Auto-reroute to next eligible hospital
      const rerouteResult = await RerouteService.rerouteCase(
        rejectResult.request.case_id,
        `Hospital ${rejectResult.request.hospital_id} rejected: ${reason}`,
        actorId
      );

      res.status(200).json({
        success: true,
        request: rejectResult.request,
        reroute: rerouteResult,
      });
      return;
    }

    // 6. POST /requests/:requestId/timeout - Authoritative Timeout
    if (method === 'POST' && pathParts[0] === 'requests' && pathParts[2] === 'timeout') {
      const requestId = pathParts[1];
      const actorId = req.body?.actor_id || 'system';

      const timeoutResult = await TimeoutService.handleTimeout(requestId, actorId);
      res.status(200).json(timeoutResult);
      return;
    }

    // 6b. GET /requests - List All Requests for Real-Time Cross-Role Sync
    if (method === 'GET' && pathParts[0] === 'requests' && pathParts.length === 1) {
      const snapshot = await RequestRepository.getCollection().get();
      const allReqs = snapshot.docs.map((d) => d.data());
      res.status(200).json({ requests: allReqs });
      return;
    }

    // 7. GET /hospitals - Hospital Network Overview
    if (method === 'GET' && pathParts[0] === 'hospitals' && pathParts.length === 1) {
      const overview = await AdminService.getHospitalNetworkOverview();
      res.status(200).json({ hospitals: overview });
      return;
    }

    // 8. GET /admin/audit - Audit Trail Query
    if (method === 'GET' && pathParts[0] === 'admin' && pathParts[1] === 'audit') {
      const caseId = req.query.caseId as string | undefined;
      const hospitalId = req.query.hospitalId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const logs = await AdminService.queryAuditLogs({ caseId, hospitalId, limit });
      res.status(200).json({ audit_logs: logs });
      return;
    }

    // 9. GET /admin/reliability - Reliability Metrics
    if (method === 'GET' && pathParts[0] === 'admin' && pathParts[1] === 'reliability') {
      const stats = await AdminService.queryReliability();
      res.status(200).json({ reliability: stats });
      return;
    }

    // 10. POST /admin/seed - Database Seeder Trigger
    if (method === 'POST' && pathParts[0] === 'admin' && pathParts[1] === 'seed') {
      const seedResult = await seedAllDemoData();
      res.status(200).json({ success: true, result: seedResult });
      return;
    }

    // 11. POST /explanations/match - AI / Deterministic Explanation
    if (method === 'POST' && pathParts[0] === 'explanations' && pathParts[1] === 'match') {
      const explanationReq = req.body as ExplanationRequest;
      const result = await ExplanationService.explainMatch(explanationReq);
      res.status(200).json(result);
      return;
    }

    // 12. POST /requests/:requestId/complete - Patient Handoff & Hold Consumption (docs/spec.md §14, §105)
    if (method === 'POST' && pathParts[0] === 'requests' && pathParts[2] === 'complete') {
      const requestId = pathParts[1];
      const actorId = req.body?.actor_id || 'hospital_user';
      const result = await RequestLifecycleService.completeHandoff(requestId, actorId);

      if (result.success && result.request) {
        await TrackingAndTransitService.updateJourneyStage(
          result.request.case_id,
          'HANDOFF_COMPLETED',
          actorId,
          'hospital',
          `Clinical handoff completed successfully. Bed hold released/consumed.`
        );

        await NotificationRepository.create({
          recipientRole: 'ambulance',
          type: 'HANDOFF_COMPLETED',
          severity: 'info',
          title: `Handoff Complete`,
          message: `Patient transfer to clinical care completed successfully.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
        });

        await NotificationRepository.create({
          recipientRole: 'family',
          type: 'CARE_TRANSFERRED',
          severity: 'info',
          title: `Patient Safely Admitted`,
          message: `Patient care has been transferred to the hospital clinical team.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
        });

        await NotificationRepository.create({
          recipientRole: 'admin',
          type: 'HANDOFF_COMPLETED',
          severity: 'info',
          title: `Emergency Cycle Complete`,
          message: `Case ${result.request.case_id} handoff completed at hospital ${result.request.hospital_id}.`,
          caseId: result.request.case_id,
          hospitalId: result.request.hospital_id,
        });
      }

      res.status(200).json(result);
      return;
    }

    // 13. PATCH /hospitals/:hospitalId/status or /hospitals/:hospitalId - Operational Status Update
    if (method === 'PATCH' && pathParts[0] === 'hospitals' && (pathParts[2] === 'status' || pathParts.length === 2)) {
      const hospitalId = pathParts[1];
      const currentHosp = await HospitalRepository.get(hospitalId);
      if (!currentHosp) {
        res.status(404).json({ error: 'Hospital not found', code: 'NOT_FOUND' });
        return;
      }

      const body = req.body || {};

      // Invariant A: Countable resources cannot be negative
      if (
        (typeof body.icu_beds_free === 'number' && body.icu_beds_free < 0) ||
        (typeof body.ventilators_free === 'number' && body.ventilators_free < 0) ||
        (body.blood_stock && Object.values(body.blood_stock).some((v: any) => typeof v === 'number' && v < 0))
      ) {
        res.status(400).json({
          error: 'Countable resources cannot be negative',
          code: 'INVALID_RESOURCE_VALUE',
        });
        return;
      }

      const updatedFields: Partial<Hospital> = {
        ...body,
        last_updated_at: nowTimestamp(),
      };
      await HospitalRepository.update(hospitalId, updatedFields);
      const updatedHospital = (await HospitalRepository.get(hospitalId))!;

      // Check all active accepted cases committed to this hospital for capability invalidation
      const allCases = await CaseRepository.listAll();
      const activeAcceptedCases = allCases.filter(
        (c) => c.status === 'accepted' && c.accepted_hospital_id === hospitalId
      );

      const invalidations = [];
      for (const c of activeAcceptedCases) {
        const invRes = await RerouteService.handleMidTransitInvalidation(c.id, updatedHospital);
        if (invRes.invalidated) {
          invalidations.push({
            case_id: c.id,
            reasons: invRes.validation?.reasons || [],
            reroute_status: invRes.exhausted ? 'exhausted' : 'rerouted',
            new_request_id: invRes.newRequest?.id || null,
            new_hospital_id: invRes.newRequest?.hospital_id || null,
          });
        }
      }

      res.status(200).json({
        success: true,
        hospital: updatedHospital,
        invalidations_triggered: invalidations.length,
        invalidations,
      });
      return;
    }

    // 14. POST /mci/distribute - Mass Casualty Regional Joint Distribution (docs/spec.md §63-70)
    if (method === 'POST' && pathParts[0] === 'mci' && pathParts[1] === 'distribute') {
      const incidentGroupId = req.body?.incident_group_id;
      if (!incidentGroupId) {
        res.status(400).json({ error: 'incident_group_id is required', code: 'MISSING_FIELD' });
        return;
      }

      const result = await MassCasualtyService.distributeIncident(incidentGroupId, {
        actorId: req.body?.actor_id || 'system',
        cases: req.body?.cases,
      });
      res.status(200).json(result);
      return;
    }

    // 15. POST /ai/operations-analyst - AI Regional Operations & Bottleneck Analysis
    if (method === 'POST' && pathParts[0] === 'ai' && pathParts[1] === 'operations-analyst') {
      const allHospitals = await HospitalRepository.listAll();
      const recentAudit = await AuditRepository.listRecent(20);
      const result = await AiOperationsAnalyst.analyzeOperations({
        hospitals: allHospitals,
        auditLogs: recentAudit,
      });
      res.status(200).json(result);
      return;
    }

    // 16. POST /ai/incident-analyst - AI Forensic Incident Timeline & Observations
    if (method === 'POST' && pathParts[0] === 'ai' && pathParts[1] === 'incident-analyst') {
      const caseId = req.body?.case_id;
      if (!caseId) {
        res.status(400).json({ error: 'case_id is required', code: 'MISSING_FIELD' });
        return;
      }
      const caseData = await CaseRepository.get(caseId);
      if (!caseData) {
        res.status(404).json({ error: 'Case not found', code: 'NOT_FOUND' });
        return;
      }
      const requests = await RequestRepository.listByCase(caseId);
      const auditLogs = await AuditRepository.listByCase(caseId);
      const result = await AiIncidentAnalyst.analyzeIncident({
        caseData,
        requests,
        auditLogs,
      });
      res.status(200).json(result);
      return;
    }

    // 17. GET /vitals/subcategories - Emergency subcategories dictionary
    if (method === 'GET' && pathParts[0] === 'vitals' && pathParts[1] === 'subcategories') {
      res.status(200).json({ subcategories: EMERGENCY_SUBCATEGORIES });
      return;
    }

    // 18. POST /vitals/assess - Deterministic Severity Assistance & Dynamic Need Profile
    if (method === 'POST' && pathParts[0] === 'vitals' && pathParts[1] === 'assess') {
      const { category, severity, subcategory, vitals, symptoms } = req.body || {};
      const assistance = evaluateSeverityAssistance(category || 'trauma', vitals, symptoms);
      const needProfile = generateDynamicNeedProfile(
        category || 'trauma',
        severity || assistance.suggested_severity,
        subcategory,
        vitals,
        symptoms
      );
      res.status(200).json({
        severity_assistance: assistance,
        need_profile: needProfile,
      });
      return;
    }

    // 19. POST /incidents/activate-crisis - Raahi Crisis Mode
    if (method === 'POST' && pathParts[0] === 'incidents' && pathParts[1] === 'activate-crisis') {
      const { name, type, casualtyCount, location, actorId } = req.body || {};
      if (!name || !casualtyCount || !location) {
        res.status(400).json({ error: 'name, casualtyCount, and location are required', code: 'MISSING_FIELD' });
        return;
      }
      const crisisResult = await CrisisManagementService.activateCrisisMode({
        incidentName: name,
        incidentType: type || 'mass_casualty',
        totalPatients: Number(casualtyCount),
        location,
        actorId: actorId || 'admin_user',
      });

      // Broadcast Crisis Mode notification
      await NotificationRepository.create({
        recipientRole: 'admin',
        type: 'CRISIS_MODE_ACTIVATED',
        severity: 'critical',
        title: `CRISIS MODE ACTIVATED: ${name}`,
        message: `${casualtyCount} casualties reported. Anti-concentration load balancing initiated.`,
        metadata: { incidentId: crisisResult.incident.id, bottlenecks: crisisResult.bottlenecks.length },
      });

      await NotificationRepository.create({
        recipientRole: 'hospital',
        recipientId: 'all',
        type: 'CRISIS_MODE_ACTIVATED',
        severity: 'critical',
        title: `CRISIS ALERT: ${name}`,
        message: `Mass casualty incident declared. Regional trauma network on surge alert.`,
      });

      res.status(201).json(crisisResult);
      return;
    }

    // 20. GET /incidents - List Incidents
    if (method === 'GET' && pathParts[0] === 'incidents' && pathParts.length === 1) {
      const incidents = await IncidentRepository.listAll();
      res.status(200).json({ incidents });
      return;
    }

    // 21. GET /incidents/:id - Get Incident Details
    if (method === 'GET' && pathParts[0] === 'incidents' && pathParts.length === 2) {
      const incident = await IncidentRepository.get(pathParts[1]);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json({ incident });
      return;
    }

    // 22. POST /incidents/:id/briefing - AI Operational Incident Briefing
    if (method === 'POST' && pathParts[0] === 'incidents' && pathParts[2] === 'briefing') {
      const incident = await IncidentRepository.get(pathParts[1]);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found', code: 'NOT_FOUND' });
        return;
      }
      const allCases = await CaseRepository.listAll();
      const incidentCases = allCases.filter(c => incident.cases.includes(c.id));
      const allocations = incidentCases.map(c => ({
        caseId: c.id,
        hospitalId: c.accepted_hospital_id || 'unassigned',
        hospitalName: c.accepted_hospital_id || 'Pending Match',
        severity: c.severity,
      }));
      const briefing = await AiOperationsService.generateIncidentBriefing(incident, allocations);
      res.status(200).json({ briefing });
      return;
    }

    // 23. POST /hospitals/register - Hospital Self-Service Intake
    if (method === 'POST' && pathParts[0] === 'hospitals' && pathParts[1] === 'register') {
      const record = await RegistrationRepository.submitHospital(req.body || {});
      await NotificationRepository.create({
        recipientRole: 'admin',
        type: 'HOSPITAL_PENDING_APPROVAL',
        severity: 'warning',
        title: 'New Hospital Registration Pending',
        message: `${record.name} submitted registration for clinical verification.`,
        hospitalId: record.id,
      });
      res.status(201).json({ success: true, registration: record });
      return;
    }

    // 24. GET /hospitals/pending - List Pending Hospital Registrations
    if (method === 'GET' && pathParts[0] === 'hospitals' && pathParts[1] === 'pending') {
      const pending = await RegistrationRepository.listHospitalRegistrations('pending');
      res.status(200).json({ pending_hospitals: pending });
      return;
    }

    // 25. POST /hospitals/:id/verify - Admin Verify / Approve Hospital
    if (method === 'POST' && pathParts[0] === 'hospitals' && pathParts[2] === 'verify') {
      const hospitalId = pathParts[1];
      const { status, verifiedBy, rejectionReason } = req.body || {};
      if (!status || !['approved', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'status must be "approved" or "rejected"', code: 'INVALID_STATUS' });
        return;
      }
      const approved = status === 'approved';
      const result = await RegistrationRepository.verifyHospital(
        hospitalId,
        approved,
        rejectionReason || '',
        verifiedBy || 'admin'
      );

      await NotificationRepository.create({
        recipientRole: 'hospital',
        recipientId: hospitalId,
        type: 'REGISTRATION_STATUS_UPDATE',
        severity: approved ? 'info' : 'warning',
        title: `Hospital Registration ${status.toUpperCase()}`,
        message: approved 
          ? 'Your hospital has been accredited and activated in the Raahi Emergency Grid.'
          : `Registration was rejected: ${rejectionReason || 'Did not meet requirements'}.`,
        hospitalId,
      });

      res.status(200).json({ success: true, registration: result.registration, hospital: result.hospital });
      return;
    }

    // 26. POST /ambulances/register - Ambulance Self-Service Intake
    if (method === 'POST' && pathParts[0] === 'ambulances' && pathParts[1] === 'register') {
      const record = await RegistrationRepository.submitAmbulance(req.body || {});
      await NotificationRepository.create({
        recipientRole: 'admin',
        type: 'AMBULANCE_PENDING_APPROVAL',
        severity: 'info',
        title: 'Ambulance Registration Pending',
        message: `Ambulance ${record.vehicle_number} (${record.organization}) submitted for verification.`,
        ambulanceId: record.id,
      });
      res.status(201).json({ success: true, ambulance: record });
      return;
    }

    // 27. GET /ambulances - List All Registered Ambulances
    if (method === 'GET' && pathParts[0] === 'ambulances' && pathParts.length === 1) {
      const ambulances = await RegistrationRepository.listAmbulances();
      res.status(200).json({ ambulances });
      return;
    }

    // 28. GET /ambulances/pending - List Pending Ambulances
    if (method === 'GET' && pathParts[0] === 'ambulances' && pathParts[1] === 'pending') {
      const pending = await RegistrationRepository.listAmbulances('pending');
      res.status(200).json({ pending_ambulances: pending });
      return;
    }

    // 29. POST /ambulances/:id/verify - Admin Verify Ambulance
    if (method === 'POST' && pathParts[0] === 'ambulances' && pathParts[2] === 'verify') {
      const ambulanceId = pathParts[1];
      const { status, verifiedBy } = req.body || {};
      if (!status || !['verified', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'status must be "verified" or "rejected"', code: 'INVALID_STATUS' });
        return;
      }
      const approved = status === 'verified';
      const updated = await RegistrationRepository.verifyAmbulance(ambulanceId, approved, verifiedBy || 'admin');
      res.status(200).json({ success: true, ambulance: updated });
      return;
    }

    // 30. POST /ambulances/:id/telemetry - Telemetry Push (Live GPS, Speed, Heading, ETA)
    if (method === 'POST' && pathParts[0] === 'ambulances' && pathParts[2] === 'telemetry') {
      const ambulanceId = pathParts[1];
      const telemetry = await TrackingAndTransitService.updateTelemetry(ambulanceId, req.body || {});
      res.status(200).json({ success: true, telemetry });
      return;
    }

    // 31. GET /ambulances/:id/telemetry - Telemetry Query
    if (method === 'GET' && pathParts[0] === 'ambulances' && pathParts[2] === 'telemetry') {
      const ambulanceId = pathParts[1];
      const telemetry = await TrackingAndTransitService.getTelemetry(ambulanceId);
      if (!telemetry) {
        res.status(404).json({ error: 'Telemetry not found for ambulance', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json({ telemetry });
      return;
    }

    // 32. POST /cases/:id/transit-update - In-Transit Vitals & Condition Update
    if (method === 'POST' && pathParts[0] === 'cases' && pathParts[2] === 'transit-update') {
      const caseId = pathParts[1];
      const { condition, vitals, notes, updatedBy } = req.body || {};
      if (!condition || !['stable', 'deteriorating', 'critical'].includes(condition)) {
        res.status(400).json({ error: 'condition must be "stable", "deteriorating", or "critical"', code: 'INVALID_CONDITION' });
        return;
      }

      const record = await TrackingAndTransitService.recordTransitVitalsUpdate(
        caseId,
        condition,
        vitals,
        notes,
        updatedBy || 'ambulance_paramedic'
      );

      // If deteriorating or critical, immediately notify the receiving hospital!
      if (condition === 'deteriorating' || condition === 'critical') {
        const caseDoc = await CaseRepository.get(caseId);
        const hospitalId = caseDoc?.accepted_hospital_id;

        await NotificationRepository.create({
          recipientRole: 'hospital',
          recipientId: hospitalId || 'all',
          type: 'PATIENT_DETERIORATION_ALERT',
          severity: 'critical',
          title: `CRITICAL IN-TRANSIT ALERT: Patient Condition ${condition.toUpperCase()}`,
          message: `Case ${caseId} reported ${condition} in transit. Notes: ${notes || 'Vitals shift'}. Prepare immediate resuscitation bay.`,
          caseId,
          hospitalId: hospitalId || undefined,
        });

        await NotificationRepository.create({
          recipientRole: 'admin',
          type: 'PATIENT_DETERIORATION_ALERT',
          severity: 'warning',
          title: `In-Transit Deterioration: Case ${caseId}`,
          message: `Paramedics noted condition dropped to ${condition}.`,
          caseId,
        });
      }

      res.status(200).json({ success: true, transit_update: record });
      return;
    }

    // 33. POST /cases/:id/journey-stage - Advance 7-Stage Patient Journey Timeline
    if (method === 'POST' && pathParts[0] === 'cases' && pathParts[2] === 'journey-stage') {
      const caseId = pathParts[1];
      const { stage, actorId, actorRole, notes, location } = req.body || {};
      if (!stage) {
        res.status(400).json({ error: 'stage is required', code: 'MISSING_FIELD' });
        return;
      }

      const transitDetails = await TrackingAndTransitService.updateJourneyStage(
        caseId,
        stage as JourneyStage,
        actorId || 'operator',
        actorRole || 'system',
        notes,
        location
      );

      // Notification on ARRIVED_AT_HOSPITAL or PATIENT_PICKED
      if (stage === 'ARRIVED_AT_HOSPITAL') {
        const caseDoc = await CaseRepository.get(caseId);
        if (caseDoc?.accepted_hospital_id) {
          await NotificationRepository.create({
            recipientRole: 'hospital',
            recipientId: caseDoc.accepted_hospital_id,
            type: 'ARRIVED_AT_HOSPITAL',
            severity: 'urgent',
            title: 'Ambulance Arrived at ER Bay',
            message: `Ambulance with patient for Case ${caseId} has arrived at the emergency entrance.`,
            caseId,
            hospitalId: caseDoc.accepted_hospital_id,
          });
        }
        await NotificationRepository.create({
          recipientRole: 'family',
          type: 'ARRIVED_AT_HOSPITAL',
          severity: 'info',
          title: 'Arrived at Hospital',
          message: 'The ambulance has arrived at the hospital emergency department.',
          caseId,
        });
      } else if (stage === 'PATIENT_PICKED') {
        await NotificationRepository.create({
          recipientRole: 'family',
          type: 'PATIENT_PICKED',
          severity: 'info',
          title: 'Patient Picked Up',
          message: 'Paramedics have secured the patient and are en route to the medical facility.',
          caseId,
        });
      }

      res.status(200).json({ success: true, transit_details: transitDetails });
      return;
    }

    // 34. GET /cases/:id/journey - Get Case Journey Timeline
    if (method === 'GET' && pathParts[0] === 'cases' && pathParts[2] === 'journey') {
      const caseId = pathParts[1];
      const transitDetails = await TrackingAndTransitService.getCaseTransit(caseId);
      if (!transitDetails) {
        res.status(404).json({ error: 'Transit details not found for case', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json({ transit_details: transitDetails });
      return;
    }

    // 35. GET /notifications - Query Role-Based Notifications
    if (method === 'GET' && pathParts[0] === 'notifications' && pathParts.length === 1) {
      const role = req.query.role ? (req.query.role as RecipientRole | 'all') : undefined;
      const recipientId = req.query.recipientId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const notifications = await NotificationRepository.listForRole(role, recipientId, limit);
      res.status(200).json({ notifications });
      return;
    }

    // 35b. POST /notifications - Send / Create Real Local Notification
    if (method === 'POST' && pathParts[0] === 'notifications' && pathParts.length === 1) {
      const { recipientRole, recipientId, title, message, severity, type, caseId, hospitalId, ambulanceId, metadata } = req.body || {};
      if (!title || !message) {
        res.status(400).json({ error: 'Title and message are required' });
        return;
      }
      const notification = await NotificationRepository.create({
        recipientRole: (recipientRole as RecipientRole) || 'all',
        recipientId: recipientId || 'all',
        title,
        message,
        severity: severity || 'info',
        type: type || 'LOCAL_DISPATCH',
        caseId,
        hospitalId,
        ambulanceId,
        metadata,
      });
      res.status(201).json({ success: true, notification });
      return;
    }

    // 35c. POST /notifications/clear or DELETE /notifications - Clear All Real Notifications
    if (
      (method === 'POST' && pathParts[0] === 'notifications' && pathParts[1] === 'clear') ||
      (method === 'DELETE' && pathParts[0] === 'notifications' && pathParts.length === 1)
    ) {
      const cleared = await NotificationRepository.clearAll();
      res.status(200).json({ success: true, cleared_count: cleared });
      return;
    }

    // 36. POST /notifications/:id/read - Mark Notification Read
    if (method === 'POST' && pathParts[0] === 'notifications' && pathParts[2] === 'read') {
      const id = pathParts[1];
      const marked = await NotificationRepository.markAsRead(id);
      res.status(200).json({ success: marked });
      return;
    }

    // 37. POST /notifications/read-all - Mark All Notifications Read
    if (method === 'POST' && pathParts[0] === 'notifications' && pathParts[1] === 'read-all') {
      const { role, recipientId } = req.body || {};
      const count = await NotificationRepository.markAllAsRead(role || 'admin', recipientId);
      res.status(200).json({ success: true, marked_count: count });
      return;
    }

    // 38. GET /ai/network-briefing - Network-Wide AI Operational Overview
    if ((method === 'GET' || method === 'POST') && pathParts[0] === 'ai' && pathParts[1] === 'network-briefing') {
      const allHospitals = await HospitalRepository.listAll();
      const allCases = await CaseRepository.listAll();
      const activeCases = allCases.filter(c => c.status === 'routing' || c.status === 'accepted');
      const incidents = await IncidentRepository.listAll();
      const crisisActive = incidents.some(i => i.status === 'active');

      const briefing = await AiOperationsService.generateNetworkBriefing(
        allHospitals,
        activeCases.length,
        crisisActive
      );
      res.status(200).json({ briefing });
      return;
    }

    res.status(404).json({ error: 'Endpoint not found', path: req.path });

  } catch (error: any) {
    if (error instanceof RequestLifecycleError) {
      res.status(400).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    res.status(500).json({
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

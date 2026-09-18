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
} from './services/repositories';
import {
  Case,
  NeedProfile,
  CaseCategory,
  CaseSeverity,
} from './services/types';
import { nowTimestamp } from './services/timestampUtils';
import { RequestLifecycleService, RequestLifecycleError } from './routing/requestLifecycleService';
import { TimeoutService } from './routing/timeoutService';
import { RerouteService } from './routing/rerouteService';
import { MatchingAdapter } from './services/matchingAdapter';
import { AdminService } from './services/adminService';
import { ExplanationService, ExplanationRequest } from './ai/explanationService';
import { AuditLogger } from './audit/auditLogger';
import { seedAllDemoData } from './data/seedData';

/**
 * Deterministic need profile lookup rule according to docs/spec.md §19
 */
export function generateNeedProfile(category: CaseCategory): NeedProfile {
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
  }
}

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

  // Normalize path removing leading /api or /
  const rawPath = req.path.replace(/^\/api/, '').replace(/^\//, '');
  const pathParts = rawPath.split('/').filter(Boolean);
  const method = req.method;

  try {
    // 1. POST /cases - Create Case
    if (method === 'POST' && pathParts[0] === 'cases' && pathParts.length === 1) {
      const body = req.body || {};
      const category: CaseCategory = body.category || 'cardiac';
      const severity: CaseSeverity = body.severity || 'red';
      const needProfile = body.need_profile || generateNeedProfile(category);
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
        ambulance_location: body.ambulance_location || { lat: 21.1632, lng: 72.8398 },
        status: 'routing',
        active_request_id: null,
        attempt_number: 0,
      };

      await CaseRepository.create(newCase);

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

      const allHospitals = await HospitalRepository.listAll();
      const rankedCandidates = MatchingAdapter.rankEligibleCandidates(
        caseData,
        allHospitals,
        attemptedIds
      );

      if (rankedCandidates.length === 0) {
        await CaseRepository.update(caseId, { status: 'exhausted' });
        res.status(200).json({
          exhausted: true,
          match: null,
          request: null,
          candidates: [],
        });
        return;
      }

      const top = rankedCandidates[0];
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
      res.status(200).json(result);
      return;
    }

    // 5. POST /requests/:requestId/reject - Reject Request & Trigger Reroute
    if (method === 'POST' && pathParts[0] === 'requests' && pathParts[2] === 'reject') {
      const requestId = pathParts[1];
      const actorId = req.body?.actor_id || 'hospital_user';
      const reason = req.body?.reason || 'Hospital declined case';

      const rejectResult = await RequestLifecycleService.rejectRequest(
        requestId,
        actorId,
        'hospital_user',
        reason
      );

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

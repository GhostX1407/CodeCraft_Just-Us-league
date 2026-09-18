/**
 * Automatic Rerouting Service
 * 
 * Selects the next eligible hospital when a request times out, gets rejected,
 * or suffers mid-transit capability invalidation per docs/spec.md §14, §102-106.
 * 
 * Owned by Person 2.
 */

import {
  CaseRepository,
  HospitalRepository,
  RequestRepository,
} from '../services/repositories';
import { Case, Request } from '../services/types';
import { MatchingAdapter } from '../services/matchingAdapter';
import { RequestLifecycleService } from './requestLifecycleService';
import { AuditLogger } from '../audit/auditLogger';

export interface RerouteResult {
  exhausted: boolean;
  newRequest: Request | null;
  caseData: Case;
  attemptedHospitalIds: string[];
}

export class RerouteService {
  /**
   * Orchestrates the rerouting of a case to the next best eligible hospital
   */
  static async rerouteCase(
    caseId: string,
    reason: string,
    actorId: string = 'system'
  ): Promise<RerouteResult> {
    const caseData = await CaseRepository.get(caseId);
    if (!caseData) {
      throw new Error(`Case ${caseId} not found`);
    }

    // 1. Gather all previously attempted hospitals for this case to prevent duplicate attempts
    const existingRequests = await RequestRepository.listByCase(caseId);
    const attemptedHospitalIds = Array.from(
      new Set(existingRequests.map((r) => r.hospital_id))
    );

    // 2. Load candidate hospitals
    const allHospitals = await HospitalRepository.listAll();

    // 3. Rank eligible candidates excluding already attempted hospitals
    const eligibleCandidates = MatchingAdapter.rankEligibleCandidates(
      caseData,
      allHospitals,
      attemptedHospitalIds
    );

    // 4. Handle Case Exhaustion: No candidates left
    if (eligibleCandidates.length === 0) {
      await CaseRepository.update(caseId, {
        status: 'exhausted',
        active_request_id: null,
      });
      caseData.status = 'exhausted';
      caseData.active_request_id = null;

      await AuditLogger.log({
        caseId,
        eventType: 'REROUTE_TRIGGERED',
        actorType: 'system',
        actorId,
        metadata: {
          result: 'exhausted',
          reason,
          attempted_hospitals: attemptedHospitalIds,
        },
      });

      return {
        exhausted: true,
        newRequest: null,
        caseData,
        attemptedHospitalIds,
      };
    }

    // 5. Select top candidate and create next sequential routing request
    const nextCandidate = eligibleCandidates[0];
    const nextAttemptNumber = (caseData.attempt_number || 0) + 1;

    const newRequest = await RequestLifecycleService.createRequest({
      caseId,
      hospitalId: nextCandidate.hospital.id,
      attemptNumber: nextAttemptNumber,
      matchScoreBreakdown: nextCandidate.breakdown,
      reasonShownToDispatcher: nextCandidate.reason,
      hospital: nextCandidate.hospital,
      caseData,
      actorId,
      actorType: 'system',
    });

    await AuditLogger.log({
      caseId,
      hospitalId: nextCandidate.hospital.id,
      requestId: newRequest.id,
      eventType: 'REROUTE_TRIGGERED',
      actorType: 'system',
      actorId,
      metadata: {
        reason,
        attempt_number: nextAttemptNumber,
        previously_attempted: attemptedHospitalIds,
      },
    });

    return {
      exhausted: false,
      newRequest,
      caseData,
      attemptedHospitalIds,
    };
  }

  /**
   * Handles mid-transit capability invalidation (spec.md §14, §106)
   * Supersedes active commitment, releases holds, and reroutes immediately.
   */
  static async handleMidTransitInvalidation(
    caseId: string,
    reason: string = 'Destination hospital capability degraded in transit'
  ): Promise<RerouteResult> {
    const caseData = await CaseRepository.get(caseId);
    if (!caseData) {
      throw new Error(`Case ${caseId} not found`);
    }

    if (caseData.active_request_id) {
      await RequestLifecycleService.supersedeRequest(caseData.active_request_id, reason);
    }

    await CaseRepository.update(caseId, {
      status: 'routing',
      accepted_hospital_id: null,
    });

    return this.rerouteCase(caseId, reason);
  }
}

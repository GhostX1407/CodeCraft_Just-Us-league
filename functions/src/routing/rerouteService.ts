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
import { Case, Hospital, Request, CommitmentValidationResult } from '../services/types';
import { MatchingAdapter } from '../services/matchingAdapter';
import { RequestLifecycleService } from './requestLifecycleService';
import { ReliabilityService } from '../reliability/reliabilityService';
import { AuditLogger } from '../audit/auditLogger';
import { isCommitmentStillValid } from '../matching';

export interface RerouteResult {
  exhausted: boolean;
  newRequest: Request | null;
  caseData: Case;
  attemptedHospitalIds: string[];
  invalidated?: boolean;
  validation?: CommitmentValidationResult;
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
   * Evaluates current hospital state against canonical P1 invalidation rules (isCommitmentStillValid).
   * If invalid:
   * 1. Supersedes active request (transactionally releasing hold back to hospital availability)
   * 2. Idempotently records reliability commitment outcome as 'breached'
   * 3. Clears accepted destination on case
   * 4. Excludes previously attempted hospitals (including breached hospital)
   * 5. Reranks remaining hospitals via canonical matching engine
   * 6. Creates next sequential routing request
   * 7. Audits COMMITMENT_INVALIDATED and REROUTE_TRIGGERED
   */
  static async handleMidTransitInvalidation(
    caseId: string,
    hospitalOrReason?: string | Hospital,
    actorId: string = 'system'
  ): Promise<RerouteResult> {
    const caseData = await CaseRepository.get(caseId);
    if (!caseData) {
      throw new Error(`Case ${caseId} not found`);
    }

    const acceptedHospitalId = caseData.accepted_hospital_id;
    let hospital: Hospital | null = null;
    let reasonText =
      typeof hospitalOrReason === 'string'
        ? hospitalOrReason
        : 'Destination hospital operational capability degraded';

    if (typeof hospitalOrReason === 'object' && hospitalOrReason !== null) {
      hospital = hospitalOrReason;
    } else if (typeof hospitalOrReason === 'string' && hospitalOrReason.startsWith('hosp')) {
      hospital = await HospitalRepository.get(hospitalOrReason);
    }

    if (!hospital && acceptedHospitalId) {
      hospital = await HospitalRepository.get(acceptedHospitalId);
    }

    let validation: CommitmentValidationResult | undefined;
    if (hospital) {
      validation = isCommitmentStillValid(caseData, hospital, {
        is_case_hold_allocated: true,
      });

      // If explicit hospital state was provided and commitment is STILL VALID:
      // do not supersede or reroute
      if (validation.is_valid && typeof hospitalOrReason === 'object') {
        return {
          exhausted: false,
          newRequest: null,
          caseData,
          attemptedHospitalIds: [],
          invalidated: false,
          validation,
        };
      }

      if (validation.is_invalid && validation.reasons.length > 0) {
        reasonText = validation.reasons.join('; ');
      }
    }

    const activeRequestId = caseData.active_request_id;
    if (activeRequestId) {
      await RequestLifecycleService.supersedeRequest(activeRequestId, reasonText, actorId);
      if (acceptedHospitalId) {
        await ReliabilityService.recordCommitmentOutcome(
          acceptedHospitalId,
          activeRequestId,
          caseId,
          'breached',
          actorId
        );
      }
    }

    await CaseRepository.update(caseId, {
      status: 'routing',
      accepted_hospital_id: null,
    });

    await AuditLogger.log({
      caseId,
      hospitalId: acceptedHospitalId || null,
      requestId: activeRequestId || null,
      eventType: 'COMMITMENT_INVALIDATED',
      actorType: 'system',
      actorId,
      metadata: {
        reason: reasonText,
        validation_reasons: validation?.reasons || [],
      },
    });

    const rerouteRes = await this.rerouteCase(
      caseId,
      `Mid-transit commitment invalidated: ${reasonText}`,
      actorId
    );

    return {
      ...rerouteRes,
      invalidated: true,
      validation,
    };
  }
}


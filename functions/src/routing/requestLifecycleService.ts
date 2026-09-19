/**
 * Request Lifecycle & State Machine Orchestration Service
 * 
 * Implements authoritative request lifecycle, transaction-protected hospital
 * acceptance, concurrency conflict detection, and rejection per docs/spec.md §14-17, §41-43, §100-108.
 * 
 * Owned by Person 2.
 */

import { getDb } from '../services/firebase';
import {
  CaseRepository,
  HospitalRepository,
  RequestRepository,
  HoldRepository,
} from '../services/repositories';
import {
  Request,
  Case,
  Hospital,
  ResourceHold,
  MatchScoreBreakdown,
  HospitalCapabilitySnapshot,
} from '../services/types';
import {
  nowTimestamp,
  calculateExpirationTimestamp,
  isRequestExpired,
  REQUEST_TIMEOUT_SECONDS,
} from '../services/timestampUtils';
import { ResourceHoldService } from '../resources/resourceHoldService';
import { ReliabilityService } from '../reliability/reliabilityService';
import { AuditLogger } from '../audit/auditLogger';

export interface CreateRequestInput {
  caseId: string;
  hospitalId: string;
  attemptNumber: number;
  matchScoreBreakdown: MatchScoreBreakdown;
  reasonShownToDispatcher: string;
  hospital: Hospital;
  caseData: Case;
  timeoutSeconds?: number;
  actorId?: string;
  actorType?: 'system' | 'ambulance_user';
}

export interface HandoffResult {
  success: boolean;
  request: Request;
  caseData: Case;
  hold: ResourceHold | null;
}


export interface AcceptRequestResult {
  success: boolean;
  request: Request;
  hold?: ResourceHold;
  caseData: Case;
}

export interface RejectRequestResult {
  success: boolean;
  request: Request;
  caseData: Case;
}

export class RequestLifecycleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'RequestLifecycleError';
  }
}

export class RequestLifecycleService {
  /**
   * Generates a unique request ID
   */
  static generateRequestId(caseId: string, attemptNumber: number): string {
    const rand = Math.random().toString(36).substring(2, 7);
    return `req_${caseId}_att${attemptNumber}_${rand}`;
  }

  /**
   * Creates a new pending routing request for a case
   */
  static async createRequest(input: CreateRequestInput): Promise<Request> {
    const existingCase = await CaseRepository.get(input.caseId);
    if (!existingCase) {
      throw new RequestLifecycleError('CASE_NOT_FOUND', `Case ${input.caseId} does not exist`);
    }

    // Invariant: Cannot create request if case is already accepted (spec.md §17)
    if (existingCase.status === 'accepted') {
      throw new RequestLifecycleError(
        'CASE_ALREADY_ACCEPTED',
        `Case ${input.caseId} has already been accepted by hospital ${existingCase.accepted_hospital_id}`
      );
    }

    // Invariant: Uniqueness check - no two simultaneous pending requests for the same case (spec.md §106)
    const activePending = await RequestRepository.getActiveRequestForCase(input.caseId);
    if (activePending) {
      throw new RequestLifecycleError(
        'ACTIVE_REQUEST_EXISTS',
        `Case ${input.caseId} already has an active pending request ${activePending.id}`
      );
    }

    const sentAt = nowTimestamp();
    const expiresAt = calculateExpirationTimestamp(
      sentAt,
      input.timeoutSeconds || REQUEST_TIMEOUT_SECONDS
    );

    const capabilitySnapshot: HospitalCapabilitySnapshot = {
      trauma_team_on_shift: input.hospital.trauma_team_on_shift,
      specialists_on_call: [...input.hospital.specialists_on_call],
      icu_beds_free: input.hospital.icu_beds_free,
      ventilators_free: input.hospital.ventilators_free,
      er_load_score: input.hospital.er_load_score,
      last_updated_at: input.hospital.last_updated_at,
    };

    const requestId = this.generateRequestId(input.caseId, input.attemptNumber);

    const newRequest: Request = {
      id: requestId,
      case_id: input.caseId,
      hospital_id: input.hospitalId,
      status: 'pending',
      sent_at: sentAt,
      responded_at: null,
      expires_at: expiresAt,
      attempt_number: input.attemptNumber,
      match_score_breakdown: { ...input.matchScoreBreakdown },
      reason_shown_to_dispatcher: input.reasonShownToDispatcher,
      need_profile_snapshot: {
        specialists_needed: [...input.caseData.need_profile.specialists_needed],
        capability_flags: [...input.caseData.need_profile.capability_flags],
        blood_type_needed: input.caseData.need_profile.blood_type_needed,
      },
      hospital_capability_snapshot: capabilitySnapshot,
    };

    // Save request and update case routing state
    await RequestRepository.create(newRequest);
    await CaseRepository.update(input.caseId, {
      status: 'routing',
      active_request_id: requestId,
      attempt_number: input.attemptNumber,
    });

    // Write audit events
    await AuditLogger.log({
      caseId: input.caseId,
      hospitalId: input.hospitalId,
      requestId,
      eventType: 'REQUEST_CREATED',
      actorType: input.actorType || 'system',
      actorId: input.actorId || 'system',
      caseData: input.caseData,
      needProfile: input.caseData.need_profile,
      hospitalData: input.hospital,
      matchData: input.matchScoreBreakdown,
    });

    await AuditLogger.log({
      caseId: input.caseId,
      hospitalId: input.hospitalId,
      requestId,
      eventType: 'REQUEST_SENT',
      actorType: input.actorType || 'system',
      actorId: input.actorId || 'system',
      metadata: { expires_at: expiresAt },
    });

    return newRequest;
  }

  /**
   * Transactional Acceptance (spec.md §41, §105)
   * 
   * Atomically verifies:
   * 1. Request is pending
   * 2. Request is not expired by server time
   * 3. Case is not already accepted
   * 4. Hospital countable resources are available
   * 
   * Then atomically:
   * 1. Decrements hospital resources
   * 2. Creates hold document under /hospitals/{hospitalId}/holds/{requestId}
   * 3. Updates request status to 'accepted'
   * 4. Updates case status to 'accepted'
   * 5. Writes REQUEST_ACCEPTED and RESOURCE_HELD audit events
   */
  static async acceptRequest(
    requestId: string,
    actorId: string = 'hospital_user',
    actorType: 'hospital_user' | 'system' | 'coordinator_user' = 'hospital_user'
  ): Promise<AcceptRequestResult> {
    const db = getDb();

    return db.runTransaction(async (transaction) => {
      const requestRef = RequestRepository.getDocRef(requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw new RequestLifecycleError('REQUEST_NOT_FOUND', `Request ${requestId} not found`);
      }

      const request = requestSnap.data() as Request;

      // Idempotency: If already accepted, return existing state safely
      if (request.status === 'accepted') {
        const caseRef = CaseRepository.getDocRef(request.case_id);
        const caseSnap = await transaction.get(caseRef);
        return {
          success: true,
          request,
          caseData: caseSnap.data() as Case,
        };
      }

      // State check: Only pending requests may be accepted (spec.md §14, §105)
      if (request.status !== 'pending') {
        throw new RequestLifecycleError(
          'STATE_CONFLICT',
          `Cannot accept request ${requestId}: current status is '${request.status}'`
        );
      }

      // Server-authoritative expiration check (spec.md §103, §105)
      const now = nowTimestamp();
      if (isRequestExpired(request.expires_at, now)) {
        throw new RequestLifecycleError(
          'REQUEST_EXPIRED',
          `Cannot accept request ${requestId}: request deadline has passed`
        );
      }

      // Case acceptance uniqueness check (spec.md §17, §41)
      const caseRef = CaseRepository.getDocRef(request.case_id);
      const caseSnap = await transaction.get(caseRef);
      if (!caseSnap.exists) {
        throw new RequestLifecycleError('CASE_NOT_FOUND', `Case ${request.case_id} not found`);
      }

      const caseData = caseSnap.data() as Case;
      if (caseData.status === 'accepted' && caseData.accepted_hospital_id !== request.hospital_id) {
        throw new RequestLifecycleError(
          'CASE_ALREADY_ACCEPTED',
          `Case ${caseData.id} has already been accepted by hospital ${caseData.accepted_hospital_id}`
        );
      }

      // Hospital capacity and concurrency check (spec.md §22, §41, §42)
      const hospitalRef = HospitalRepository.getDocRef(request.hospital_id);
      const hospitalSnap = await transaction.get(hospitalRef);
      if (!hospitalSnap.exists) {
        throw new RequestLifecycleError(
          'HOSPITAL_NOT_FOUND',
          `Hospital ${request.hospital_id} not found`
        );
      }

      const hospital = hospitalSnap.data() as Hospital;
      const requirements = ResourceHoldService.calculateRequirements(request.need_profile_snapshot);
      const availability = ResourceHoldService.checkAvailability(hospital, requirements);

      if (!availability.available) {
        throw new RequestLifecycleError(
          'CONCURRENCY_CONFLICT',
          `Resource unavailable during acceptance: ${availability.reason}`
        );
      }

      // 1. Decrement hospital resources
      ResourceHoldService.applyDecrement(hospital, requirements);
      transaction.update(hospitalRef, {
        icu_beds_free: hospital.icu_beds_free,
        ventilators_free: hospital.ventilators_free,
        blood_stock: hospital.blood_stock,
        last_updated_at: now,
      });

      // 2. Create hold document
      const hold: ResourceHold = {
        request_id: requestId,
        case_id: request.case_id,
        hospital_id: request.hospital_id,
        created_at: now,
        status: 'active',
        resources: requirements,
      };
      const holdRef = HoldRepository.getDocRef(request.hospital_id, requestId);
      transaction.set(holdRef, hold);

      // 3. Update request status to accepted
      transaction.update(requestRef, {
        status: 'accepted',
        responded_at: now,
      });
      request.status = 'accepted';
      request.responded_at = now;

      // 4. Update case status to accepted
      transaction.update(caseRef, {
        status: 'accepted',
        accepted_hospital_id: request.hospital_id,
        active_request_id: requestId,
      });
      caseData.status = 'accepted';
      caseData.accepted_hospital_id = request.hospital_id;

      // 5. Write audit events in transaction
      const acceptAudit = AuditLogger.buildAuditLog({
        caseId: request.case_id,
        hospitalId: request.hospital_id,
        requestId,
        eventType: 'REQUEST_ACCEPTED',
        actorType,
        actorId,
        caseData,
        needProfile: request.need_profile_snapshot,
        hospitalData: hospital,
        matchData: request.match_score_breakdown,
        metadata: { resources_held: requirements },
      });
      const acceptAuditRef = getDb().collection('audit_logs').doc(acceptAudit.id);
      transaction.set(acceptAuditRef, acceptAudit);

      const holdAudit = AuditLogger.buildAuditLog({
        caseId: request.case_id,
        hospitalId: request.hospital_id,
        requestId,
        eventType: 'RESOURCE_HELD',
        actorType,
        actorId,
        metadata: { resources: requirements },
      });
      const holdAuditRef = getDb().collection('audit_logs').doc(holdAudit.id);
      transaction.set(holdAuditRef, holdAudit);

      return {
        success: true,
        request,
        hold,
        caseData,
      };
    });
  }

  /**
   * Rejection Service (spec.md §101, §104)
   * 
   * Atomically transitions request from 'pending' to 'rejected'.
   * Tolerates duplicate rejection idempotently.
   */
  static async rejectRequest(
    requestId: string,
    actorId: string = 'hospital_user',
    actorType: 'hospital_user' | 'system' = 'hospital_user',
    reason?: string
  ): Promise<RejectRequestResult> {
    const db = getDb();

    return db.runTransaction(async (transaction) => {
      const requestRef = RequestRepository.getDocRef(requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw new RequestLifecycleError('REQUEST_NOT_FOUND', `Request ${requestId} not found`);
      }

      const request = requestSnap.data() as Request;

      // Idempotency: If already rejected, return existing state safely
      if (request.status === 'rejected') {
        const caseRef = CaseRepository.getDocRef(request.case_id);
        const caseSnap = await transaction.get(caseRef);
        return {
          success: true,
          request,
          caseData: caseSnap.data() as Case,
        };
      }

      // Only pending requests may be rejected
      if (request.status !== 'pending') {
        throw new RequestLifecycleError(
          'STATE_CONFLICT',
          `Cannot reject request ${requestId}: current status is '${request.status}'`
        );
      }

      const now = nowTimestamp();
      transaction.update(requestRef, {
        status: 'rejected',
        responded_at: now,
      });
      request.status = 'rejected';
      request.responded_at = now;

      const caseRef = CaseRepository.getDocRef(request.case_id);
      const caseSnap = await transaction.get(caseRef);
      const caseData = caseSnap.data() as Case;

      // Write audit event in transaction
      const rejectAudit = AuditLogger.buildAuditLog({
        caseId: request.case_id,
        hospitalId: request.hospital_id,
        requestId,
        eventType: 'REQUEST_REJECTED',
        actorType,
        actorId,
        metadata: { reason: reason || 'Hospital declined' },
      });
      const rejectAuditRef = getDb().collection('audit_logs').doc(rejectAudit.id);
      transaction.set(rejectAuditRef, rejectAudit);

      return {
        success: true,
        request,
        caseData,
      };
    });
  }

  /**
   * Marks a request as superseded (spec.md §15, §106)
   */
  static async supersedeRequest(
    requestId: string,
    reason: string = 'Superseded by alternative routing',
    actorId: string = 'system'
  ): Promise<Request> {
    const db = getDb();

    return db.runTransaction(async (transaction) => {
      const requestRef = RequestRepository.getDocRef(requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw new RequestLifecycleError('REQUEST_NOT_FOUND', `Request ${requestId} not found`);
      }

      const request = requestSnap.data() as Request;

      // If active hold exists for this request, release it transactionally
      await ResourceHoldService.releaseHoldInTransaction(
        transaction,
        request.hospital_id,
        requestId,
        request.case_id,
        actorId
      );

      transaction.update(requestRef, {
        status: 'superseded',
      });
      request.status = 'superseded';

      // Record audit
      const audit = AuditLogger.buildAuditLog({
        caseId: request.case_id,
        hospitalId: request.hospital_id,
        requestId,
        eventType: 'REQUEST_SUPERSEDED',
        actorType: 'system',
        actorId,
        metadata: { reason },
      });
      const auditRef = getDb().collection('audit_logs').doc(audit.id);
      transaction.set(auditRef, audit);

      return request;
    });
  }

  /**
   * Finalizes successful patient arrival and handoff at the accepting hospital.
   * Atomically:
   * 1. Verifies request is accepted
   * 2. Transitions resource hold to 'consumed' (without returning resources to hospital availability)
   * 3. Updates case status to 'completed'
   * 4. Idempotently records reliability commitment outcome as 'honored'
   * 5. Audits HANDOFF_COMPLETED
   */
  static async completeHandoff(
    requestId: string,
    actorId: string = 'hospital_user',
    actorType: 'hospital_user' | 'system' = 'hospital_user'
  ): Promise<HandoffResult> {
    const db = getDb();

    const result = await db.runTransaction(async (transaction) => {
      const requestRef = RequestRepository.getDocRef(requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw new RequestLifecycleError('REQUEST_NOT_FOUND', `Request ${requestId} not found`);
      }

      const request = requestSnap.data() as Request;

      // Handoff requires that the request was accepted
      if (request.status !== 'accepted') {
        throw new RequestLifecycleError(
          'STATE_CONFLICT',
          `Cannot complete handoff for request ${requestId}: status is '${request.status}' (expected 'accepted')`
        );
      }

      const caseRef = CaseRepository.getDocRef(request.case_id);
      const caseSnap = await transaction.get(caseRef);
      if (!caseSnap.exists) {
        throw new RequestLifecycleError('CASE_NOT_FOUND', `Case ${request.case_id} not found`);
      }
      const caseData = caseSnap.data() as Case;

      // 1. Consume hold in transaction (does NOT restore resources)
      const hold = await ResourceHoldService.consumeHoldInTransaction(
        transaction,
        request.hospital_id,
        requestId,
        request.case_id,
        actorId,
        actorType
      );

      // 2. Update case status to 'completed'
      transaction.update(caseRef, {
        status: 'completed',
      });
      caseData.status = 'completed';

      // 3. Write audit log
      const audit = AuditLogger.buildAuditLog({
        caseId: request.case_id,
        hospitalId: request.hospital_id,
        requestId,
        eventType: 'HANDOFF_COMPLETED',
        actorType,
        actorId,
        metadata: {
          hold_status: 'consumed',
          completed_at: nowTimestamp(),
        },
      });
      const auditRef = db.collection('audit_logs').doc(audit.id);
      transaction.set(auditRef, audit);

      return {
        success: true,
        request,
        caseData,
        hold,
      };
    });

    // Record reliability outcome as 'honored'
    await ReliabilityService.recordCommitmentOutcome(
      result.request.hospital_id,
      result.request.id,
      result.request.case_id,
      'honored',
      actorId
    );

    return result;
  }
}


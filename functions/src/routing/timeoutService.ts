/**
 * Server-Authoritative Timeout Service
 * 
 * Enforces server-authoritative deadline validation and triggers automatic
 * reroute upon request expiration per docs/spec.md §13, §102-106.
 * 
 * Owned by Person 2.
 */

import { getDb } from '../services/firebase';
import { RequestRepository } from '../services/repositories';
import { Request } from '../services/types';
import { nowTimestamp, isRequestExpired } from '../services/timestampUtils';
import { RequestLifecycleError } from './requestLifecycleService';
import { AuditLogger } from '../audit/auditLogger';
import { RerouteService, RerouteResult } from './rerouteService';

export interface TimeoutResult {
  success: boolean;
  request: Request;
  rerouteResult?: RerouteResult;
}

export class TimeoutService {
  /**
   * Evaluates server-authoritative timeout and transitions pending request to 'timed_out'
   */
  static async handleTimeout(
    requestId: string,
    actorId: string = 'system'
  ): Promise<TimeoutResult> {
    const db = getDb();

    // 1. Transactionally transition to timed_out
    const timedOutRequest = await db.runTransaction(async (transaction) => {
      const requestRef = RequestRepository.getDocRef(requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw new RequestLifecycleError('REQUEST_NOT_FOUND', `Request ${requestId} not found`);
      }

      const request = requestSnap.data() as Request;

      // Idempotency: If already timed out, return existing state
      if (request.status === 'timed_out') {
        return request;
      }

      // State check: Only pending requests may time out
      if (request.status !== 'pending') {
        throw new RequestLifecycleError(
          'STATE_CONFLICT',
          `Cannot time out request ${requestId}: status is '${request.status}'`
        );
      }

      // Server-authoritative time check (spec.md §103)
      const now = nowTimestamp();
      if (!isRequestExpired(request.expires_at, now)) {
        throw new RequestLifecycleError(
          'REQUEST_NOT_YET_EXPIRED',
          `Cannot time out request ${requestId}: server deadline has not passed`
        );
      }

      transaction.update(requestRef, {
        status: 'timed_out',
        responded_at: now,
      });
      request.status = 'timed_out';
      request.responded_at = now;

      // Record audit event in transaction
      const auditRecord = AuditLogger.buildAuditLog({
        caseId: request.case_id,
        hospitalId: request.hospital_id,
        requestId,
        eventType: 'REQUEST_TIMED_OUT',
        actorType: 'system',
        actorId,
        metadata: { expires_at: request.expires_at },
      });
      const auditRef = getDb().collection('audit_logs').doc(auditRecord.id);
      transaction.set(auditRef, auditRecord);

      return request;
    });

    // 2. Automatically trigger rerouting to the next eligible candidate (spec.md §14, §102)
    const rerouteResult = await RerouteService.rerouteCase(
      timedOutRequest.case_id,
      `Request timed out for hospital ${timedOutRequest.hospital_id}`,
      actorId
    );

    return {
      success: true,
      request: timedOutRequest,
      rerouteResult,
    };
  }
}

/**
 * Hospital Commitment Reliability Service
 * 
 * Implements the prototype reliability calculation:
 * reliability = honored commitments / accepted commitments
 * per docs/spec.md, docs/data-model.md §5, and docs/tasks.md T-P2-066, T-P2-067.
 * 
 * Owned by Person 2.
 */

import { getDb } from '../services/firebase';
import { HospitalRepository } from '../services/repositories';
import { Hospital } from '../services/types';
import { AuditLogger } from '../audit/auditLogger';

export interface HospitalReliabilityStats {
  hospital_id: string;
  hospital_name: string;
  has_history: boolean;
  accepted_commitments: number;
  honored_commitments: number;
  reliability_score: number | null; // Decimal 0.0 to 1.0, or null if no history
  reliability_display: string; // "94%" or "No history"
}

export class ReliabilityService {
  /**
   * Calculates reliability score from raw commitment counters
   * Invariant: If accepted == 0, returns has_history: false and score: null
   * (never manufactures a false 0% or 100%)
   */
  static computeScore(
    acceptedCount: number,
    honoredCount: number
  ): { score: number | null; display: string; hasHistory: boolean } {
    if (!acceptedCount || acceptedCount <= 0) {
      return {
        score: null,
        display: 'No history',
        hasHistory: false,
      };
    }

    const safeHonored = Math.max(0, Math.min(honoredCount, acceptedCount));
    const score = Math.round((safeHonored / acceptedCount) * 100) / 100;
    const pct = Math.round(score * 100);

    return {
      score,
      display: `${pct}%`,
      hasHistory: true,
    };
  }

  /**
   * Retrieves reliability metrics for a specific hospital
   */
  static async getHospitalReliability(hospitalId: string): Promise<HospitalReliabilityStats> {
    const hospital = await HospitalRepository.get(hospitalId);
    if (!hospital) {
      throw new Error(`Hospital ${hospitalId} not found`);
    }

    // Query audit logs or hospital commitment stats
    const db = getDb();
    const statsDoc = await db.collection('hospital_reliability').doc(hospitalId).get();

    let accepted = 0;
    let honored = 0;

    if (statsDoc.exists) {
      const data = statsDoc.data()!;
      accepted = data.accepted_commitments || 0;
      honored = data.honored_commitments || 0;
    }

    const computed = this.computeScore(accepted, honored);

    return {
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      has_history: computed.hasHistory,
      accepted_commitments: accepted,
      honored_commitments: honored,
      reliability_score: computed.score,
      reliability_display: computed.display,
    };
  }

  /**
   * Records whether an accepted commitment was honored or breached.
   * Strictly IDEMPOTENT per requestId: Calling twice for the same request does NOT increment counters.
   */
  static async recordCommitmentOutcome(
    hospitalId: string,
    requestId: string,
    caseId: string,
    outcome: 'honored' | 'breached',
    actorId: string = 'system'
  ): Promise<HospitalReliabilityStats> {
    const db = getDb();

    return db.runTransaction(async (transaction) => {
      const hospRef = HospitalRepository.getDocRef(hospitalId);
      const hospSnap = await transaction.get(hospRef);
      if (!hospSnap.exists) {
        throw new Error(`Hospital ${hospitalId} not found`);
      }
      const hospital = hospSnap.data() as Hospital;

      const relRef = db.collection('hospital_reliability').doc(hospitalId);
      const relSnap = await transaction.get(relRef);

      let accepted = 0;
      let honored = 0;
      let recordedRequests: Record<string, string> = {};

      if (relSnap.exists) {
        const data = relSnap.data()!;
        accepted = data.accepted_commitments || 0;
        honored = data.honored_commitments || 0;
        recordedRequests = data.recorded_requests || {};
      }

      // IDEMPOTENCY CHECK: If already recorded for this requestId, do not increment again
      if (recordedRequests[requestId]) {
        const existingComputed = this.computeScore(accepted, honored);
        return {
          hospital_id: hospital.id,
          hospital_name: hospital.name,
          has_history: existingComputed.hasHistory,
          accepted_commitments: accepted,
          honored_commitments: honored,
          reliability_score: existingComputed.score,
          reliability_display: existingComputed.display,
        };
      }

      // Record new outcome
      accepted += 1;
      if (outcome === 'honored') {
        honored += 1;
      }
      recordedRequests[requestId] = outcome;

      const computed = this.computeScore(accepted, honored);

      transaction.set(
        relRef,
        {
          hospital_id: hospitalId,
          hospital_name: hospital.name,
          accepted_commitments: accepted,
          honored_commitments: honored,
          reliability_score: computed.score,
          recorded_requests: recordedRequests,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update cached score on hospital document if score exists
      if (computed.score !== null) {
        transaction.update(hospRef, {
          reliability_score: computed.score,
        });
      }


      // Record audit event
      const audit = AuditLogger.buildAuditLog({
        caseId,
        hospitalId,
        requestId,
        eventType: 'HOSPITAL_STATUS_UPDATED',
        actorType: 'system',
        actorId,
        metadata: {
          commitment_outcome: outcome,
          new_reliability_score: computed.score,
          accepted_count: accepted,
          honored_count: honored,
        },
      });
      const auditRef = db.collection('audit_logs').doc(audit.id);
      transaction.set(auditRef, audit);

      return {
        hospital_id: hospitalId,
        hospital_name: hospital.name,
        has_history: computed.hasHistory,
        accepted_commitments: accepted,
        honored_commitments: honored,
        reliability_score: computed.score,
        reliability_display: computed.display,
      };
    });
  }

  /**
   * Aggregates reliability overview for all registered hospitals
   */
  static async getAllHospitalsReliability(): Promise<HospitalReliabilityStats[]> {
    const hospitals = await HospitalRepository.listAll();
    const results: HospitalReliabilityStats[] = [];

    for (const h of hospitals) {
      try {
        const rel = await this.getHospitalReliability(h.id);
        results.push(rel);
      } catch {
        const computed = this.computeScore(0, 0);
        results.push({
          hospital_id: h.id,
          hospital_name: h.name,
          has_history: false,
          accepted_commitments: 0,
          honored_commitments: 0,
          reliability_score: null,
          reliability_display: computed.display,
        });
      }
    }

    return results;
  }
}

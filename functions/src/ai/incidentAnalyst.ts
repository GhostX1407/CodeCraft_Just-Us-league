/**
 * AI Incident Analyst
 * 
 * Provides post-incident forensic interpretation, timeline synthesis,
 * and operational observations from case records, routing attempts, and audit logs.
 * 
 * Strictly non-safety-critical. AI output NEVER modifies routing or state authority.
 * 
 * Owned by Person 2.
 */

import { AiAnalysisResponse, AiIncidentAnalystInput } from './types';
import { AiProviderRouter } from './providerRouter';

export class AiIncidentAnalyst {
  static formatIncidentPrompt(input: AiIncidentAnalystInput): string {
    const caseSummary = {
      caseId: input.caseData.id,
      category: input.caseData.category,
      severity: input.caseData.severity,
      createdAt: input.caseData.created_at,
      status: input.caseData.status,
      acceptedHospitalId: input.caseData.accepted_hospital_id,
      attemptNumber: input.caseData.attempt_number,
      needProfile: input.caseData.need_profile,
    };

    const routingHistory = (input.requests || []).map((r) => ({
      requestId: r.id,
      hospitalId: r.hospital_id,
      status: r.status,
      sentAt: r.sent_at,
      respondedAt: r.responded_at,
      attemptNumber: r.attempt_number,
    }));

    const auditTimeline = (input.auditLogs || []).map((l) => ({
      timestamp: l.timestamp,
      eventType: l.event_type,
      hospitalId: l.hospital_id,
      actorType: l.actor_type,
      metadata: l.metadata,
    }));

    const holdsSummary = (input.holds || []).map((h) => ({
      status: h.status,
      resources: h.resources,
      createdAt: h.created_at,
      consumedAt: h.consumed_at,
    }));

    return JSON.stringify({
      context: 'Post-Incident Forensic Reconstruction',
      case: caseSummary,
      routingHistory,
      holds: holdsSummary,
      auditTimeline,
    }, null, 2);
  }

  static async analyzeIncident(
    input: AiIncidentAnalystInput,
    timeoutMs?: number
  ): Promise<AiAnalysisResponse> {
    const prompt = this.formatIncidentPrompt(input);
    return AiProviderRouter.analyze(prompt, timeoutMs);
  }
}

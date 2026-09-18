/**
 * AI Operations Analyst
 * 
 * Provides situational awareness and operational bottleneck analysis
 * for emergency room loads, regional resource pressure, and data freshness.
 * 
 * Strictly non-safety-critical. AI output NEVER modifies routing or resources.
 * 
 * Owned by Person 2.
 */

import { AiAnalysisResponse, AiOperationsAnalystInput } from './types';
import { AiProviderRouter } from './providerRouter';
import { DeterministicIntelligenceService } from '../services/deterministicIntelligence';

export class AiOperationsAnalyst {
  static formatOperationsPrompt(input: AiOperationsAnalystInput): string {
    const hospitalSummaries = input.hospitals.map((h) => {
      const pressure = DeterministicIntelligenceService.classifyResourcePressure(h);
      const confidence = DeterministicIntelligenceService.getFreshnessConfidenceTier(h.last_updated_at);
      return {
        id: h.id,
        name: h.name,
        icu_beds_free: h.icu_beds_free,
        ventilators_free: h.ventilators_free,
        er_load_score: h.er_load_score,
        blood_stock: h.blood_stock,
        pressure_level: pressure.pressureLevel,
        freshness_tier: confidence,
        reliability_score: h.reliability_score ?? 1.0,
      };
    });

    const recentRequestSummary = (input.recentRequests || []).slice(0, 10).map((r) => ({
      requestId: r.id,
      hospitalId: r.hospital_id,
      status: r.status,
      attemptNumber: r.attempt_number,
    }));

    return JSON.stringify({
      context: 'Regional Emergency Operations Snapshot',
      hospitals: hospitalSummaries,
      recentRequests: recentRequestSummary,
      auditEventCount: input.auditLogs?.length || 0,
      timestamp: input.timestamp || new Date().toISOString(),
    }, null, 2);
  }

  static async analyzeOperations(
    input: AiOperationsAnalystInput,
    timeoutMs?: number
  ): Promise<AiAnalysisResponse> {
    const prompt = this.formatOperationsPrompt(input);
    return AiProviderRouter.analyze(prompt, timeoutMs);
  }
}

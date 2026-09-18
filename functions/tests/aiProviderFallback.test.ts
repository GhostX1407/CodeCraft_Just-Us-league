import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AiProviderRouter,
  GroqProvider,
  GeminiProvider,
  normalizeAnalysisResponse,
} from '../src/ai/providerRouter';
import { AiProviderInterface, AiAnalysisResponse } from '../src/ai/types';
import { AiOperationsAnalyst } from '../src/ai/operationsAnalyst';
import { AiIncidentAnalyst } from '../src/ai/incidentAnalyst';
import { Hospital, Case, Request, AuditLog } from '../src/services/types';

describe('AI Provider Architecture — Groq Primary + Gemini Fallback (Tests A-H)', () => {
  const sampleValidOutput: AiAnalysisResponse = {
    summary: 'Regional capacity shows moderate pressure on Apex trauma center.',
    observations: ['ER load at Apex is 2/5 with stable ICU buffer.'],
    resource_pressure: ['ICU beds free: 4', 'Ventilators free: 2'],
    bottlenecks: ['Sunrise community hospital data approaching stale threshold.'],
    response_time_observations: ['Average response time under 12 seconds.'],
    reroute_observations: ['No reroutes in last 30 minutes.'],
    data_quality_notes: ['Telemetry data fresh across 7 of 8 hospitals.'],
    operational_considerations: ['Consider directing yellow cases to CityCare General.'],
  };

  class MockProvider implements AiProviderInterface {
    public calls: number = 0;
    constructor(
      public readonly name: 'groq' | 'gemini',
      public configured: boolean = true,
      public behavior: 'success' | 'fail' | 'timeout' | 'malformed' | 'malformed_optional' = 'success'
    ) {}

    isConfigured(): boolean {
      return this.configured;
    }

    async generateAnalysis(prompt: string, timeoutMs: number = 100): Promise<AiAnalysisResponse> {
      this.calls++;

      if (this.behavior === 'fail') {
        throw new Error(`${this.name} API HTTP 500: Internal server error`);
      }

      if (this.behavior === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, timeoutMs + 50));
        throw new Error(`${this.name} request aborted due to timeout`);
      }

      if (this.behavior === 'malformed') {
        // Return object missing required summary
        return normalizeAnalysisResponse({ missing_summary: true } as any);
      }

      if (this.behavior === 'malformed_optional') {
        // Valid summary, but optional arrays are non-array or messy
        return normalizeAnalysisResponse({
          summary: 'Valid summary with non-array observations',
          observations: 'single string instead of array',
          resource_pressure: null,
          bottlenecks: undefined,
        });
      }

      return { ...sampleValidOutput };
    }
  }

  afterEach(() => {
    AiProviderRouter.resetProviders();
    vi.restoreAllMocks();
  });

  it('A. Groq success: Groq called, Gemini NOT called, valid result returned', async () => {
    const mockGroq = new MockProvider('groq', true, 'success');
    const mockGemini = new MockProvider('gemini', true, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test operational prompt');

    expect(mockGroq.calls).toBe(1);
    expect(mockGemini.calls).toBe(0);
    expect(result.summary).toBe(sampleValidOutput.summary);
    expect(result.provider_metadata?.provider_used).toBe('groq');
    expect(result.provider_metadata?.fallback_used).toBe(false);
    expect(result.provider_metadata?.status).toBe('success');
  });

  it('B. Groq failure -> Gemini success: Groq called, Gemini called, Gemini result returned, fallback recorded', async () => {
    const mockGroq = new MockProvider('groq', true, 'fail');
    const mockGemini = new MockProvider('gemini', true, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt');

    expect(mockGroq.calls).toBe(1);
    expect(mockGemini.calls).toBe(1);
    expect(result.summary).toBe(sampleValidOutput.summary);
    expect(result.provider_metadata?.provider_used).toBe('gemini');
    expect(result.provider_metadata?.fallback_used).toBe(true);
    expect(result.provider_metadata?.status).toBe('fallback_success');
  });

  it('C. Groq timeout -> Gemini success: Groq times out, Gemini called, valid result returned', async () => {
    const mockGroq = new MockProvider('groq', true, 'timeout');
    const mockGemini = new MockProvider('gemini', true, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt', 50);

    expect(mockGroq.calls).toBe(1);
    expect(mockGemini.calls).toBe(1);
    expect(result.summary).toBe(sampleValidOutput.summary);
    expect(result.provider_metadata?.provider_used).toBe('gemini');
    expect(result.provider_metadata?.fallback_used).toBe(true);
  });

  it('D. Groq malformed response -> Gemini success: Groq rejected by validation, Gemini called, valid result returned', async () => {
    const mockGroq = new MockProvider('groq', true, 'malformed');
    const mockGemini = new MockProvider('gemini', true, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt');

    expect(mockGroq.calls).toBe(1);
    expect(mockGemini.calls).toBe(1);
    expect(result.summary).toBe(sampleValidOutput.summary);
    expect(result.provider_metadata?.provider_used).toBe('gemini');
    expect(result.provider_metadata?.fallback_used).toBe(true);
  });

  it('E. Groq success with malformed optional data: correct normalization behavior', async () => {
    const mockGroq = new MockProvider('groq', true, 'malformed_optional');
    const mockGemini = new MockProvider('gemini', true, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt');

    expect(mockGroq.calls).toBe(1);
    expect(mockGemini.calls).toBe(0);
    expect(result.summary).toBe('Valid summary with non-array observations');
    expect(Array.isArray(result.observations)).toBe(true);
    expect(Array.isArray(result.resource_pressure)).toBe(true);
    expect(result.provider_metadata?.provider_used).toBe('groq');
  });

  it('F. Both providers fail: controlled AI-unavailable response, NO exception thrown', async () => {
    const mockGroq = new MockProvider('groq', true, 'fail');
    const mockGemini = new MockProvider('gemini', true, 'fail');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt');

    expect(mockGroq.calls).toBe(1);
    expect(mockGemini.calls).toBe(1);
    expect(result.summary).toContain('AI analysis currently unavailable');
    expect(result.provider_metadata?.provider_used).toBe('none');
    expect(result.provider_metadata?.status).toBe('unavailable');
    expect(result.operational_considerations.length).toBeGreaterThan(0);
  });

  it('G. Missing Groq key + Gemini configured: Groq skipped, Gemini used directly', async () => {
    const mockGroq = new MockProvider('groq', false, 'success');
    const mockGemini = new MockProvider('gemini', true, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt');

    expect(mockGroq.calls).toBe(0);
    expect(mockGemini.calls).toBe(1);
    expect(result.summary).toBe(sampleValidOutput.summary);
    expect(result.provider_metadata?.provider_used).toBe('gemini');
    expect(result.provider_metadata?.fallback_used).toBe(false);
  });

  it('H. Missing both keys: AI unavailable, returns controlled response without error', async () => {
    const mockGroq = new MockProvider('groq', false, 'success');
    const mockGemini = new MockProvider('gemini', false, 'success');
    AiProviderRouter.setProviders(mockGroq, mockGemini);

    const result = await AiProviderRouter.analyze('Test prompt');

    expect(mockGroq.calls).toBe(0);
    expect(mockGemini.calls).toBe(0);
    expect(result.summary).toContain('AI analysis currently unavailable');
    expect(result.provider_metadata?.provider_used).toBe('none');
    expect(result.provider_metadata?.status).toBe('unavailable');
  });

  describe('Operations Analyst & Incident Analyst Integration', () => {
    const sampleHospital: Hospital = {
      id: 'hosp_apex',
      name: 'Apex Super Specialty',
      lat: 21.18,
      lng: 72.82,
      trauma_team_on_shift: true,
      specialists_on_call: ['cardiologist', 'anesthetist'],
      icu_beds_free: 4,
      ventilators_free: 2,
      blood_stock: { 'O-': 5 },
      er_load_score: 2,
      accepts_scheme_patients: true,
      last_updated_at: new Date().toISOString(),
      reliability_score: 0.96,
    };

    const sampleCase: Case = {
      id: 'case_cardiac_01',
      created_at: new Date().toISOString(),
      category: 'cardiac',
      severity: 'red',
      need_profile: {
        category: 'cardiac',
        severity: 'red',
        specialists_needed: ['cardiologist'],
        capability_flags: ['icu'],
      },
      vitals_summary: 'Acute chest pain',
      onset_time: '20 min ago',
      treatment_administered: 'Oxygen',
      ambulance_location: { lat: 21.17, lng: 72.81 },
      status: 'accepted',
      accepted_hospital_id: 'hosp_apex',
      active_request_id: 'req_01',
      attempt_number: 1,
    };

    it('Operations Analyst calls router and returns structured analysis', async () => {
      const mockGroq = new MockProvider('groq', true, 'success');
      const mockGemini = new MockProvider('gemini', true, 'success');
      AiProviderRouter.setProviders(mockGroq, mockGemini);

      const result = await AiOperationsAnalyst.analyzeOperations({
        hospitals: [sampleHospital],
      });

      expect(mockGroq.calls).toBe(1);
      expect(result.summary).toBeDefined();
      expect(result.provider_metadata?.provider_used).toBe('groq');
    });

    it('Incident Analyst calls router and returns structured post-incident analysis', async () => {
      const mockGroq = new MockProvider('groq', true, 'success');
      const mockGemini = new MockProvider('gemini', true, 'success');
      AiProviderRouter.setProviders(mockGroq, mockGemini);

      const result = await AiIncidentAnalyst.analyzeIncident({
        caseData: sampleCase,
        requests: [],
        auditLogs: [],
      });

      expect(mockGroq.calls).toBe(1);
      expect(result.summary).toBeDefined();
      expect(result.provider_metadata?.provider_used).toBe('groq');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExplanationService,
  DeterministicExplanationGenerator,
  MockAiProvider,
  ExplanationRequest,
} from '../src/ai/explanationService';

describe('Part 7: Optional AI Explanation & Deterministic Fallback', () => {
  const sampleRequest: ExplanationRequest = {
    hospitalName: 'CityCare General',
    category: 'cardiac',
    severity: 'red',
    breakdown: {
      capability_match_pct: 100,
      distance_km: 4.2,
      distance_factor: 0.88,
      load_factor: 0.88,
      staleness_factor: 1.0,
      final_score: 77.4,
    },
    specialistsMatched: ['cardiologist'],
    capabilitiesMatched: ['ecg', 'icu'],
    distanceKm: 4.2,
    erLoadScore: 2,
    freshness: 'fresh',
  };

  beforeEach(() => {
    ExplanationService.setAiProvider(null);
  });

  it('generates accurate, facts-based deterministic explanation', () => {
    const text = DeterministicExplanationGenerator.generate(sampleRequest);

    expect(text).toContain('CityCare General selected (4.2 km away)');
    expect(text).toContain('cardiologist on shift');
    expect(text).toContain('ECG/ICU ready');
    expect(text).toContain('moderate ER load');
    expect(text).toContain('Score: 77.4');
  });

  it('notes stale data in the deterministic explanation', () => {
    const staleReq: ExplanationRequest = {
      ...sampleRequest,
      freshness: 'stale',
    };
    const text = DeterministicExplanationGenerator.generate(staleReq);
    expect(text).toContain('data verified within 30m');
  });

  it('defaults to deterministic source when no AI provider is set', async () => {
    const result = await ExplanationService.explainMatch(sampleRequest);

    expect(result.source).toBe('deterministic');
    expect(result.explanation).toContain('CityCare General');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('uses AI provider when configured and healthy', async () => {
    const mockAi = new MockAiProvider(false, 10);
    ExplanationService.setAiProvider(mockAi);

    const result = await ExplanationService.explainMatch(sampleRequest);

    expect(result.source).toBe('ai');
    expect(result.explanation).toContain('AI Summary');
    expect(result.explanation).toContain('CityCare General');
  });

  it('gracefully falls back to deterministic explanation if AI provider fails', async () => {
    const failingAi = new MockAiProvider(true); // Throws connection error
    ExplanationService.setAiProvider(failingAi);

    const result = await ExplanationService.explainMatch(sampleRequest);

    expect(result.source).toBe('deterministic');
    expect(result.explanation).toContain('CityCare General selected (4.2 km away)');
  });
});

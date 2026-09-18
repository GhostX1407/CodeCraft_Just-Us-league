/**
 * Integration Tests: Rich Dynamic Reasoning & Neutral AI Explanation
 * 
 * Verifies:
 * 1. Rich fact-based breakdown generation (capabilities, operational factors, match scores, comparison notes)
 * 2. Neutral AI wording: "selected by the deterministic matching engine based on the verified match factors" (never "optimal facility")
 * 3. AI remains strictly explanatory: never ranks, determines eligibility, or overrides scores
 * 4. Guaranteed deterministic fallback on AI failure or timeout
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExplanationService,
  DeterministicExplanationGenerator,
  MockAiProvider,
  ExplanationRequest,
} from '../src/ai/explanationService';

describe('Rich Dynamic Reasoning & Neutral AI Policy', () => {
  let sampleRequest: ExplanationRequest;

  beforeEach(() => {
    ExplanationService.setAiProvider(null);

    sampleRequest = {
      hospitalName: 'CityCare General Hospital',
      category: 'cardiac',
      severity: 'red',
      breakdown: {
        capability_match_pct: 100,
        distance_km: 3.2,
        distance_factor: 0.75,
        load_factor: 0.88,
        freshness_factor: 1.0,
        final_score: 66.0,
      },
      specialistsMatched: ['cardiologist'],
      capabilitiesMatched: ['ecg', 'icu'],
      distanceKm: 3.2,
      erLoadScore: 2,
      freshness: 'fresh',
      ageMinutes: 4,
      comparisonCandidates: [
        {
          hospitalName: 'Surat Apex Trauma',
          eligible: true,
          finalScore: 54.0,
          distanceKm: 6.5,
        },
        {
          hospitalName: 'Mother & Child Care',
          eligible: false,
          reason: 'Missing required specialist: cardiologist',
        },
      ],
    };
  });

  it('generates rich, fact-based breakdown from verified match data', () => {
    const rich = DeterministicExplanationGenerator.generateRichBreakdown(sampleRequest);

    // Selected hospital
    expect(rich.selectedHospital).toBe('CityCare General Hospital');

    // Required capabilities
    expect(rich.requiredCapabilities.length).toBeGreaterThanOrEqual(3);
    const capLabels = rich.requiredCapabilities.map((c) => c.label);
    expect(capLabels.some((l) => /cardiologist/i.test(l))).toBe(true);
    expect(capLabels.some((l) => /icu/i.test(l))).toBe(true);
    expect(capLabels.some((l) => /ecg/i.test(l))).toBe(true);

    // Operational factors
    expect(rich.operationalFactors.distanceKm).toBe(3.2);
    expect(rich.operationalFactors.erLoadScore).toBe(2);
    expect(rich.operationalFactors.freshness).toBe('fresh');

    // Match scores
    expect(rich.matchScore.capabilityMatchPct).toBe(100);
    expect(rich.matchScore.distanceFactor).toBe(0.75);
    expect(rich.matchScore.loadFactor).toBe(0.88);
    expect(rich.matchScore.freshnessFactor).toBe(1.0);
    expect(rich.matchScore.finalScore).toBe(66.0);

    // Why others not selected
    expect(rich.whyOthersNotSelected).toBeDefined();
    expect(rich.whyOthersNotSelected?.length).toBe(2);
    expect(rich.whyOthersNotSelected![1].reason).toMatch(/Ineligible.*cardiologist/);
  });

  it('proves AI provider uses neutral language without subjective claims like "optimal facility"', async () => {
    ExplanationService.setAiProvider(new MockAiProvider(false));

    const result = await ExplanationService.explainMatch(sampleRequest);

    expect(result.source).toBe('ai');
    expect(result.explanation).toContain('selected by the deterministic matching engine based on the verified match factors');
    expect(result.explanation).not.toContain('optimal facility');
  });

  it('falls back to deterministic explanation safely when AI provider fails or times out', async () => {
    ExplanationService.setAiProvider(new MockAiProvider(true)); // Configured to fail

    const result = await ExplanationService.explainMatch(sampleRequest);

    expect(result.source).toBe('deterministic');
    expect(result.explanation).toContain('CityCare General Hospital selected');
    expect(result.explanation).toContain('3.2 km away');
    expect(result.richBreakdown).toBeDefined();
    expect(result.richBreakdown?.selectedHospital).toBe('CityCare General Hospital');
  });
});

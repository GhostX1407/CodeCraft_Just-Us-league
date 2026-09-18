/**
 * Explanation Service & Deterministic Fallback Engine
 * 
 * Generates plain-language dispatcher explanations for deterministic match results.
 * Strictly adheres to the AI Policy in docs/spec.md and docs/team-tech-stack-and-work-distribution.md:
 * - AI is optional and explanatory ONLY
 * - AI NEVER decides hospital ranking, eligibility, or resource holds
 * - A robust deterministic fallback is ALWAYS guaranteed
 * 
 * Owned by Person 2.
 */

import { MatchScoreBreakdown } from '../services/types';

export interface ExplanationRequest {
  hospitalName: string;
  category: string;
  severity: string;
  breakdown: MatchScoreBreakdown;
  specialistsMatched: string[];
  capabilitiesMatched: string[];
  distanceKm: number;
  erLoadScore: number;
  freshness: string;
}

export interface ExplanationResult {
  explanation: string;
  source: 'deterministic' | 'ai';
  latencyMs: number;
}

export interface AiProvider {
  generate(request: ExplanationRequest): Promise<string>;
}

/**
 * Deterministic Explanation Generator (zero LLM dependency)
 */
export class DeterministicExplanationGenerator {
  static generate(req: ExplanationRequest): string {
    const parts: string[] = [];

    // 1. Hospital and Distance
    parts.push(`${req.hospitalName} selected (${req.distanceKm} km away)`);

    // 2. Capabilities & Specialists
    const clinicalHighlights: string[] = [];
    if (req.specialistsMatched.length > 0) {
      clinicalHighlights.push(
        `${req.specialistsMatched.map((s) => s.replace(/_/g, ' ')).join(', ')} on shift`
      );
    }
    if (req.capabilitiesMatched.length > 0) {
      clinicalHighlights.push(
        `${req.capabilitiesMatched.map((c) => c.toUpperCase()).join('/')} ready`
      );
    }

    if (clinicalHighlights.length > 0) {
      parts.push(clinicalHighlights.join(', '));
    }

    // 3. Operational Load
    const loadLabels: Record<number, string> = {
      1: 'low ER load',
      2: 'moderate ER load',
      3: 'medium load',
      4: 'high ER load',
      5: 'critical ER load',
    };
    const loadDesc = loadLabels[req.erLoadScore] || `load score ${req.erLoadScore}/5`;
    parts.push(loadDesc);

    // 4. Freshness note if stale/unknown
    if (req.freshness === 'stale') {
      parts.push('data verified within 30m');
    } else if (req.freshness === 'unknown') {
      parts.push('status update pending confirmation');
    }

    return `${parts.join('. ')}. (Score: ${req.breakdown.final_score})`;
  }
}

/**
 * Mockable / Pluggable AI Provider for demonstration
 */
export class MockAiProvider implements AiProvider {
  constructor(private readonly shouldFail: boolean = false, private readonly delayMs: number = 20) {}

  async generate(req: ExplanationRequest): Promise<string> {
    if (this.shouldFail) {
      throw new Error('AI provider connection timeout');
    }

    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    return `AI Summary: ${req.hospitalName} is currently the optimal facility for this ${req.severity} ${req.category} emergency, located ${req.distanceKm} km out with confirmed ${req.specialistsMatched.join(', ')} availability.`;
  }
}

let activeAiProvider: AiProvider | null = null;

export class ExplanationService {
  /**
   * Configures or swaps the active AI provider
   */
  static setAiProvider(provider: AiProvider | null): void {
    activeAiProvider = provider;
  }

  /**
   * Generates a plain-language explanation with guaranteed deterministic fallback
   */
  static async explainMatch(request: ExplanationRequest): Promise<ExplanationResult> {
    const startTime = Date.now();

    // If AI provider is present, attempt AI explanation with strict timeout
    if (activeAiProvider) {
      try {
        const aiPromise = activeAiProvider.generate(request);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI explanation timeout')), 1500)
        );

        const aiExplanation = await Promise.race([aiPromise, timeoutPromise]);
        if (aiExplanation && typeof aiExplanation === 'string' && aiExplanation.trim().length > 0) {
          return {
            explanation: aiExplanation.trim(),
            source: 'ai',
            latencyMs: Date.now() - startTime,
          };
        }
      } catch {
        // Fall back gracefully on ANY AI error or timeout
      }
    }

    // Deterministic fallback: Always succeeds and produces medical-dispatcher explanation
    const fallbackText = DeterministicExplanationGenerator.generate(request);
    return {
      explanation: fallbackText,
      source: 'deterministic',
      latencyMs: Date.now() - startTime,
    };
  }
}

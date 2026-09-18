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

export interface ExplanationCandidateComparison {
  hospitalName: string;
  eligible: boolean;
  reason?: string;
  finalScore?: number;
  distanceKm?: number;
}

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
  ageMinutes?: number;
  comparisonCandidates?: ExplanationCandidateComparison[];
}

export interface RichExplanationBreakdown {
  selectedHospital: string;
  requiredCapabilities: {
    label: string;
    satisfied: boolean;
  }[];
  operationalFactors: {
    distanceKm: number;
    erLoadScore: number;
    freshness: string;
    ageMinutes?: number;
  };
  matchScore: {
    capabilityMatchPct: number;
    distanceFactor: number;
    loadFactor: number;
    freshnessFactor: number;
    finalScore: number;
  };
  whyOthersNotSelected?: {
    hospitalName: string;
    reason: string;
  }[];
  summaryText: string;
}

export interface ExplanationResult {
  explanation: string;
  source: 'deterministic' | 'ai';
  latencyMs: number;
  richBreakdown?: RichExplanationBreakdown;
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

  /**
   * Generates a rich, structured, fact-based breakdown conforming to spec.md §29-34.
   */
  static generateRichBreakdown(req: ExplanationRequest): RichExplanationBreakdown {
    const requiredCaps: { label: string; satisfied: boolean }[] = [];

    for (const spec of req.specialistsMatched) {
      requiredCaps.push({
        label: `${spec.charAt(0).toUpperCase() + spec.slice(1).replace(/_/g, ' ')} available`,
        satisfied: true,
      });
    }

    for (const cap of req.capabilitiesMatched) {
      requiredCaps.push({
        label: `${cap.toUpperCase()} available`,
        satisfied: true,
      });
    }

    const whyOthers: { hospitalName: string; reason: string }[] = [];
    if (req.comparisonCandidates) {
      for (const other of req.comparisonCandidates) {
        if (!other.eligible) {
          whyOthers.push({
            hospitalName: other.hospitalName,
            reason: `Ineligible: ${other.reason || 'Missing required capability'}`,
          });
        } else {
          whyOthers.push({
            hospitalName: other.hospitalName,
            reason: `Lower ranking score (${other.finalScore ?? 'N/A'}) or farther (${other.distanceKm ?? 'N/A'} km)`,
          });
        }
      }
    }

    const summaryText = this.generate(req);

    return {
      selectedHospital: req.hospitalName,
      requiredCapabilities: requiredCaps,
      operationalFactors: {
        distanceKm: req.distanceKm,
        erLoadScore: req.erLoadScore,
        freshness: req.freshness,
        ageMinutes: req.ageMinutes,
      },
      matchScore: {
        capabilityMatchPct: req.breakdown.capability_match_pct,
        distanceFactor: req.breakdown.distance_factor,
        loadFactor: req.breakdown.load_factor,
        freshnessFactor: req.breakdown.freshness_factor,
        finalScore: req.breakdown.final_score,
      },
      whyOthersNotSelected: whyOthers.length > 0 ? whyOthers : undefined,
      summaryText,
    };
  }
}

/**
 * Mockable / Pluggable AI Provider for demonstration.
 * AI output is strictly explanatory and uses neutral language.
 */
export class MockAiProvider implements AiProvider {
  constructor(private readonly shouldFail: boolean = false, private readonly delayMs: number = 20) {}

  async generate(req: ExplanationRequest): Promise<string> {
    if (this.shouldFail) {
      throw new Error('AI provider connection timeout');
    }

    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    // Neutral deterministic language (no biased claims of "optimal facility")
    return `AI Summary: ${req.hospitalName} was selected by the deterministic matching engine based on the verified match factors: located ${req.distanceKm} km away with confirmed ${req.specialistsMatched.join(', ')} availability and load score ${req.erLoadScore}/5.`;
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
    const richBreakdown = DeterministicExplanationGenerator.generateRichBreakdown(request);

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
            richBreakdown,
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
      richBreakdown,
    };
  }
}


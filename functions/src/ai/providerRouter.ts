/**
 * AI Provider Router — Groq Primary + Gemini Fallback
 * 
 * Implements clean provider abstraction, priority router, bounded timeouts,
 * structured JSON validation, and strict failure isolation.
 * 
 * Safety Rules:
 * - AI is informational ONLY
 * - AI NEVER modifies routing, matching, eligibility, holds, handoffs, or reliability
 * - Both providers can fail without breaking core Raahi functionality
 * 
 * Owned by Person 2.
 */

import { AiAnalysisResponse, AiProviderInterface } from './types';

export function normalizeAnalysisResponse(raw: any): AiAnalysisResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Malformed AI response: expected JSON object');
  }

  if (typeof raw.summary !== 'string' || raw.summary.trim().length === 0) {
    throw new Error('Malformed AI response: missing or invalid "summary" field');
  }

  const toStringArray = (val: any): string[] => {
    if (!Array.isArray(val)) return [];
    return val.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)));
  };

  return {
    summary: raw.summary.trim(),
    observations: toStringArray(raw.observations),
    resource_pressure: toStringArray(raw.resource_pressure),
    bottlenecks: toStringArray(raw.bottlenecks),
    response_time_observations: toStringArray(raw.response_time_observations),
    reroute_observations: toStringArray(raw.reroute_observations),
    data_quality_notes: toStringArray(raw.data_quality_notes),
    operational_considerations: toStringArray(raw.operational_considerations),
  };
}

/**
 * Primary Provider: Groq
 */
export class GroqProvider implements AiProviderInterface {
  readonly name = 'groq' as const;

  getApiKey(): string | undefined {
    return process.env.GROQ_API_KEY;
  }

  getModel(): string {
    return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  async generateAnalysis(prompt: string, timeoutMs: number = 3500): Promise<AiAnalysisResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.getModel(),
          messages: [
            {
              role: 'system',
              content:
                'You are the Raahi Emergency Operations & Incident Analyst. Respond ONLY with a valid JSON object matching this schema: {"summary": string, "observations": string[], "resource_pressure": string[], "bottlenecks": string[], "response_time_observations": string[], "reroute_observations": string[], "data_quality_notes": string[], "operational_considerations": string[]}. Do not provide medical routing decisions.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Groq API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq returned empty response content');
      }

      const parsed = JSON.parse(content);
      return normalizeAnalysisResponse(parsed);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Fallback Provider: Gemini
 */
export class GeminiProvider implements AiProviderInterface {
  readonly name = 'gemini' as const;

  getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  getModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  async generateAnalysis(prompt: string, timeoutMs: number = 3500): Promise<AiAnalysisResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const model = this.getModel();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are the Raahi Emergency Operations & Incident Analyst. Respond ONLY with a valid JSON object adhering to this schema: {"summary": string, "observations": string[], "resource_pressure": string[], "bottlenecks": string[], "response_time_observations": string[], "reroute_observations": string[], "data_quality_notes": string[], "operational_considerations": string[]}.\n\nContext and Data:\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini returned empty candidate content');
      }

      const parsed = JSON.parse(text);
      return normalizeAnalysisResponse(parsed);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Provider Router with Groq Primary and Gemini Fallback
 */
export class AiProviderRouter {
  private static groqProvider: AiProviderInterface = new GroqProvider();
  private static geminiProvider: AiProviderInterface = new GeminiProvider();

  static setProviders(groq: AiProviderInterface, gemini: AiProviderInterface): void {
    this.groqProvider = groq;
    this.geminiProvider = gemini;
  }

  static resetProviders(): void {
    this.groqProvider = new GroqProvider();
    this.geminiProvider = new GeminiProvider();
  }

  static async analyze(prompt: string, timeoutMs: number = 3500): Promise<AiAnalysisResponse> {
    const startTime = Date.now();

    // 1. Attempt Groq (Primary) if configured
    if (this.groqProvider.isConfigured()) {
      try {
        const result = await this.groqProvider.generateAnalysis(prompt, timeoutMs);
        return {
          ...result,
          provider_metadata: {
            provider_used: 'groq',
            fallback_used: false,
            latency_ms: Date.now() - startTime,
            status: 'success',
          },
        };
      } catch {
        // Recoverable Groq failure: fall through to Gemini fallback
      }
    }

    // 2. Attempt Gemini (Fallback) if configured
    if (this.geminiProvider.isConfigured()) {
      try {
        const result = await this.geminiProvider.generateAnalysis(prompt, timeoutMs);
        const groqWasAttempted = this.groqProvider.isConfigured();
        return {
          ...result,
          provider_metadata: {
            provider_used: 'gemini',
            fallback_used: groqWasAttempted,
            latency_ms: Date.now() - startTime,
            status: groqWasAttempted ? 'fallback_success' : 'success',
          },
        };
      } catch {
        // Gemini fallback failed: fall through to controlled unavailable
      }
    }

    // 3. Both failed or unconfigured: return controlled AI-unavailable response
    return {
      summary: 'AI analysis currently unavailable',
      observations: [],
      resource_pressure: [],
      bottlenecks: [],
      response_time_observations: [],
      reroute_observations: [],
      data_quality_notes: ['AI service currently unconfigured or provider unavailable'],
      operational_considerations: [
        'Deterministic hospital matching and safety-critical coordination remain fully operational and authoritative',
      ],
      provider_metadata: {
        provider_used: 'none',
        fallback_used: this.groqProvider.isConfigured(),
        latency_ms: Date.now() - startTime,
        status: 'unavailable',
      },
    };
  }
}

/**
 * AI Provider & Analysis Contracts
 * 
 * Shared types for AI Operations Analyst and AI Incident Analyst
 * adhering to the Groq Primary + Gemini Fallback policy.
 * 
 * Owned by Person 2.
 */

import { Hospital, Case, Request, ResourceHold, AuditLog } from '../services/types';

export interface AiAnalysisResponse {
  summary: string;
  observations: string[];
  resource_pressure: string[];
  bottlenecks: string[];
  response_time_observations: string[];
  reroute_observations: string[];
  data_quality_notes: string[];
  operational_considerations: string[];
  provider_metadata?: {
    provider_used: 'groq' | 'gemini' | 'none';
    fallback_used: boolean;
    latency_ms: number;
    status: 'success' | 'fallback_success' | 'unavailable';
  };
}

export interface AiOperationsAnalystInput {
  hospitals: Hospital[];
  recentRequests?: Request[];
  auditLogs?: AuditLog[];
  mciDistributions?: any[];
  timestamp?: string;
}

export interface AiIncidentAnalystInput {
  caseData: Case;
  requests?: Request[];
  auditLogs?: AuditLog[];
  hospital?: Hospital;
  holds?: ResourceHold[];
}

export interface AiProviderInterface {
  readonly name: 'groq' | 'gemini';
  isConfigured(): boolean;
  generateAnalysis(prompt: string, timeoutMs?: number): Promise<AiAnalysisResponse>;
}

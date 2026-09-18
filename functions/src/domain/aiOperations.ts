/**
 * Raahi — AI Operations Layer
 * Feature 14: Informational-only Operations & Incident Analysis.
 * 
 * STRICT COMPLIANCE:
 * - AI MUST NOT participate in ranking, matching, allocation, commitment, rerouting, severity, or clinical decisions.
 * - Deterministic engine is the sole authority.
 * - Always stamped with non-decisional disclaimer.
 */

import { AiProviderRouter } from '../ai/providerRouter';
import { Incident } from './crisisManagement';
import { Hospital } from '../services/types';

export interface OperationalBriefing {
  summary: string;
  keyObservations: string[];
  bottlenecks: string[];
  resourcePressures: string[];
  operationalRecommendations: string[];
  modelUsed: string;
  disclaimer: string;
  timestamp: string;
}

export class AiOperationsService {
  private static readonly DISCLAIMER =
    'AI-generated operational brief for administrative coordination only. Not for clinical diagnosis or triage routing decisions.';

  /**
   * Generates a high-level operational briefing for an ongoing crisis incident.
   */
  static async generateIncidentBriefing(
    incident: Incident,
    allocations: Array<{ caseId: string; hospitalId: string; hospitalName: string; severity: string }>
  ): Promise<OperationalBriefing> {
    const casualtyCount = incident.cases?.length || 0;
    const prompt = `Incident Details:
Name: ${incident.name}
Type: ${incident.type}
Casualties: ${casualtyCount}
Location: [${incident.location?.lat}, ${incident.location?.lng}]
Status: ${incident.status}
Bottlenecks identified: ${incident.bottlenecksDetected?.join('; ') || 'None'}
Allocations so far: ${allocations.length} casualties assigned.
Assigned hospitals breakdown: ${JSON.stringify(
      allocations.reduce((acc, a) => {
        acc[a.hospitalName] = (acc[a.hospitalName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )}

Provide an operational coordination summary for emergency administrators. Focus on resource distribution, surge capacity, and emergency staging.`;

    try {
      const response = await AiProviderRouter.analyze(prompt, 4000);
      if (response.provider_metadata?.status === 'success' || response.provider_metadata?.status === 'fallback_success') {
        return {
          summary: response.summary,
          keyObservations: response.observations,
          bottlenecks: response.bottlenecks.length > 0 ? response.bottlenecks : (incident.bottlenecksDetected || []),
          resourcePressures: response.resource_pressure,
          operationalRecommendations: response.operational_considerations,
          modelUsed: response.provider_metadata.provider_used,
          disclaimer: this.DISCLAIMER,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // Fallback below
    }

    // Heuristic deterministic fallback when offline/unconfigured
    const hospitalCounts = allocations.reduce((acc, a) => {
      acc[a.hospitalName] = (acc[a.hospitalName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: `Crisis event "${incident.name}" (${incident.type}) is currently ACTIVE with ${casualtyCount} reported casualties. Multi-casualty deterministic load-balancing is distributing patients across ${Object.keys(hospitalCounts).length} regional trauma centers.`,
      keyObservations: [
        `Total active allocations: ${allocations.length} of ${casualtyCount} casualties matched.`,
        `Primary load centers: ${Object.entries(hospitalCounts).map(([name, count]) => `${name} (${count} cases)`).join(', ') || 'None assigned yet'}.`,
        (incident.bottlenecksDetected?.length || 0) > 0
          ? `Detected ${incident.bottlenecksDetected.length} resource bottleneck(s) requiring coordination.`
          : 'Regional capacity within tolerable operating thresholds.',
      ],
      bottlenecks: incident.bottlenecksDetected || [],
      resourcePressures: (incident.bottlenecksDetected || []).map(b => `${b} is experiencing heightened demand`),
      operationalRecommendations: [
        'Maintain continuous EMS coordination and stagger arrivals by priority band.',
        'Reserve tertiary trauma resuscitation bays for red-priority cases.',
        'Engage secondary network hospitals for non-critical transfers if bottleneck persists.',
      ],
      modelUsed: 'heuristic-deterministic-fallback',
      disclaimer: this.DISCLAIMER,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generates network-wide operational health brief for the admin dashboard.
   */
  static async generateNetworkBriefing(
    hospitals: Hospital[],
    activeCasesCount: number,
    crisisActive: boolean
  ): Promise<OperationalBriefing> {
    const availableBeds = hospitals.reduce((sum, h) => sum + (h.icu_beds_free || 0), 0);
    const availableVents = hospitals.reduce((sum, h) => sum + (h.ventilators_free || 0), 0);

    return {
      summary: `Raahi Emergency Grid is operating with ${availableBeds} ICU beds and ${availableVents} ventilators immediately available across ${hospitals.length} facilities. Network status: ${crisisActive ? 'CRISIS MODE' : 'NORMAL'}.`,
      keyObservations: [
        `Active in-flight cases: ${activeCasesCount}.`,
        `Available ICU beds: ${availableBeds}.`,
        `Available ventilators: ${availableVents}.`,
        `Active hospitals monitored: ${hospitals.length}.`,
      ],
      bottlenecks: availableBeds < 5 ? ['Regional ICU capacity approaching saturation (< 5 beds network-wide)'] : [],
      resourcePressures: availableVents < 5 ? ['High demand for mechanical ventilators'] : ['Normal operational pressure'],
      operationalRecommendations: [
        'Review hospital verification requests to expand accredited regional network.',
        'Ensure ambulance telemetry remains active for accurate arrival predictions.',
      ],
      modelUsed: 'deterministic-network-monitor',
      disclaimer: this.DISCLAIMER,
      timestamp: new Date().toISOString(),
    };
  }
}

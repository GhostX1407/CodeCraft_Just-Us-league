/**
 * Raahi Crisis Mode & Emergency Incident Engine (Feature 2)
 * 
 * Provides automated incident cohort creation, deterministic mass casualty matching,
 * hospital load monitoring, resource bottleneck analysis, and incident reporting.
 */

import { getDb } from '../services/firebase';
import { HospitalRepository, CaseRepository, RequestRepository, AuditRepository } from '../services/repositories';
import { Case, Request } from '../services/types';
import { MatchingAdapter } from '../services/matchingAdapter';
import { generateDynamicNeedProfile } from './vitalsIntelligence';

export interface IncidentSeverityDistribution {
  red: number;
  yellow: number;
  green: number;
}

export interface HospitalPressureSummary {
  hospitalId: string;
  hospitalName: string;
  allocatedCasesCount: number;
  remainingIcuBeds: number;
  remainingVentilators: number;
  isOverCapacity: boolean;
}

export interface Incident {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  createdAt: string;
  status: 'active' | 'contained' | 'resolved';
  cases: string[];
  severityDistribution: IncidentSeverityDistribution;
  hospitalAllocation: Record<string, HospitalPressureSummary>;
  bottlenecksDetected: string[];
  incidentSummary: string;
}

export class IncidentRepository {
  static getCollection() {
    return getDb().collection('incidents');
  }

  static async get(id: string): Promise<Incident | null> {
    const doc = await this.getCollection().doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Incident;
  }

  static async create(incident: Incident): Promise<void> {
    await this.getCollection().doc(incident.id).set(incident);
  }

  static async listAll(): Promise<Incident[]> {
    const snap = await this.getCollection().orderBy('createdAt', 'desc').limit(25).get();
    return snap.docs.map((d) => d.data() as Incident);
  }

  static async update(id: string, updates: Partial<Incident>): Promise<void> {
    await this.getCollection().doc(id).update(updates as any);
  }
}

export class CrisisManagementService {
  /**
   * Activates Raahi Crisis Mode
   * Generates cohort of cases, runs joint matching across regional network,
   * reserves resources, detects bottlenecks, and persists incident record.
   */
  static async activateCrisisMode(params: {
    incidentName: string;
    incidentType: string;
    location: { lat: number; lng: number };
    totalPatients: number;
    severitySplit?: Partial<IncidentSeverityDistribution>;
    actorId?: string;
  }): Promise<{
    incident: Incident;
    casesCreated: Case[];
    allocationSummary: Record<string, number>;
    bottlenecks: string[];
  }> {
    const now = new Date().toISOString();
    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const total = params.totalPatients || 12;

    // Determine severity breakdown (e.g. 40% Red, 40% Yellow, 20% Green default)
    const redCount = params.severitySplit?.red ?? Math.max(1, Math.round(total * 0.4));
    const yellowCount = params.severitySplit?.yellow ?? Math.max(1, Math.round(total * 0.4));
    const greenCount = params.severitySplit?.green ?? Math.max(0, total - redCount - yellowCount);

    const severityList: ('red' | 'yellow' | 'green')[] = [];
    for (let i = 0; i < redCount; i++) severityList.push('red');
    for (let i = 0; i < yellowCount; i++) severityList.push('yellow');
    for (let i = 0; i < greenCount; i++) severityList.push('green');

    const allHospitals = await HospitalRepository.listAll();
    const casesCreated: Case[] = [];
    const hospitalAllocationCount: Record<string, number> = {};
    const simulatedResourceHold: Record<string, { icu: number; vent: number }> = {};

    allHospitals.forEach((h) => {
      hospitalAllocationCount[h.id] = 0;
      simulatedResourceHold[h.id] = { icu: 0, vent: 0 };
    });

    // 1. Generate cohort of emergency cases
    for (let i = 0; i < severityList.length; i++) {
      const severity = severityList[i];
      const caseId = `case_${incidentId}_p${i + 1}`;
      const category = i % 2 === 0 ? 'trauma' : 'cardiac';
      const need = generateDynamicNeedProfile(category, severity);

      const newCase: Case = {
        id: caseId,
        created_at: now,
        category,
        severity,
        need_profile: {
          specialists_needed: need.specialists_needed as any,
          capability_flags: need.capability_flags as any,
          blood_type_needed: need.blood_type_needed as any,
        },
        vitals_summary: `Incident patient #${i + 1} (${severity.toUpperCase()}) - ${params.incidentName}`,
        onset_time: '15 min ago',
        treatment_administered: severity === 'red' ? 'C-spine immobilized, high-flow O2, bilateral IV lines' : 'Triage assessment complete',
        patient_basic_info: { age: 25 + (i * 3) % 45, sex: i % 2 === 0 ? 'male' : 'female' },
        incident_group_id: incidentId,
        ambulance_location: {
          lat: params.location.lat + (Math.random() - 0.5) * 0.015,
          lng: params.location.lng + (Math.random() - 0.5) * 0.015,
        },
        status: 'routing',
        active_request_id: null,
        attempt_number: 0,
      };

      await CaseRepository.create(newCase);
      casesCreated.push(newCase);
    }

    // 2. Deterministic multi-patient joint distribution with capacity constraint protection
    const sortedCases = [...casesCreated].sort((a, b) => {
      const rank = { red: 0, yellow: 1, green: 2 };
      return rank[a.severity] - rank[b.severity];
    });

    const requestsToCreate: Request[] = [];

    for (const c of sortedCases) {
      // Find candidate hospitals that still have simulated capacity
      const candidates = allHospitals
        .filter((h) => {
          const holds = simulatedResourceHold[h.id];
          if (c.severity === 'red' && h.icu_beds_free - holds.icu <= 0) {
            return false; // Skip hospital if simulated ICU exhausted
          }
          return true;
        })
        .map((h) => {
          const baseMatch = MatchingAdapter.rankEligibleCandidates(c, [h]);
          if (baseMatch.length === 0) return null;
          const scoreObj = baseMatch[0];

          // Apply regional anti-concentration penalty for already assigned cases
          const assignedCount = hospitalAllocationCount[h.id] || 0;
          const concentrationPenalty = Math.max(0.1, 1 - assignedCount * 0.15);
          const adjustedScore = scoreObj.breakdown.final_score * concentrationPenalty;

          return {
            hospital: h,
            adjustedScore,
            breakdown: scoreObj.breakdown,
            reason: scoreObj.reason,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b!.adjustedScore - a!.adjustedScore);

      if (candidates.length > 0) {
        const top = candidates[0]!;
        hospitalAllocationCount[top.hospital.id] = (hospitalAllocationCount[top.hospital.id] || 0) + 1;

        if (c.severity === 'red') {
          simulatedResourceHold[top.hospital.id].icu += 1;
        }

        const requestId = `req_${c.id}_att1`;
        const req: Request = {
          id: requestId,
          case_id: c.id,
          hospital_id: top.hospital.id,
          status: 'pending',
          sent_at: now,
          responded_at: null,
          expires_at: new Date(Date.now() + 60000).toISOString(),
          attempt_number: 1,
          match_score_breakdown: top.breakdown,
          reason_shown_to_dispatcher: `${top.hospital.name} — Joint Crisis Allocation: ${top.reason}`,
          need_profile_snapshot: c.need_profile,
          hospital_capability_snapshot: {
            trauma_team_on_shift: top.hospital.trauma_team_on_shift,
            specialists_on_call: top.hospital.specialists_on_call,
            icu_beds_free: top.hospital.icu_beds_free,
            ventilators_free: top.hospital.ventilators_free,
            er_load_score: top.hospital.er_load_score,
            last_updated_at: now,
          },
        };

        requestsToCreate.push(req);
        await RequestRepository.create(req);
        await CaseRepository.update(c.id, {
          active_request_id: requestId,
          attempt_number: 1,
        });
      }
    }

    // 3. Bottleneck Analysis
    const bottlenecks: string[] = [];
    const hospitalAllocationSummary: Record<string, HospitalPressureSummary> = {};

    allHospitals.forEach((h) => {
      const allocated = hospitalAllocationCount[h.id] || 0;
      const icuLeft = h.icu_beds_free - simulatedResourceHold[h.id].icu;
      const isOver = icuLeft <= 0 && allocated > 0;

      if (allocated > 0) {
        hospitalAllocationSummary[h.id] = {
          hospitalId: h.id,
          hospitalName: h.name,
          allocatedCasesCount: allocated,
          remainingIcuBeds: Math.max(0, icuLeft),
          remainingVentilators: h.ventilators_free,
          isOverCapacity: isOver,
        };
      }

      if (icuLeft <= 1 && allocated > 0) {
        bottlenecks.push(`${h.name} ICU capacity critically low (${icuLeft} remaining) after receiving ${allocated} casualties`);
      }
    });

    const activeHospitalsCount = Object.keys(hospitalAllocationSummary).length;
    const summaryText = `Crisis Incident [${params.incidentName}]: ${total} casualties (${redCount} RED, ${yellowCount} YELLOW, ${greenCount} GREEN) deterministically distributed across ${activeHospitalsCount} regional medical facilities. ${bottlenecks.length > 0 ? bottlenecks.join('. ') : 'Regional network capacity stable.'}`;

    const incident: Incident = {
      id: incidentId,
      name: params.incidentName,
      type: params.incidentType,
      location: params.location,
      createdAt: now,
      status: 'active',
      cases: casesCreated.map((c) => c.id),
      severityDistribution: { red: redCount, yellow: yellowCount, green: greenCount },
      hospitalAllocation: hospitalAllocationSummary,
      bottlenecksDetected: bottlenecks,
      incidentSummary: summaryText,
    };

    await IncidentRepository.create(incident);

    await AuditRepository.append({
      id: `audit_${incidentId}`,
      request_id: null,
      case_id: incidentId,
      hospital_id: null,
      event_type: 'MCI_DISTRIBUTED',
      timestamp: now,
      actor_type: 'admin_user',
      actor_id: params.actorId || 'admin_commander',
      metadata: {
        incident_id: incidentId,
        total_patients: total,
        severities: { red: redCount, yellow: yellowCount, green: greenCount },
        allocations: hospitalAllocationCount,
        bottlenecks,
      },
    });

    return {
      incident,
      casesCreated,
      allocationSummary: hospitalAllocationCount,
      bottlenecks,
    };
  }
}

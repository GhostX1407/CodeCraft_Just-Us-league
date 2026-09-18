/**
 * Admin Forensic & System Oversight Service
 * 
 * Provides administrative queries for audit logs, hospital network status,
 * and reliability reporting per docs/api-contract.md §3 and docs/tasks.md T-P2-069, T-P2-070.
 * 
 * Owned by Person 2.
 */

import { AuditRepository, HospitalRepository } from './repositories';
import { AuditLog, Hospital } from './types';
import { classifyFreshness, FreshnessClassification } from './timestampUtils';
import { ReliabilityService, HospitalReliabilityStats } from '../reliability/reliabilityService';

export interface HospitalNetworkStatusItem {
  hospital: Hospital;
  freshness: FreshnessClassification;
  reliability: HospitalReliabilityStats;
}

export interface AuditQueryFilters {
  caseId?: string;
  hospitalId?: string;
  limit?: number;
}

export class AdminService {
  /**
   * Queries forensic audit trail with optional filtering
   */
  static async queryAuditLogs(filters: AuditQueryFilters = {}): Promise<AuditLog[]> {
    if (filters.caseId) {
      return AuditRepository.listByCase(filters.caseId);
    }
    if (filters.hospitalId) {
      return AuditRepository.listByHospital(filters.hospitalId);
    }
    return AuditRepository.listRecent(filters.limit || 50);
  }

  /**
   * Retrieves full reliability metrics across all hospitals
   */
  static async queryReliability(): Promise<HospitalReliabilityStats[]> {
    return ReliabilityService.getAllHospitalsReliability();
  }

  /**
   * Compiles the comprehensive hospital network status overview
   */
  static async getHospitalNetworkOverview(): Promise<HospitalNetworkStatusItem[]> {
    const hospitals = await HospitalRepository.listAll();
    const items: HospitalNetworkStatusItem[] = [];

    for (const hospital of hospitals) {
      const freshness = classifyFreshness(hospital.last_updated_at);
      let reliability: HospitalReliabilityStats;
      try {
        reliability = await ReliabilityService.getHospitalReliability(hospital.id);
      } catch {
        reliability = {
          hospital_id: hospital.id,
          hospital_name: hospital.name,
          has_history: false,
          accepted_commitments: 0,
          honored_commitments: 0,
          reliability_score: null,
          reliability_display: 'No history',
        };
      }

      items.push({
        hospital,
        freshness,
        reliability,
      });
    }

    return items;
  }
}

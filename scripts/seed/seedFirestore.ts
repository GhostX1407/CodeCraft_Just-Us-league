/**
 * Firestore Database Seeder Script
 * 
 * Populates Firestore with the canonical demo dataset:
 * - 8 realistic hospitals with diverse capabilities, load, and freshness
 * - Pre-seeded demo cases for Scenarios A, B, C (MCI), and D
 * - Pre-seeded reliability stats
 * 
 * Owned by Person 2.
 */

import { DEMO_HOSPITALS, DEMO_CASES } from './demoData';
import {
  HospitalRepository,
  CaseRepository,
} from '../../functions/src/services/repositories';
import { getDb } from '../../functions/src/services/firebase';
import { AuditLogger } from '../../functions/src/audit/auditLogger';

export interface SeedResult {
  hospitalsCount: number;
  casesCount: number;
  reliabilityCount: number;
  auditCount: number;
}

/**
 * Seeds all demo hospitals, cases, reliability data, and initial audit logs
 */
export async function seedAllDemoData(): Promise<SeedResult> {
  const db = getDb();
  let hospitalsCount = 0;
  let casesCount = 0;
  let reliabilityCount = 0;
  let auditCount = 0;

  // 1. Seed Hospitals and their Reliability Records
  for (const hospital of DEMO_HOSPITALS) {
    await HospitalRepository.create(hospital);
    hospitalsCount++;

    // Seed initial commitment statistics
    const score = hospital.reliability_score || 0.9;
    const acceptedCount = 10;
    const honoredCount = Math.round(score * acceptedCount);

    await db
      .collection('hospital_reliability')
      .doc(hospital.id)
      .set({
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        accepted_commitments: acceptedCount,
        honored_commitments: honoredCount,
        reliability_score: score,
        updated_at: new Date().toISOString(),
      });
    reliabilityCount++;
  }

  // 2. Seed Cases and initial audit events
  for (const caseItem of DEMO_CASES) {
    await CaseRepository.create(caseItem);
    casesCount++;

    await AuditLogger.log({
      caseId: caseItem.id,
      eventType: 'CASE_CREATED',
      actorType: 'ambulance_user',
      actorId: 'paramedic_demo',
      caseData: caseItem,
      needProfile: caseItem.need_profile,
      metadata: {
        category: caseItem.category,
        severity: caseItem.severity,
        incident_group_id: caseItem.incident_group_id,
      },
    });
    auditCount++;
  }

  return {
    hospitalsCount,
    casesCount,
    reliabilityCount,
    auditCount,
  };
}

// Allow direct execution via CLI: npx ts-node scripts/seed/seedFirestore.ts
if (require.main === module) {
  seedAllDemoData()
    .then((result) => {
      console.log('✅ Demo data successfully seeded:');
      console.log(`   - Hospitals: ${result.hospitalsCount}`);
      console.log(`   - Cases: ${result.casesCount}`);
      console.log(`   - Reliability Records: ${result.reliabilityCount}`);
      console.log(`   - Audit Records: ${result.auditCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error seeding demo data:', err);
      process.exit(1);
    });
}

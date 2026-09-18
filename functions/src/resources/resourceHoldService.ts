/**
 * Resource Hold & Allocation Service
 * 
 * Handles concurrency-safe calculation, validation, decrement, and release
 * of countable resources (ICU beds, ventilators, blood stock) under /hospitals/{hospitalId}/holds/{requestId}.
 * 
 * Owned by Person 2.
 */

import { getDb } from '../services/firebase';
import { HospitalRepository, HoldRepository } from '../services/repositories';
import {
  Hospital,
  NeedProfile,
  ResourceHold,
  HoldResources,
} from '../services/types';
import { nowTimestamp } from '../services/timestampUtils';
import { AuditLogger } from '../audit/auditLogger';

export class ResourceHoldService {
  /**
   * Calculates the exact countable resource requirements from a NeedProfile
   */
  static calculateRequirements(needProfile: NeedProfile): HoldResources {
    const flags = needProfile.capability_flags.map((f) => f.toLowerCase());
    const icu = flags.includes('icu') ? 1 : 0;
    const ventilator = flags.includes('ventilator') ? 1 : 0;

    const blood: Record<string, number> = {};
    if (needProfile.blood_type_needed) {
      blood[needProfile.blood_type_needed] = 1;
    }

    return { icu, ventilator, blood };
  }

  /**
   * Validates whether a hospital currently has sufficient available resources
   */
  static checkAvailability(
    hospital: Hospital,
    requirements: HoldResources
  ): { available: boolean; reason?: string } {
    if (requirements.icu > 0 && hospital.icu_beds_free < requirements.icu) {
      return {
        available: false,
        reason: `Insufficient ICU beds: required ${requirements.icu}, available ${hospital.icu_beds_free}`,
      };
    }

    if (requirements.ventilator > 0 && hospital.ventilators_free < requirements.ventilator) {
      return {
        available: false,
        reason: `Insufficient ventilators: required ${requirements.ventilator}, available ${hospital.ventilators_free}`,
      };
    }

    for (const [bloodType, count] of Object.entries(requirements.blood)) {
      const stock = hospital.blood_stock[bloodType] || 0;
      if (stock < count) {
        return {
          available: false,
          reason: `Insufficient blood stock for ${bloodType}: required ${count}, available ${stock}`,
        };
      }
    }

    return { available: true };
  }

  /**
   * Decrements countable resources on a hospital object
   */
  static applyDecrement(hospital: Hospital, requirements: HoldResources): void {
    hospital.icu_beds_free -= requirements.icu;
    hospital.ventilators_free -= requirements.ventilator;

    for (const [bloodType, count] of Object.entries(requirements.blood)) {
      const current = hospital.blood_stock[bloodType] || 0;
      hospital.blood_stock[bloodType] = Math.max(0, current - count);
    }
  }

  /**
   * Restores/increments countable resources on a hospital object upon hold release
   */
  static applyRelease(hospital: Hospital, requirements: HoldResources): void {
    hospital.icu_beds_free += requirements.icu;
    hospital.ventilators_free += requirements.ventilator;

    for (const [bloodType, count] of Object.entries(requirements.blood)) {
      const current = hospital.blood_stock[bloodType] || 0;
      hospital.blood_stock[bloodType] = current + count;
    }
  }

  /**
   * Releases an active resource hold in a Firestore transaction
   */
  static async releaseHoldInTransaction(
    transaction: any,
    hospitalId: string,
    requestId: string,
    caseId: string,
    actorId: string = 'system',
    actorType: 'system' | 'hospital_user' | 'ambulance_user' | 'admin_user' = 'system'
  ): Promise<ResourceHold | null> {
    const holdRef = HoldRepository.getDocRef(hospitalId, requestId);
    const holdSnap = await transaction.get(holdRef);

    if (!holdSnap.exists) {
      return null;
    }

    const hold = holdSnap.data() as ResourceHold;
    if (hold.status !== 'active') {
      return hold; // Already released or consumed
    }

    const hospRef = HospitalRepository.getDocRef(hospitalId);
    const hospSnap = await transaction.get(hospRef);

    if (hospSnap.exists) {
      const hospital = hospSnap.data() as Hospital;
      this.applyRelease(hospital, hold.resources);

      transaction.update(hospRef, {
        icu_beds_free: hospital.icu_beds_free,
        ventilators_free: hospital.ventilators_free,
        blood_stock: hospital.blood_stock,
        last_updated_at: nowTimestamp(),
      });
    }

    transaction.update(holdRef, {
      status: 'released',
    });

    hold.status = 'released';

    // Record audit event
    const auditRecord = AuditLogger.buildAuditLog({
      caseId,
      hospitalId,
      requestId,
      eventType: 'RESOURCE_RELEASED',
      actorType,
      actorId,
      metadata: { resources: hold.resources },
    });
    const auditRef = getDb().collection('audit_logs').doc(auditRecord.id);
    transaction.set(auditRef, auditRecord);

    return hold;
  }

  /**
   * Standalone hold release helper outside an existing transaction
   */
  static async releaseHold(
    hospitalId: string,
    requestId: string,
    caseId: string,
    actorId: string = 'system',
    actorType: 'system' | 'hospital_user' | 'ambulance_user' | 'admin_user' = 'system'
  ): Promise<ResourceHold | null> {
    return getDb().runTransaction(async (tx) => {
      return this.releaseHoldInTransaction(tx, hospitalId, requestId, caseId, actorId, actorType);
    });
  }
}

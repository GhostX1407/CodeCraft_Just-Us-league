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
    // Invariant L: Operational status and numeric capacity must not contradict
    if (requirements.icu > 0) {
      if (hospital.operational_status?.icu === false) {
        return {
          available: false,
          reason: 'ICU facility is marked operationally offline',
        };
      }
      const icuFree = Math.max(0, hospital.icu_beds_free ?? 0);
      if (icuFree < requirements.icu) {
        return {
          available: false,
          reason: `Insufficient ICU beds: required ${requirements.icu}, available ${icuFree}`,
        };
      }
    }

    if (requirements.ventilator > 0) {
      if (hospital.operational_status?.ventilator === false) {
        return {
          available: false,
          reason: 'Ventilator equipment is marked operationally offline',
        };
      }
      const ventFree = Math.max(0, hospital.ventilators_free ?? 0);
      if (ventFree < requirements.ventilator) {
        return {
          available: false,
          reason: `Insufficient ventilators: required ${requirements.ventilator}, available ${ventFree}`,
        };
      }
    }

    for (const [bloodType, count] of Object.entries(requirements.blood || {})) {
      if (count > 0 && (hospital.operational_status?.blood === false || (hospital.operational_status as any)?.blood_bank === false)) {
        return {
          available: false,
          reason: 'Blood bank is marked operationally offline',
        };
      }
      const stock = Math.max(0, (hospital.blood_stock && hospital.blood_stock[bloodType]) ?? 0);
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
   * Decrements countable resources on a hospital object.
   * Invariant A: No resource count may become negative.
   */
  static applyDecrement(hospital: Hospital, requirements: HoldResources): void {
    hospital.icu_beds_free = Math.max(0, (hospital.icu_beds_free ?? 0) - (requirements.icu || 0));
    hospital.ventilators_free = Math.max(0, (hospital.ventilators_free ?? 0) - (requirements.ventilator || 0));

    if (!hospital.blood_stock) {
      hospital.blood_stock = {};
    }
    for (const [bloodType, count] of Object.entries(requirements.blood || {})) {
      const current = hospital.blood_stock[bloodType] ?? 0;
      hospital.blood_stock[bloodType] = Math.max(0, current - (count || 0));
    }
  }

  /**
   * Restores/increments countable resources on a hospital object upon hold release.
   */
  static applyRelease(hospital: Hospital, requirements: HoldResources): void {
    hospital.icu_beds_free = Math.max(0, (hospital.icu_beds_free ?? 0) + (requirements.icu || 0));
    hospital.ventilators_free = Math.max(0, (hospital.ventilators_free ?? 0) + (requirements.ventilator || 0));

    if (!hospital.blood_stock) {
      hospital.blood_stock = {};
    }
    for (const [bloodType, count] of Object.entries(requirements.blood || {})) {
      const current = hospital.blood_stock[bloodType] ?? 0;
      hospital.blood_stock[bloodType] = Math.max(0, current + (count || 0));
    }
  }

  /**
   * Computes effective capacity taking into account unpersisted virtual holds.
   * Invariant G: Prevents double subtraction when holds are already persisted in Firestore.
   */
  static getEffectiveCapacity(
    hospital: Hospital,
    options?: { unpersistedHolds?: HoldResources }
  ): { icu: number; ventilator: number; blood: Record<string, number> } {
    const unpersisted = options?.unpersistedHolds;
    const icu = Math.max(0, (hospital.icu_beds_free ?? 0) - (unpersisted?.icu || 0));
    const ventilator = Math.max(0, (hospital.ventilators_free ?? 0) - (unpersisted?.ventilator || 0));
    const blood: Record<string, number> = {};
    for (const [bt, count] of Object.entries(hospital.blood_stock || {})) {
      blood[bt] = Math.max(0, (count ?? 0) - ((unpersisted?.blood && unpersisted.blood[bt]) || 0));
    }
    return { icu, ventilator, blood };
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

  /**
   * Consumes an active resource hold upon successful patient handoff.
   * CRITICAL: Does NOT release resources back to availability (patient is actively using them).
   */
  static async consumeHoldInTransaction(
    transaction: any,
    hospitalId: string,
    requestId: string,
    caseId: string,
    actorId: string = 'hospital_user',
    actorType: 'system' | 'hospital_user' | 'ambulance_user' | 'admin_user' = 'hospital_user'
  ): Promise<ResourceHold | null> {
    const holdRef = HoldRepository.getDocRef(hospitalId, requestId);
    const holdSnap = await transaction.get(holdRef);

    if (!holdSnap.exists) {
      return null;
    }

    const hold = holdSnap.data() as ResourceHold;
    if (hold.status === 'consumed') {
      return hold; // Idempotent: already consumed
    }

    const now = nowTimestamp();
    transaction.update(holdRef, {
      status: 'consumed',
      consumed_at: now,
    });

    hold.status = 'consumed';
    hold.consumed_at = now;

    // Record audit event
    const auditRecord = AuditLogger.buildAuditLog({
      caseId,
      hospitalId,
      requestId,
      eventType: 'RESOURCE_CONSUMED',
      actorType,
      actorId,
      metadata: { resources: hold.resources, consumed_at: now },
    });
    const auditRef = getDb().collection('audit_logs').doc(auditRecord.id);
    transaction.set(auditRef, auditRecord);

    return hold;
  }

  /**
   * Standalone hold consume helper outside an existing transaction
   */
  static async consumeHold(
    hospitalId: string,
    requestId: string,
    caseId: string,
    actorId: string = 'hospital_user',
    actorType: 'system' | 'hospital_user' | 'ambulance_user' | 'admin_user' = 'hospital_user'
  ): Promise<ResourceHold | null> {
    return getDb().runTransaction(async (tx) => {
      return this.consumeHoldInTransaction(tx, hospitalId, requestId, caseId, actorId, actorType);
    });
  }
}


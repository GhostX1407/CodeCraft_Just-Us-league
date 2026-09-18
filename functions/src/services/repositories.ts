/**
 * Firestore Repository Layer
 * 
 * Provides type-safe persistence operations for top-level collections:
 * - /hospitals
 * - /cases
 * - /requests
 * - /audit_logs
 * and subcollections:
 * - /hospitals/{hospitalId}/holds/{requestId}
 */

import { getDb } from './firebase';
import { Hospital, Case, Request, ResourceHold, AuditLog } from './types';

export const COLLECTIONS = {
  HOSPITALS: 'hospitals',
  CASES: 'cases',
  REQUESTS: 'requests',
  AUDIT_LOGS: 'audit_logs',
  HOLDS: 'holds',
} as const;

/**
 * Repository for /hospitals collection
 */
export class HospitalRepository {
  static getCollection() {
    return getDb().collection(COLLECTIONS.HOSPITALS);
  }

  static getDocRef(hospitalId: string) {
    return this.getCollection().doc(hospitalId);
  }

  static async get(hospitalId: string): Promise<Hospital | null> {
    const doc = await this.getDocRef(hospitalId).get();
    if (!doc.exists) return null;
    return doc.data() as Hospital;
  }

  static async listAll(): Promise<Hospital[]> {
    const snapshot = await this.getCollection().get();
    return snapshot.docs.map((doc) => doc.data() as Hospital);
  }

  static async create(hospital: Hospital): Promise<void> {
    await this.getDocRef(hospital.id).set(hospital);
  }

  static async update(hospitalId: string, updates: Partial<Hospital>): Promise<void> {
    await this.getDocRef(hospitalId).update(updates as any);
  }
}

/**
 * Repository for /cases collection
 */
export class CaseRepository {
  static getCollection() {
    return getDb().collection(COLLECTIONS.CASES);
  }

  static getDocRef(caseId: string) {
    return this.getCollection().doc(caseId);
  }

  static async get(caseId: string): Promise<Case | null> {
    const doc = await this.getDocRef(caseId).get();
    if (!doc.exists) return null;
    return doc.data() as Case;
  }

  static async create(caseData: Case): Promise<void> {
    await this.getDocRef(caseData.id).set(caseData);
  }

  static async update(caseId: string, updates: Partial<Case>): Promise<void> {
    await this.getDocRef(caseId).update(updates as any);
  }

  static async listByIncident(incidentGroupId: string): Promise<Case[]> {
    const snapshot = await this.getCollection()
      .where('incident_group_id', '==', incidentGroupId)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Case);
  }
}

/**
 * Repository for /requests collection
 */
export class RequestRepository {
  static getCollection() {
    return getDb().collection(COLLECTIONS.REQUESTS);
  }

  static getDocRef(requestId: string) {
    return this.getCollection().doc(requestId);
  }

  static async get(requestId: string): Promise<Request | null> {
    const doc = await this.getDocRef(requestId).get();
    if (!doc.exists) return null;
    return doc.data() as Request;
  }

  static async create(request: Request): Promise<void> {
    await this.getDocRef(request.id).set(request);
  }

  static async update(requestId: string, updates: Partial<Request>): Promise<void> {
    await this.getDocRef(requestId).update(updates as any);
  }

  static async listByCase(caseId: string): Promise<Request[]> {
    const snapshot = await this.getCollection()
      .where('case_id', '==', caseId)
      .orderBy('attempt_number', 'asc')
      .get();
    return snapshot.docs.map((doc) => doc.data() as Request);
  }

  static async listPendingByHospital(hospitalId: string): Promise<Request[]> {
    const snapshot = await this.getCollection()
      .where('hospital_id', '==', hospitalId)
      .where('status', '==', 'pending')
      .get();
    return snapshot.docs.map((doc) => doc.data() as Request);
  }

  static async getActiveRequestForCase(caseId: string): Promise<Request | null> {
    const snapshot = await this.getCollection()
      .where('case_id', '==', caseId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Request;
  }
}

/**
 * Repository for /hospitals/{hospitalId}/holds/{requestId} subcollection
 */
export class HoldRepository {
  static getCollection(hospitalId: string) {
    return getDb()
      .collection(COLLECTIONS.HOSPITALS)
      .doc(hospitalId)
      .collection(COLLECTIONS.HOLDS);
  }

  static getDocRef(hospitalId: string, requestId: string) {
    return this.getCollection(hospitalId).doc(requestId);
  }

  static async get(hospitalId: string, requestId: string): Promise<ResourceHold | null> {
    const doc = await this.getDocRef(hospitalId, requestId).get();
    if (!doc.exists) return null;
    return doc.data() as ResourceHold;
  }

  static async create(hold: ResourceHold): Promise<void> {
    await this.getDocRef(hold.hospital_id, hold.request_id).set(hold);
  }

  static async update(hospitalId: string, requestId: string, updates: Partial<ResourceHold>): Promise<void> {
    await this.getDocRef(hospitalId, requestId).update(updates as any);
  }

  static async listActiveForHospital(hospitalId: string): Promise<ResourceHold[]> {
    const snapshot = await this.getCollection(hospitalId)
      .where('status', '==', 'active')
      .get();
    return snapshot.docs.map((doc) => doc.data() as ResourceHold);
  }
}

/**
 * Repository for /audit_logs collection (append-only)
 */
export class AuditRepository {
  static getCollection() {
    return getDb().collection(COLLECTIONS.AUDIT_LOGS);
  }

  static getDocRef(auditId: string) {
    return this.getCollection().doc(auditId);
  }

  static async get(auditId: string): Promise<AuditLog | null> {
    const doc = await this.getDocRef(auditId).get();
    if (!doc.exists) return null;
    return doc.data() as AuditLog;
  }

  /**
   * Appends an immutable audit log entry
   */
  static async append(auditLog: AuditLog): Promise<void> {
    await this.getDocRef(auditLog.id).set(auditLog);
  }

  static async listByCase(caseId: string): Promise<AuditLog[]> {
    const snapshot = await this.getCollection()
      .where('case_id', '==', caseId)
      .orderBy('timestamp', 'asc')
      .get();
    return snapshot.docs.map((doc) => doc.data() as AuditLog);
  }

  static async listByHospital(hospitalId: string): Promise<AuditLog[]> {
    const snapshot = await this.getCollection()
      .where('hospital_id', '==', hospitalId)
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map((doc) => doc.data() as AuditLog);
  }

  static async listRecent(limit: number = 50): Promise<AuditLog[]> {
    const snapshot = await this.getCollection()
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as AuditLog);
  }
}

/**
 * Raahi — Multi-Role Notification Engine
 * Feature 11: Targeted role-based alerts for Ambulance, Hospital, Admin, and Family.
 */

import { getFirestore, Timestamp } from '../services/firebase';

export type RecipientRole = 'ambulance' | 'coordinator' | 'hospital' | 'admin' | 'family' | 'all';

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'urgent';

export interface AppNotification {
  id: string;
  recipientRole: RecipientRole;
  recipientId?: string; // specific hospitalId, ambulanceId, caseId, or 'all'
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  caseId?: string;
  hospitalId?: string;
  ambulanceId?: string;
  requestId?: string;
  timestamp: string;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export class NotificationRepository {
  private static collection = 'notifications';

  static async create(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): Promise<AppNotification> {
    const db = getFirestore();
    const docRef = db.collection(this.collection).doc();
    const timestamp = new Date().toISOString();

    const record: AppNotification = {
      ...notification,
      id: docRef.id,
      timestamp,
      read: false,
    };

    await docRef.set({
      ...record,
      createdAt: Timestamp.now(),
    });

    return record;
  }

  static async listForRole(
    role?: RecipientRole | 'all',
    recipientId?: string,
    limitCount: number = 50
  ): Promise<AppNotification[]> {
    const db = getFirestore();
    const snapshot = await db.collection(this.collection).get();

    const list: AppNotification[] = [];
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as AppNotification;

      // Admin or unfiltered sees everything across all roles
      if (!role || role === 'all' || role === 'admin') {
        list.push({ ...data, id: doc.id });
        return;
      }

      // Coordinator sees all cross-hospital and coordinator alerts
      if (role === 'coordinator') {
        if (data.recipientRole === 'coordinator' || data.recipientRole === 'hospital' || data.recipientRole === 'all') {
          list.push({ ...data, id: doc.id });
          return;
        }
      }

      // Hospital role filtering
      if (role === 'hospital') {
        if (data.recipientRole === 'hospital' || data.recipientRole === 'coordinator' || data.recipientRole === 'all') {
          if (
            !recipientId ||
            recipientId === 'all' ||
            !data.recipientId ||
            data.recipientId === 'all' ||
            data.recipientId === recipientId ||
            data.hospitalId === recipientId
          ) {
            list.push({ ...data, id: doc.id });
          }
        }
        return;
      }

      // Ambulance role filtering
      if (role === 'ambulance') {
        if (data.recipientRole === 'ambulance' || data.recipientRole === 'all') {
          if (
            !recipientId ||
            recipientId === 'all' ||
            !data.recipientId ||
            data.recipientId === 'all' ||
            data.recipientId === recipientId ||
            data.ambulanceId === recipientId
          ) {
            list.push({ ...data, id: doc.id });
          }
        }
        return;
      }

      // General role fallback
      if (data.recipientRole === role || data.recipientRole === 'all') {
        if (!recipientId || recipientId === 'all' || !data.recipientId || data.recipientId === 'all' || data.recipientId === recipientId) {
          list.push({ ...data, id: doc.id });
        }
      }
    });

    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limitCount);
  }

  static async markAsRead(id: string): Promise<boolean> {
    const db = getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return false;
    await docRef.update({ read: true });
    return true;
  }

  static async markAllAsRead(role: RecipientRole, recipientId?: string): Promise<number> {
    const list = await this.listForRole(role, recipientId, 100);
    const db = getFirestore();
    const batch = db.batch();
    let count = 0;
    for (const item of list) {
      if (!item.read) {
        batch.update(db.collection(this.collection).doc(item.id), { read: true });
        count++;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    return count;
  }

  static async clearAll(): Promise<number> {
    const db = getFirestore();
    const snapshot = await db.collection(this.collection).get();
    const batch = db.batch();
    let count = 0;
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  }
}


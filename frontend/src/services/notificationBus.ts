import { stateStore } from './stateStore';
import { firestore } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { AppNotification, AuditEvent } from '../types/domain';

const NOTIF_CHANNEL = 'raahi_notifications_stream';
const AUDIT_CHANNEL = 'raahi_audit_stream';

let notifBroadcast: BroadcastChannel | null = null;
let auditBroadcast: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    notifBroadcast = new BroadcastChannel(NOTIF_CHANNEL);
    auditBroadcast = new BroadcastChannel(AUDIT_CHANNEL);
  } catch {
    // Fallback for restricted environments
  }
}

// Track sent notifications to prevent echo loops
const seenNotificationIds = new Set<string>();

/**
 * Pushes a notification to the specified recipient role and recipient ID.
 * Delivers via Firestore onSnapshot, BroadcastChannel, and local reactive stateStore.
 */
export function notify(
  recipientRole: AppNotification['recipientRole'],
  recipientId: string | undefined,
  payload: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'recipientRole' | 'recipientId'>
): AppNotification {
  const id = 'notif_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  const notification: AppNotification = {
    id,
    recipientRole,
    recipientId: recipientId || 'all',
    timestamp: new Date().toISOString(),
    read: false,
    ...payload,
  };

  seenNotificationIds.add(id);

  // 1. Authoritative local store
  stateStore.addNotification(notification);

  // 2. Multi-tab push via BroadcastChannel (sub-millisecond)
  if (notifBroadcast) {
    try {
      notifBroadcast.postMessage({ type: 'NEW_NOTIFICATION', notification });
    } catch {
      // Broadcast ignored
    }
  }

  // 3. Firestore push (cross-browser / cross-device)
  if (firestore) {
    try {
      const notifRef = doc(firestore, 'notifications', id);
      setDoc(notifRef, notification).catch(() => {});
    } catch {
      // Firestore offline fallback
    }
  }

  return notification;
}

/**
 * Logs an authoritative audit event to stateStore and syncs to Firestore.
 */
export function logAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const auditEvent: AuditEvent = {
    id: 'audit_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    timestamp: Date.now(),
    ...event,
  };

  stateStore.logAudit(auditEvent);

  if (auditBroadcast) {
    try {
      auditBroadcast.postMessage({ type: 'NEW_AUDIT', auditEvent });
    } catch {
      // Ignored
    }
  }

  if (firestore) {
    try {
      const auditRef = doc(firestore, 'audit_logs', auditEvent.id);
      setDoc(auditRef, auditEvent).catch(() => {});
    } catch {
      // Firestore offline fallback
    }
  }

  return auditEvent;
}

/**
 * Real-time push subscription for role-filtered notifications.
 * Uses event-driven push (Firestore snapshot + BroadcastChannel + store subscription).
 * ZERO interval polling.
 */
export function subscribeToPushNotifications(
  role: string,
  recipientId: string | undefined,
  callback: (notifications: AppNotification[]) => void
): () => void {
  const getFiltered = () => {
    return stateStore.getNotifications(role, recipientId);
  };

  // Immediate initial delivery
  callback(getFiltered());

  // 1. Local state changes listener
  const unsubStore = stateStore.subscribe(() => {
    callback(getFiltered());
  });

  // 2. Multi-tab BroadcastChannel listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'NEW_NOTIFICATION' && event.data.notification) {
      const n: AppNotification = event.data.notification;
      if (!seenNotificationIds.has(n.id)) {
        seenNotificationIds.add(n.id);
        stateStore.addNotification(n);
      }
      callback(getFiltered());
    }
  };

  if (notifBroadcast) {
    notifBroadcast.addEventListener('message', handleBroadcast);
  }

  // 3. Firestore onSnapshot real-time push listener
  let unsubFirestore = () => {};
  if (firestore) {
    try {
      unsubFirestore = onSnapshot(
        collection(firestore, 'notifications'),
        (snapshot) => {
          let changed = false;
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data() as AppNotification;
            if (data && data.id && !seenNotificationIds.has(data.id)) {
              seenNotificationIds.add(data.id);
              stateStore.addNotification(data);
              changed = true;
            }
          });
          if (changed) {
            callback(getFiltered());
          }
        },
        () => {
          // Fallback to local channel
        }
      );
    } catch {
      // Firestore unavailable
    }
  }

  return () => {
    unsubStore();
    if (notifBroadcast) {
      notifBroadcast.removeEventListener('message', handleBroadcast);
    }
    unsubFirestore();
  };
}

/**
 * Automated state transition watcher.
 * Deactivated to prevent fake/synthetic notifications.
 * Only real notifications explicitly dispatched locally or via API are delivered.
 */
export function initAutoNotificationWatcher(): () => void {
  return () => {};
}


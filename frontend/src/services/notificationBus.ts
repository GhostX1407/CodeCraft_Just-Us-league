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

// Track previous request statuses to detect real-time state transitions
const previousRequestState: Record<string, { status: string; hospitalId: string }> = {};
let watcherInitialized = false;

/**
 * Initializes the automated state transition watcher.
 * Automatically catches any Request creation, acceptance, rejection, or timeout
 * and fires push notifications and audit events without modifying existing page code.
 */
export function initAutoNotificationWatcher(): () => void {
  if (watcherInitialized) return () => {};
  watcherInitialized = true;

  // Initialize baseline state
  const initialRequests = stateStore.getRequests();
  initialRequests.forEach((req) => {
    previousRequestState[req.id] = { status: req.status, hospitalId: req.hospital_id };
  });

  const checkTransitions = () => {
    const requests = stateStore.getRequests();
    const hospitals = stateStore.getHospitals();

    requests.forEach((req) => {
      const prev = previousRequestState[req.id];
      const hosp = hospitals.find((h) => h.id === req.hospital_id);
      const hospitalName = hosp ? hosp.name : req.hospital_id;

      if (!prev) {
        // Brand-new request created
        previousRequestState[req.id] = { status: req.status, hospitalId: req.hospital_id };

        if (req.status === 'pending') {
          notify('hospital', req.hospital_id, {
            type: 'REQUEST_PENDING',
            severity: 'critical',
            title: 'New Emergency Intake Request',
            message: `Emergency patient dispatched to your facility. Case ${req.case_id}. Review triage details.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          notify('admin', 'all', {
            type: 'REQUEST_DISPATCHED',
            severity: 'urgent',
            title: 'Ambulance Dispatch Active',
            message: `Emergency request sent to ${hospitalName} for Case ${req.case_id}.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });
        }
      } else if (prev.status !== req.status) {
        // Status transitioned!
        previousRequestState[req.id] = { status: req.status, hospitalId: req.hospital_id };

        if (req.status === 'accepted') {
          notify('ambulance', 'all', {
            type: 'REQUEST_ACCEPTED',
            severity: 'critical',
            title: 'Destination Confirmed & Locked',
            message: `${hospitalName} ACCEPTED Case ${req.case_id}. 1 ICU bed reserved. Proceed to ER bay.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          notify('admin', 'all', {
            type: 'REQUEST_ACCEPTED',
            severity: 'info',
            title: 'Emergency Request Accepted',
            message: `${hospitalName} confirmed admission for Case ${req.case_id}.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          logAudit({
            request_id: req.id,
            case_id: req.case_id,
            hospital_id: req.hospital_id,
            event_type: 'REQUEST_ACCEPTED',
            actor_type: 'hospital',
            snapshot_of_data_at_decision_time: {
              hospital_id: req.hospital_id,
              hospital_name: hospitalName,
              case_id: req.case_id,
              status: 'accepted',
            },
          });
        } else if (req.status === 'rejected') {
          const reason = req.rejection_reason || 'Capacity constraint';
          notify('ambulance', 'all', {
            type: 'REQUEST_REJECTED',
            severity: 'warning',
            title: 'Hospital Declined — Rerouting',
            message: `${hospitalName} declined admission (${reason}). Capability-match reroute triggered.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          notify('admin', 'all', {
            type: 'REQUEST_REJECTED',
            severity: 'warning',
            title: 'Emergency Request Declined',
            message: `${hospitalName} declined Case ${req.case_id} (${reason}).`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          logAudit({
            request_id: req.id,
            case_id: req.case_id,
            hospital_id: req.hospital_id,
            event_type: 'REQUEST_REJECTED',
            actor_type: 'hospital',
            snapshot_of_data_at_decision_time: {
              hospital_id: req.hospital_id,
              hospital_name: hospitalName,
              case_id: req.case_id,
              rejection_reason: reason,
              status: 'rejected',
            },
          });
        } else if (req.status === 'timed_out') {
          notify('ambulance', 'all', {
            type: 'REQUEST_TIMED_OUT',
            severity: 'warning',
            title: 'Timeout — Escalating to Next Hospital',
            message: `No response from ${hospitalName} in time. Rerouting to next ranked candidate.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          notify('admin', 'all', {
            type: 'REQUEST_TIMED_OUT',
            severity: 'warning',
            title: 'Dispatch Window Timed Out',
            message: `Request to ${hospitalName} for Case ${req.case_id} timed out without response.`,
            caseId: req.case_id,
            hospitalId: req.hospital_id,
          });

          logAudit({
            request_id: req.id,
            case_id: req.case_id,
            hospital_id: req.hospital_id,
            event_type: 'REQUEST_TIMED_OUT',
            actor_type: 'system',
            snapshot_of_data_at_decision_time: {
              hospital_id: req.hospital_id,
              case_id: req.case_id,
              status: 'timed_out',
            },
          });
        }
      }
    });
  };

  const unsub = stateStore.subscribe(checkTransitions);
  return () => {
    unsub();
    watcherInitialized = false;
  };
}

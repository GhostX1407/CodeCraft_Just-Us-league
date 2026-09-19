import {
  Hospital,
  Case,
  Request,
  AuditEvent,
  ReliabilityRow,
  CaseRouting,
  Incident,
  CaseTransitDetails,
  Ambulance,
  HospitalRegistrationRecord,
  AppNotification,
  JourneyStage,
} from '../types/domain';
import {
  SEED_HOSPITALS,
  SEED_CASES,
  SEED_ROUTINGS,
  SEED_REQUESTS,
  SEED_AUDIT_LOGS,
} from './seedData';
import { toMillis } from '../utils/time';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from './firebase';

interface StoreState {
  hospitals: Hospital[];
  cases: Record<string, Case>;
  routings: Record<string, CaseRouting>;
  requests: Record<string, Request>;
  auditLogs: AuditEvent[];
  reliability: Record<string, ReliabilityRow>;
  incidents: Record<string, Incident>;
  transits: Record<string, CaseTransitDetails>;
  ambulances: Record<string, Ambulance>;
  hospitalRegistrations: Record<string, HospitalRegistrationRecord>;
  notifications: AppNotification[];
  activeCrisis: Incident | null;
}

const STORAGE_KEY = 'raahi_store_v1';
const CHANNEL_NAME = 'raahi_broadcast_channel';

// Initialize Initial State
function getInitialState(): StoreState {
  const seedAmbulances: Record<string, Ambulance> = {
    'AMB-01': {
      id: 'AMB-01',
      vehicle_number: 'GJ-05-EM-1081',
      organization: 'Gujarat EMS Surat Central',
      ambulance_type: 'Trauma',
      capacity_patients: 1,
      current_location: { lat: 21.185, lng: 72.825 },
      facilities: ['oxygen', 'defibrillator', 'ventilator', 'stretcher'],
      contact_number: '+91 98250 11001',
      availability: 'available',
      status: 'verified',
      speed_kmh: 0,
      heading_degrees: 0,
      last_updated_at: new Date().toISOString(),
    },
    'AMB-02': {
      id: 'AMB-02',
      vehicle_number: 'GJ-05-EM-1082',
      organization: 'Gujarat EMS Adajan Post',
      ambulance_type: 'ALS',
      capacity_patients: 1,
      current_location: { lat: 21.198, lng: 72.795 },
      facilities: ['oxygen', 'ecg', 'defibrillator', 'stretcher'],
      contact_number: '+91 98250 11002',
      availability: 'available',
      status: 'verified',
      speed_kmh: 42,
      heading_degrees: 95,
      last_updated_at: new Date().toISOString(),
    },
  };

  const seedNotifications: AppNotification[] = [
    {
      id: 'notif_welcome',
      recipientRole: 'admin',
      type: 'SYSTEM_READY',
      severity: 'info',
      title: 'Raahi Emergency Coordination Grid Online',
      message: '12 Regional hospitals accredited. Real-time telemetry monitoring active.',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.hospitals) && parsed.hospitals.length > 0) {
        return {
          hospitals: parsed.hospitals,
          cases: parsed.cases && Object.keys(parsed.cases).length > 0 ? parsed.cases : { ...SEED_CASES },
          routings: parsed.routings && Object.keys(parsed.routings).length > 0 ? parsed.routings : { ...SEED_ROUTINGS },
          requests: parsed.requests && Object.keys(parsed.requests).length > 0 ? parsed.requests : { ...SEED_REQUESTS },
          auditLogs: Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0 ? parsed.auditLogs : [...SEED_AUDIT_LOGS],
          reliability: parsed.reliability || {},
          incidents: parsed.incidents || {},
          transits: parsed.transits || {},
          ambulances: parsed.ambulances || seedAmbulances,
          hospitalRegistrations: parsed.hospitalRegistrations || {},
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : seedNotifications,
          activeCrisis: parsed.activeCrisis || null,
        };
      }
    }
  } catch (e) {
    console.warn('Unable to load from storage, using seed data:', e);
  }

  const initialReliability: Record<string, ReliabilityRow> = {};
  SEED_HOSPITALS.forEach((h) => {
    initialReliability[h.id] = {
      hospital_id: h.id,
      hospital_name: h.name,
      reliability_score: h.reliability_score,
      response_metrics: {
        accepted_count: Math.round(15 + Math.random() * 15),
        successful_commitment_count: Math.round(14 + Math.random() * 14),
        average_response_seconds: Math.round(12 + Math.random() * 8),
      },
    };
  });

  return {
    hospitals: [...SEED_HOSPITALS],
    cases: { ...SEED_CASES },
    routings: { ...SEED_ROUTINGS },
    requests: { ...SEED_REQUESTS },
    auditLogs: [...SEED_AUDIT_LOGS],
    reliability: initialReliability,
    incidents: {},
    transits: {},
    ambulances: seedAmbulances,
    hospitalRegistrations: {},
    notifications: seedNotifications,
    activeCrisis: null,
  };
}

let state: StoreState = getInitialState();
const listeners = new Set<() => void>();

// Multi-tab BroadcastChannel
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data?.type === 'SYNC_STATE' && event.data.state) {
      state = event.data.state;
      notifyListeners();
    }
  };
} catch (e) {
  console.warn('BroadcastChannel not supported in this context:', e);
}

// Fallback window storage event
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      state = JSON.parse(e.newValue);
      notifyListeners();
    } catch {
      // ignore
    }
  }
});

function persistAndBroadcast(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (channel) {
      channel.postMessage({ type: 'SYNC_STATE', state });
    }
  } catch (e) {
    console.warn('State persist failed:', e);
  }
  notifyListeners();
}

function notifyListeners(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Store listener error:', e);
    }
  });
}

// 1. Live Firestore real-time listeners (when emulator or cloud Firestore is available)
if (firestore) {
  try {
    onSnapshot(
      collection(firestore, 'requests'),
      (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as any;
          if (data && data.id) {
            const normalizedReq: Request = {
              id: data.id,
              case_id: data.case_id,
              hospital_id: data.hospital_id,
              status: data.status || 'pending',
              sent_at: toMillis(data.sent_at),
              expires_at: toMillis(data.expires_at),
              responded_at: data.responded_at ? toMillis(data.responded_at) : null,
              attempt_number: data.attempt_number || 1,
              match_score_breakdown: data.match_score_breakdown || {
                capability_match_pct: 100,
                distance_km: 2.5,
                distance_factor: 1,
                load_factor: 1,
                staleness_factor: 1,
                final_score: 100,
              },
              reason_shown_to_dispatcher: data.reason_shown_to_dispatcher || '',
              rejection_reason: data.rejection_reason || data.reason,
            };
            state.requests[normalizedReq.id] = normalizedReq;

            if (normalizedReq.case_id) {
              const currentRouting = state.routings[normalizedReq.case_id] || {
                status: normalizedReq.status === 'accepted' ? 'accepted' : 'pending',
                active_request_id: normalizedReq.id,
                attempt_number: normalizedReq.attempt_number,
                accepted_hospital_id: normalizedReq.status === 'accepted' ? normalizedReq.hospital_id : null,
              };
              if (normalizedReq.status === 'accepted') {
                currentRouting.status = 'accepted';
                currentRouting.accepted_hospital_id = normalizedReq.hospital_id;
              } else if (normalizedReq.status === 'rejected' && currentRouting.active_request_id === normalizedReq.id) {
                currentRouting.status = 'rerouting';
              }
              state.routings[normalizedReq.case_id] = currentRouting;
            }
            changed = true;
          }
        });
        if (changed) {
          persistAndBroadcast();
        }
      },
      (err) => {
        console.warn('[Raahi Realtime] Requests onSnapshot fallback to local bus:', err.message);
      }
    );

    onSnapshot(
      collection(firestore, 'cases'),
      (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as any;
          if (data && data.id) {
            state.cases[data.id] = {
              ...data,
              created_at: toMillis(data.created_at),
            };
            changed = true;
          }
        });
        if (changed) {
          persistAndBroadcast();
        }
      },
      () => {}
    );

    onSnapshot(
      collection(firestore, 'hospitals'),
      (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as any;
          if (data && data.id) {
            const idx = state.hospitals.findIndex((h) => h.id === data.id);
            if (idx !== -1) {
              state.hospitals[idx] = {
                ...state.hospitals[idx],
                ...data,
                last_updated_at: toMillis(data.last_updated_at),
              };
              changed = true;
            }
          }
        });
        if (changed) {
          persistAndBroadcast();
        }
      },
      () => {}
    );
  } catch (e) {
    console.warn('[Raahi Realtime] Firestore listeners unavailable:', e);
  }
}

// 2. Background Backend API Sync (every 1.5s, keeps cross-browser tabs in sync with backend state)
if (typeof window !== 'undefined') {
  const API_URL =
    (import.meta as any).env?.VITE_API_BASE_URL ||
    'http://localhost:5001/rahi-healthtech/us-central1/api';

  setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/requests`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.requests) && json.requests.length > 0) {
          let updated = false;
          json.requests.forEach((req: any) => {
            const existing = state.requests[req.id];
            if (
              !existing ||
              existing.status !== req.status ||
              toMillis(existing.expires_at) !== toMillis(req.expires_at)
            ) {
              state.requests[req.id] = {
                ...req,
                sent_at: toMillis(req.sent_at),
                expires_at: toMillis(req.expires_at),
                responded_at: req.responded_at ? toMillis(req.responded_at) : null,
              };
              if (req.status === 'accepted' && req.case_id) {
                state.routings[req.case_id] = {
                  status: 'accepted',
                  active_request_id: req.id,
                  attempt_number: req.attempt_number || 1,
                  accepted_hospital_id: req.hospital_id,
                };
              }
              updated = true;
            }
          });
          if (updated) {
            persistAndBroadcast();
          }
        }
      }
    } catch {
      // Backend offline or unreachable, local broadcast channel continues
    }
  }, 1500);
}

// Global Store Accessors & Subscriptions
export const stateStore = {
  getState(): StoreState {
    return state;
  },

  resetToSeed(): void {
    localStorage.removeItem(STORAGE_KEY);
    state = getInitialState();
    persistAndBroadcast();
  },

  subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  getHospital(id: string): Hospital | undefined {
    return state.hospitals.find(
      (h) =>
        h.id === id ||
        ((id === 'hosp_apex' || id.startsWith('hosp_apex')) && (h.id === 'hospital_001' || h.id === 'hosp_apex'))
    );
  },

  getHospitals(): Hospital[] {
    return state.hospitals;
  },

  setHospitals(hospitals: Hospital[]): void {
    if (Array.isArray(hospitals) && hospitals.length > 0) {
      state.hospitals = hospitals;
      persistAndBroadcast();
    }
  },

  updateHospital(id: string, patch: Partial<Hospital>): Hospital {
    const resolvedId =
      id === 'hosp_apex' || id.startsWith('hosp_apex')
        ? (state.hospitals.some((h) => h.id === 'hospital_001') ? 'hospital_001' : 'hosp_apex')
        : id;
    const idx = state.hospitals.findIndex((h) => h.id === resolvedId);
    if (idx === -1) throw new Error(`Hospital not found: ${id}`);
    
    const updated: Hospital = {
      ...state.hospitals[idx],
      ...patch,
      last_updated_at: Date.now(),
    };
    state.hospitals[idx] = updated;

    stateStore.logAudit({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      case_id: '',
      request_id: null,
      hospital_id: id,
      event_type: 'CAPABILITY_UPDATED',
      timestamp: Date.now(),
      actor_type: 'hospital',
      snapshot_of_data_at_decision_time: { ...updated },
    });

    persistAndBroadcast();
    return updated;
  },

  getCase(id: string): Case | undefined {
    return state.cases[id];
  },

  setCase(c: Case, routing: CaseRouting): void {
    state.cases[c.id] = c;
    state.routings[c.id] = routing;
    persistAndBroadcast();
  },

  getRouting(caseId: string): CaseRouting | undefined {
    return state.routings[caseId];
  },

  setRouting(caseId: string, routing: CaseRouting): void {
    state.routings[caseId] = routing;
    persistAndBroadcast();
  },

  getRequest(id: string): Request | undefined {
    return state.requests[id];
  },

  getRequests(): Request[] {
    return Object.values(state.requests || {});
  },

  setRequest(r: Request): void {
    state.requests[r.id] = r;
    persistAndBroadcast();
  },

  getRequestsByCase(caseId: string): Request[] {
    return Object.values(state.requests)
      .filter((r) => r.case_id === caseId)
      .sort((a, b) => toMillis(a.sent_at) - toMillis(b.sent_at));
  },

  getPendingRequestsForHospital(hospitalId: string): Request[] {
    return Object.values(state.requests)
      .filter((r) => r.hospital_id === hospitalId && r.status === 'pending')
      .sort((a, b) => toMillis(a.expires_at) - toMillis(b.expires_at));
  },

  getAllPendingRequests(): Request[] {
    return Object.values(state.requests)
      .filter((r) => r.status === 'pending')
      .sort((a, b) => toMillis(a.expires_at) - toMillis(b.expires_at));
  },

  getAllRequests(): Request[] {
    return Object.values(state.requests || {}).sort((a, b) => toMillis(b.sent_at) - toMillis(a.sent_at));
  },

  logAudit(event: AuditEvent): void {
    state.auditLogs = [event, ...state.auditLogs].slice(0, 100);
    persistAndBroadcast();
  },

  getAuditLogs(): AuditEvent[] {
    return state.auditLogs;
  },

  getReliability(): ReliabilityRow[] {
    return Object.values(state.reliability);
  },

  updateReliability(hospitalId: string, accepted: boolean, responseSeconds: number): void {
    const row = state.reliability[hospitalId];
    if (!row) return;

    const total = row.response_metrics.accepted_count + 1;
    const honoured = accepted
      ? row.response_metrics.successful_commitment_count + 1
      : row.response_metrics.successful_commitment_count;

    const newScore = Math.round((honoured / total) * 100) / 100;
    const newAvgTime = Math.round(
      (row.response_metrics.average_response_seconds * row.response_metrics.accepted_count + responseSeconds) /
        total
    );

    state.reliability[hospitalId] = {
      ...row,
      reliability_score: newScore,
      response_metrics: {
        accepted_count: total,
        successful_commitment_count: honoured,
        average_response_seconds: newAvgTime,
      },
    };

    // Update hospital's own reliability property
    const hosp = state.hospitals.find((h) => h.id === hospitalId);
    if (hosp) {
      hosp.reliability_score = newScore;
    }

    persistAndBroadcast();
  },

  // Incidents & Crisis Mode
  getIncidents(): Incident[] {
    return Object.values(state.incidents || {});
  },

  getIncident(id: string): Incident | undefined {
    return state.incidents?.[id];
  },

  setIncident(incident: Incident): void {
    if (!state.incidents) state.incidents = {};
    state.incidents[incident.id] = incident;
    if (incident.status === 'active') {
      state.activeCrisis = incident;
    }
    persistAndBroadcast();
  },

  getActiveCrisis(): Incident | null {
    return state.activeCrisis;
  },

  setActiveCrisis(crisis: Incident | null): void {
    state.activeCrisis = crisis;
    if (crisis) {
      if (!state.incidents) state.incidents = {};
      state.incidents[crisis.id] = crisis;
    }
    persistAndBroadcast();
  },

  // Ambulances
  getAmbulances(): Ambulance[] {
    return Object.values(state.ambulances || {});
  },

  getAmbulance(id: string): Ambulance | undefined {
    return state.ambulances?.[id];
  },

  setAmbulance(ambulance: Ambulance): void {
    if (!state.ambulances) state.ambulances = {};
    state.ambulances[ambulance.id] = ambulance;
    persistAndBroadcast();
  },

  // Hospital Registrations
  getHospitalRegistrations(): HospitalRegistrationRecord[] {
    return Object.values(state.hospitalRegistrations || {});
  },

  setHospitalRegistration(reg: HospitalRegistrationRecord): void {
    if (!state.hospitalRegistrations) state.hospitalRegistrations = {};
    state.hospitalRegistrations[reg.id] = reg;
    persistAndBroadcast();
  },

  // Case Transit & Journey Timeline
  getTransit(caseId: string): CaseTransitDetails | undefined {
    return state.transits?.[caseId];
  },

  setTransit(transit: CaseTransitDetails): void {
    if (!state.transits) state.transits = {};
    state.transits[transit.case_id] = transit;
    persistAndBroadcast();
  },

  advanceJourneyStage(caseId: string, stage: JourneyStage, actor: string = 'emt_paramedic', details?: string): CaseTransitDetails {
    if (!state.transits) state.transits = {};
    let transit = state.transits[caseId];
    const now = new Date().toISOString();

    if (!transit) {
      transit = {
        case_id: caseId,
        journey_stage: stage,
        journey_history: [
          { stage: 'CASE_CREATED', label: 'Emergency Intake Created', timestamp: now, completed: true, actor },
          { stage, label: stage.replace('_', ' '), timestamp: now, completed: true, actor, details },
        ],
        current_transit_status: 'stable',
        vitals_timeline: [],
        last_updated_at: now,
      };
    } else {
      transit = {
        ...transit,
        journey_stage: stage,
        journey_history: [
          ...transit.journey_history,
          { stage, label: stage.replace('_', ' '), timestamp: now, completed: true, actor, details },
        ],
        last_updated_at: now,
      };
    }

    state.transits[caseId] = transit;
    persistAndBroadcast();
    return transit;
  },

  // Role Notifications
  getNotifications(role?: string, recipientId?: string): AppNotification[] {
    let list = state.notifications || [];
    if (role) {
      list = list.filter((n) => n.recipientRole === role || n.recipientRole === 'admin');
    }
    if (recipientId && recipientId !== 'all') {
      list = list.filter((n) => !n.recipientId || n.recipientId === 'all' || n.recipientId === recipientId);
    }
    return list;
  },

  addNotification(notif: AppNotification): void {
    if (!state.notifications) state.notifications = [];
    state.notifications = [notif, ...state.notifications].slice(0, 100);
    persistAndBroadcast();
  },

  markNotificationRead(id: string): void {
    if (!state.notifications) return;
    const n = state.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      persistAndBroadcast();
    }
  },
};

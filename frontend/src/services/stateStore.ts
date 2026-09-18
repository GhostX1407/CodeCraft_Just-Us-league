import {
  Hospital,
  Case,
  Request,
  AuditEvent,
  ReliabilityRow,
  CaseRouting,
} from '../types/domain';
import { SEED_HOSPITALS } from './seedData';
import { toMillis } from '../utils/time';

interface StoreState {
  hospitals: Hospital[];
  cases: Record<string, Case>;
  routings: Record<string, CaseRouting>;
  requests: Record<string, Request>;
  auditLogs: AuditEvent[];
  reliability: Record<string, ReliabilityRow>;
}

const STORAGE_KEY = 'raahi_store_v1';
const CHANNEL_NAME = 'raahi_broadcast_channel';

// Initialize Initial State
function getInitialState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.hospitals) && parsed.hospitals.length > 0) {
        return parsed;
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
    cases: {},
    routings: {},
    requests: {},
    auditLogs: [],
    reliability: initialReliability,
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
    return state.hospitals.find((h) => h.id === id);
  },

  getHospitals(): Hospital[] {
    return state.hospitals;
  },

  updateHospital(id: string, patch: Partial<Hospital>): Hospital {
    const idx = state.hospitals.findIndex((h) => h.id === id);
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
};

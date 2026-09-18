import { useState, useEffect } from 'react';
import {
  Case,
  CaseRouting,
  Request,
  Hospital,
  AuditEvent,
  ReliabilityRow,
} from '../types/domain';
import { stateStore } from '../services/stateStore';
import { api } from '../services/api';
import { toMillis } from '../utils/time';

export type SubStatus = 'connecting' | 'live' | 'reconnecting' | 'error';

export interface SubResult<T> {
  data: T;
  status: SubStatus;
  error: Error | null;
}

// Background Timeout Checker: checks pending requests every 1s
let timeoutCheckerStarted = false;
function ensureTimeoutChecker() {
  if (timeoutCheckerStarted || typeof window === 'undefined') return;
  timeoutCheckerStarted = true;

  setInterval(() => {
    const pending = stateStore.getAllPendingRequests();
    const now = Date.now();
    pending.forEach((req) => {
      if (toMillis(req.expires_at) < now) {
        // Backend simulator triggers timeout
        api.timeoutRequest(req.id).catch((e) => console.warn('Timeout execution:', e));
      }
    });
  }, 1000);
}

// Case + Routing Hook
export function useCase(caseId: string | null | undefined): SubResult<{ case: Case | null; routing: CaseRouting | null }> {
  ensureTimeoutChecker();
  const [data, setData] = useState<{ case: Case | null; routing: CaseRouting | null }>({
    case: caseId ? stateStore.getCase(caseId) || null : null,
    routing: caseId ? stateStore.getRouting(caseId) || null : null,
  });

  useEffect(() => {
    if (!caseId) {
      setData({ case: null, routing: null });
      return;
    }

    const update = () => {
      setData({
        case: stateStore.getCase(caseId) || null,
        routing: stateStore.getRouting(caseId) || null,
      });
    };

    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, [caseId]);

  return { data, status: 'live', error: null };
}

// Case Requests Hook
export function useCaseRequests(caseId: string | null | undefined): SubResult<Request[]> {
  ensureTimeoutChecker();
  const [data, setData] = useState<Request[]>(() =>
    caseId ? stateStore.getRequestsByCase(caseId) : []
  );

  useEffect(() => {
    if (!caseId) {
      setData([]);
      return;
    }

    const update = () => {
      setData(stateStore.getRequestsByCase(caseId));
    };

    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, [caseId]);

  return { data, status: 'live', error: null };
}

// Hospital Queue Hook (pending requests for a specific hospital)
export function useHospitalQueue(hospitalId: string | null | undefined): SubResult<Request[]> {
  ensureTimeoutChecker();
  const [data, setData] = useState<Request[]>(() =>
    hospitalId ? stateStore.getPendingRequestsForHospital(hospitalId) : []
  );

  useEffect(() => {
    if (!hospitalId) {
      setData([]);
      return;
    }

    const update = () => {
      setData(stateStore.getPendingRequestsForHospital(hospitalId));
    };

    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, [hospitalId]);

  return { data, status: 'live', error: null };
}

// Single Hospital Hook
export function useHospital(hospitalId: string | null | undefined): SubResult<Hospital | null> {
  const [data, setData] = useState<Hospital | null>(() =>
    hospitalId ? stateStore.getHospital(hospitalId) || null : null
  );

  useEffect(() => {
    if (!hospitalId) {
      setData(null);
      return;
    }

    const update = () => {
      setData(stateStore.getHospital(hospitalId) || null);
    };

    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, [hospitalId]);

  return { data, status: 'live', error: null };
}

// All Hospitals Hook
export function useHospitals(): SubResult<Hospital[]> {
  const [data, setData] = useState<Hospital[]>(() => stateStore.getHospitals());

  useEffect(() => {
    const update = () => {
      setData([...stateStore.getHospitals()]);
    };
    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, []);

  return { data, status: 'live', error: null };
}

// All Active Pending Requests across system
export function useActiveRequests(): SubResult<Request[]> {
  ensureTimeoutChecker();
  const [data, setData] = useState<Request[]>(() => stateStore.getAllPendingRequests());

  useEffect(() => {
    const update = () => {
      setData(stateStore.getAllPendingRequests());
    };
    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, []);

  return { data, status: 'live', error: null };
}

// Audit Log Hook
export function useAuditLog(): SubResult<AuditEvent[]> {
  const [data, setData] = useState<AuditEvent[]>(() => stateStore.getAuditLogs());

  useEffect(() => {
    const update = () => {
      setData([...stateStore.getAuditLogs()]);
    };
    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, []);

  return { data, status: 'live', error: null };
}

// Reliability Table Hook
export function useReliability(): SubResult<ReliabilityRow[]> {
  const [data, setData] = useState<ReliabilityRow[]>(() => stateStore.getReliability());

  useEffect(() => {
    const update = () => {
      setData([...stateStore.getReliability()]);
    };
    update();
    const unsub = stateStore.subscribe(update);
    return unsub;
  }, []);

  return { data, status: 'live', error: null };
}

// Connection State Hook (online / reconnecting)
export function useConnectionState(): { status: SubStatus } {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { status: online ? 'live' : 'reconnecting' };
}

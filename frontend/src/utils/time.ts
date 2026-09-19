import { Freshness, Timestamp } from '../types/domain';

export function toMillis(ts: Timestamp | string | Date | any | null | undefined): number {
  if (!ts) return Date.now();
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? Date.now() : parsed;
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toDate === 'function') {
    return ts.toDate().getTime();
  }
  if ('seconds' in ts) {
    return ts.seconds * 1000 + (ts.nanoseconds ? Math.floor(ts.nanoseconds / 1000000) : 0);
  }
  if ('_seconds' in ts) {
    return ts._seconds * 1000 + (ts._nanoseconds ? Math.floor(ts._nanoseconds / 1000000) : 0);
  }
  return Date.now();
}

export function formatMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function timeAgo(ts: Timestamp): string {
  const diffMs = Math.max(0, Date.now() - toMillis(ts));
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 45) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${Math.floor(diffHr / 24)} d ago`;
}

export function getFreshness(lastUpdatedAt: Timestamp): { status: Freshness; factor: number; minutes: number } {
  const diffMs = Math.max(0, Date.now() - toMillis(lastUpdatedAt));
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes <= 10) {
    return { status: 'fresh', factor: 1.0, minutes };
  } else if (minutes <= 30) {
    return { status: 'stale', factor: 0.85, minutes };
  } else {
    return { status: 'unknown', factor: 0.7, minutes };
  }
}

export function formatIsoTime(ts: Timestamp): string {
  return new Date(toMillis(ts)).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

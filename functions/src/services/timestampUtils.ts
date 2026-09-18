/**
 * Server Timestamp & Freshness Utility Helpers
 * 
 * Handles normalization, comparison, deadline checks, and freshness classification
 * per docs/spec.md and docs/data-model.md.
 */

import { Timestamp } from './firebase';

export type FreshnessClassification = 'fresh' | 'stale' | 'unknown';

/**
 * Standard request timeout in seconds (spec.md §13.1)
 */
export const REQUEST_TIMEOUT_SECONDS = 30;

/**
 * Converts a Timestamp, Date, or string into a Firestore Timestamp
 */
export function toTimestamp(
  value: FirebaseFirestore.Timestamp | Date | string | number | undefined | null
): FirebaseFirestore.Timestamp {
  if (value === undefined || value === null) {
    return Timestamp.now();
  }
  if (value instanceof Timestamp) {
    return value;
  }
  if (typeof (value as any).toDate === 'function') {
    return value as any as FirebaseFirestore.Timestamp;
  }
  if (typeof value === 'number') {
    return Timestamp.fromMillis(value);
  }
  if (typeof value === 'object' && value !== null) {
    const seconds = (value as any)._seconds ?? (value as any).seconds;
    const nanoseconds = (value as any)._nanoseconds ?? (value as any).nanoseconds ?? 0;
    if (typeof seconds === 'number') {
      return new Timestamp(seconds, nanoseconds);
    }
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return Timestamp.fromDate(d);
    }
  }
  return Timestamp.now();
}

/**
 * Converts a Timestamp, Date, string, or number into a JavaScript Date
 */
export function toDate(
  value: FirebaseFirestore.Timestamp | Date | string | number | undefined | null
): Date {
  if (value === undefined || value === null) {
    return new Date();
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof (value as any).toDate === 'function') {
    return (value as FirebaseFirestore.Timestamp).toDate();
  }
  if (typeof value === 'object' && value !== null) {
    const seconds = (value as any)._seconds ?? (value as any).seconds;
    const nanoseconds = (value as any)._nanoseconds ?? (value as any).nanoseconds ?? 0;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + nanoseconds / 1000000);
    }
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return new Date();
}

/**
 * Returns current server Firestore Timestamp
 */
export function nowTimestamp(): FirebaseFirestore.Timestamp {
  return Timestamp.now();
}

/**
 * Calculates deadline Timestamp from a start timestamp and duration
 */
export function calculateExpirationTimestamp(
  sentAt: FirebaseFirestore.Timestamp | Date | string | number,
  timeoutSeconds: number = REQUEST_TIMEOUT_SECONDS
): FirebaseFirestore.Timestamp {
  const startDate = toDate(sentAt);
  const expiryDate = new Date(startDate.getTime() + timeoutSeconds * 1000);
  return Timestamp.fromDate(expiryDate);
}

/**
 * Evaluates whether a request has expired given the authoritative server time
 */
export function isRequestExpired(
  expiresAt: FirebaseFirestore.Timestamp | Date | string | number,
  serverTime: FirebaseFirestore.Timestamp | Date | string | number = nowTimestamp()
): boolean {
  const expiry = toDate(expiresAt).getTime();
  const current = toDate(serverTime).getTime();
  return current >= expiry;
}

/**
 * Calculates elapsed minutes from an update timestamp to current time
 */
export function calculateElapsedMinutes(
  timestamp: FirebaseFirestore.Timestamp | Date | string | number,
  now: FirebaseFirestore.Timestamp | Date | string | number = nowTimestamp()
): number {
  const pastMs = toDate(timestamp).getTime();
  const nowMs = toDate(now).getTime();
  const diffMs = Math.max(0, nowMs - pastMs);
  return diffMs / (1000 * 60);
}

/**
 * Classifies data freshness according to docs/spec.md §72 & docs/team-tech-stack-and-work-distribution.md §9:
 * - FRESH: age <= 10 minutes (factor = 1.0)
 * - STALE: 10 < age <= 30 minutes (factor = 0.85)
 * - UNKNOWN: age > 30 minutes (factor = 0.70)
 */
export function classifyFreshness(
  lastUpdatedAt: FirebaseFirestore.Timestamp | Date | string | number,
  now: FirebaseFirestore.Timestamp | Date | string | number = nowTimestamp()
): FreshnessClassification {
  const elapsedMinutes = calculateElapsedMinutes(lastUpdatedAt, now);

  if (elapsedMinutes <= 10) {
    return 'fresh';
  } else if (elapsedMinutes <= 30) {
    return 'stale';
  } else {
    return 'unknown';
  }
}

/**
 * Returns freshness scoring factor according to docs/spec.md §73:
 * - fresh: 1.00
 * - stale: 0.85
 * - unknown: 0.70
 */
export function getFreshnessFactor(classification: FreshnessClassification): number {
  switch (classification) {
    case 'fresh':
      return 1.0;
    case 'stale':
      return 0.85;
    case 'unknown':
      return 0.7;
  }
}

/**
 * Normalizes any timestamp representation into a clean ISO-8601 string.
 */
export function toISOString(
  value: FirebaseFirestore.Timestamp | Date | string | number | undefined | null
): string {
  return toDate(value).toISOString();
}


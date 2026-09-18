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
export function toTimestamp(value: FirebaseFirestore.Timestamp | Date | string | undefined | null): FirebaseFirestore.Timestamp {
  if (!value) {
    return Timestamp.now();
  }
  if (value instanceof Timestamp) {
    return value;
  }
  if (typeof (value as any).toDate === 'function') {
    return value as any as FirebaseFirestore.Timestamp;
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
 * Converts a Timestamp, Date, or string into a JavaScript Date
 */
export function toDate(value: FirebaseFirestore.Timestamp | Date | string | undefined | null): Date {
  if (!value) {
    return new Date();
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
  sentAt: FirebaseFirestore.Timestamp | Date | string,
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
  expiresAt: FirebaseFirestore.Timestamp | Date | string,
  serverTime: FirebaseFirestore.Timestamp | Date | string = nowTimestamp()
): boolean {
  const expiry = toDate(expiresAt).getTime();
  const current = toDate(serverTime).getTime();
  return current >= expiry;
}

/**
 * Calculates elapsed minutes from an update timestamp to current time
 */
export function calculateElapsedMinutes(
  timestamp: FirebaseFirestore.Timestamp | Date | string,
  now: FirebaseFirestore.Timestamp | Date | string = nowTimestamp()
): number {
  const pastMs = toDate(timestamp).getTime();
  const nowMs = toDate(now).getTime();
  const diffMs = Math.max(0, nowMs - pastMs);
  return diffMs / (1000 * 60);
}

/**
 * Classifies data freshness according to docs/spec.md §72 & docs/team-tech-stack-and-work-distribution.md §9:
 * - <= 10 min      -> fresh
 * - > 10–30 min   -> stale
 * - > 30 min      -> unknown
 */
export function classifyFreshness(
  lastUpdatedAt: FirebaseFirestore.Timestamp | Date | string,
  now: FirebaseFirestore.Timestamp | Date | string = nowTimestamp()
): FreshnessClassification {
  const minutes = calculateElapsedMinutes(lastUpdatedAt, now);
  if (minutes <= 10) {
    return 'fresh';
  }
  if (minutes <= 30) {
    return 'stale';
  }
  return 'unknown';
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

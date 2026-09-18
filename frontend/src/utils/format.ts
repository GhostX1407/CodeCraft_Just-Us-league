import { CaseCategory, Severity, RequestStatus } from '../types/domain';

export function formatScore(score: number): string {
  return (Math.round(score * 10) / 10).toFixed(1);
}

export function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

export const CATEGORY_LABELS: Record<CaseCategory, { label: string; sub: string }> = {
  cardiac: {
    label: 'Cardiac Emergency',
    sub: 'Requires: Cardiologist on shift, ECG, ICU bed',
  },
  trauma: {
    label: 'Major Trauma',
    sub: 'Requires: Trauma team on shift, ICU bed, Blood O-',
  },
  obstetric: {
    label: 'Obstetric Emergency',
    sub: 'Requires: OB/GYN on call, Maternity unit',
  },
  pediatric: {
    label: 'Pediatric Critical',
    sub: 'Requires: Pediatrician on call, Pediatric emergency',
  },
};

export const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string }> = {
  red: {
    label: 'Priority 1 (Red)',
    bg: 'bg-severity-red/10',
    text: 'text-severity-red',
    border: 'border-severity-red/40',
  },
  yellow: {
    label: 'Priority 2 (Yellow)',
    bg: 'bg-severity-yellow/10',
    text: 'text-severity-yellow',
    border: 'border-severity-yellow/40',
  },
  green: {
    label: 'Priority 3 (Green)',
    bg: 'bg-severity-green/10',
    text: 'text-severity-green',
    border: 'border-severity-green/40',
  },
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'In Flight',
  accepted: 'Committed',
  rejected: 'Declined',
  timed_out: 'Timed Out',
  superseded: 'Superseded',
};

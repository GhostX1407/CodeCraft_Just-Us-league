/**
 * RAAHI — NEED PROFILE RULES & GENERATOR
 *
 * Deterministic mapping from emergency triage category & severity to structured need profiles.
 * Grounded in docs/spec.md (Sections 18, 19, 20) and docs/data-model.md (Section 11).
 *
 * NOTE: These are prototype rules for demonstration and decision support;
 * they are not clinical medical standards.
 */

import { EmergencyCategory, NeedProfile, SeverityLevel } from '../types';

export const VALID_CATEGORIES: readonly EmergencyCategory[] = [
  'cardiac',
  'trauma',
  'obstetric',
  'pediatric',
] as const;

export const VALID_SEVERITIES: readonly SeverityLevel[] = [
  'red',
  'yellow',
  'green',
] as const;

export const PROTOTYPE_NEED_RULES: Record<string, NeedProfile> = {
  cardiac: {
    specialists_needed: ['cardiologist'],
    capability_flags: ['ecg', 'icu'],
    blood_type_needed: null,
  },
  trauma: {
    specialists_needed: [],
    capability_flags: ['trauma_team', 'icu'],
    blood_type_needed: 'O-',
  },
  obstetric: {
    specialists_needed: ['obgyn'],
    capability_flags: ['maternity'],
    blood_type_needed: null,
  },
  pediatric: {
    specialists_needed: ['pediatrician'],
    capability_flags: ['pediatric_emergency'],
    blood_type_needed: null,
  },
};

/**
 * Validates whether a category string is among the approved prototype categories.
 */
export function isValidCategory(category: string): category is EmergencyCategory {
  return VALID_CATEGORIES.includes(category.toLowerCase().trim() as EmergencyCategory);
}

/**
 * Validates whether a severity level string is among the approved prototype severity tags.
 */
export function isValidSeverity(severity: string): severity is SeverityLevel {
  return VALID_SEVERITIES.includes(severity.toLowerCase().trim() as SeverityLevel);
}

/**
 * Deterministically generates a clinical need profile based on emergency category and severity.
 * Handles invalid, unknown, or empty categories safely without runtime errors.
 *
 * @param category Emergency case category (e.g. 'cardiac', 'trauma', 'obstetric', 'pediatric')
 * @param _severity Severity tag ('red', 'yellow', 'green') - preserved for future tuning
 * @returns Structured NeedProfile
 */
export function generateNeedProfile(
  category: string,
  _severity?: SeverityLevel | string
): NeedProfile {
  const normalizedCategory = (category || '').toLowerCase().trim();

  if (PROTOTYPE_NEED_RULES[normalizedCategory]) {
    const rule = PROTOTYPE_NEED_RULES[normalizedCategory];
    return {
      specialists_needed: [...rule.specialists_needed],
      capability_flags: [...rule.capability_flags],
      blood_type_needed: rule.blood_type_needed,
    };
  }

  // Safe deterministic fallback for unrecognized categories
  return {
    specialists_needed: [],
    capability_flags: [],
    blood_type_needed: null,
  };
}

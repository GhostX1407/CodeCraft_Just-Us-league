import { describe, expect, it } from 'vitest';
import {
  generateNeedProfile,
  isValidCategory,
  isValidSeverity,
  PROTOTYPE_NEED_RULES,
  VALID_CATEGORIES,
  VALID_SEVERITIES,
} from '../src/domain/needProfile';

describe('Need Profile Rules (Domain)', () => {
  it('validates approved prototype categories', () => {
    for (const cat of VALID_CATEGORIES) {
      expect(isValidCategory(cat)).toBe(true);
      expect(isValidCategory(cat.toUpperCase())).toBe(true);
    }
    expect(isValidCategory('unknown_condition')).toBe(false);
    expect(isValidCategory('')).toBe(false);
  });

  it('validates approved severity levels', () => {
    for (const sev of VALID_SEVERITIES) {
      expect(isValidSeverity(sev)).toBe(true);
      expect(isValidSeverity(sev.toUpperCase())).toBe(true);
    }
    expect(isValidSeverity('critical')).toBe(false);
    expect(isValidSeverity('')).toBe(false);
  });

  it('generates correct cardiac need profile (spec.md Section 19)', () => {
    const profile = generateNeedProfile('cardiac', 'red');
    expect(profile.specialists_needed).toEqual(['cardiologist']);
    expect(profile.capability_flags).toEqual(['ecg', 'icu']);
    expect(profile.blood_type_needed).toBeNull();
  });

  it('generates correct trauma need profile (spec.md Section 19)', () => {
    const profile = generateNeedProfile('trauma', 'red');
    expect(profile.specialists_needed).toEqual([]);
    expect(profile.capability_flags).toEqual(['trauma_team', 'icu']);
    expect(profile.blood_type_needed).toBe('O-');
  });

  it('generates correct obstetric need profile (spec.md Section 19)', () => {
    const profile = generateNeedProfile('obstetric', 'yellow');
    expect(profile.specialists_needed).toEqual(['obgyn']);
    expect(profile.capability_flags).toEqual(['maternity']);
    expect(profile.blood_type_needed).toBeNull();
  });

  it('generates correct pediatric need profile (spec.md Section 19)', () => {
    const profile = generateNeedProfile('pediatric', 'green');
    expect(profile.specialists_needed).toEqual(['pediatrician']);
    expect(profile.capability_flags).toEqual(['pediatric_emergency']);
    expect(profile.blood_type_needed).toBeNull();
  });

  it('handles unrecognized categories with safe deterministic fallback', () => {
    const profile = generateNeedProfile('infectious_disease', 'yellow');
    expect(profile).toEqual({
      specialists_needed: [],
      capability_flags: [],
      blood_type_needed: null,
    });
  });

  it('handles empty or whitespace category strings safely', () => {
    const profile = generateNeedProfile('   ', 'red');
    expect(profile).toEqual({
      specialists_needed: [],
      capability_flags: [],
      blood_type_needed: null,
    });
  });

  it('returns deep copies so modifying result does not corrupt prototype rules', () => {
    const profile = generateNeedProfile('cardiac');
    profile.specialists_needed.push('neurologist');
    expect(PROTOTYPE_NEED_RULES.cardiac.specialists_needed).toEqual(['cardiologist']);
  });
});

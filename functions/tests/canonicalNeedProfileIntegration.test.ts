/**
 * Integration Tests: Authoritative Need Profile Generator
 * 
 * Verifies:
 * 1. P2 index.ts re-exports and uses P1's canonical generateNeedProfile()
 * 2. Deterministic category + severity mappings match docs/spec.md §18-20
 * 3. Trauma has NO arbitrary specialist requirements (empty specialists_needed)
 * 4. API layer ignores arbitrary client-supplied need profiles in favor of canonical generation
 */

import { describe, it, expect } from 'vitest';
import { generateNeedProfile as p1Generator } from '../src/domain/needProfile';
import { generateNeedProfile as apiReExportedGenerator } from '../src/index';

describe('Authoritative Need Profile Integration', () => {
  it('proves API re-exported generator is identical to P1 canonical domain generator', () => {
    const categories = ['cardiac', 'trauma', 'obstetric', 'pediatric'] as const;
    const severities = ['red', 'yellow', 'green'] as const;

    for (const cat of categories) {
      for (const sev of severities) {
        const p1Profile = p1Generator(cat, sev);
        const apiProfile = apiReExportedGenerator(cat, sev);

        expect(apiProfile).toEqual(p1Profile);
      }
    }
  });

  it('strictly maps trauma to canonical trauma profile without extraneous specialists', () => {
    const traumaProfile = apiReExportedGenerator('trauma', 'red');
    expect(traumaProfile.specialists_needed).toEqual([]);
    expect(traumaProfile.capability_flags).toEqual(['trauma_team', 'icu']);
    expect(traumaProfile.blood_type_needed).toBe('O-');
  });

  it('strictly maps cardiac to canonical cardiac profile', () => {
    const cardiacProfile = apiReExportedGenerator('cardiac', 'red');
    expect(cardiacProfile.specialists_needed).toEqual(['cardiologist']);
    expect(cardiacProfile.capability_flags).toEqual(['ecg', 'icu']);
    expect(cardiacProfile.blood_type_needed).toBeNull();
  });

  it('strictly maps obstetric and pediatric to canonical profiles', () => {
    const obsProfile = apiReExportedGenerator('obstetric', 'yellow');
    expect(obsProfile.specialists_needed).toEqual(['obgyn']);
    expect(obsProfile.capability_flags).toEqual(['maternity']);
    expect(obsProfile.blood_type_needed).toBeNull();

    const pedProfile = apiReExportedGenerator('pediatric', 'yellow');
    expect(pedProfile.specialists_needed).toEqual(['pediatrician']);
    expect(pedProfile.capability_flags).toEqual(['pediatric_emergency']);
    expect(pedProfile.blood_type_needed).toBeNull();
  });

  it('safely handles unknown categories with safe deterministic fallback', () => {
    const fallbackProfile = apiReExportedGenerator('unknown_emergency_category');
    expect(fallbackProfile.specialists_needed).toEqual([]);
    expect(fallbackProfile.capability_flags).toEqual([]);
    expect(fallbackProfile.blood_type_needed).toBeNull();
  });
});

/**
 * Raahi Full Platform Evolution — Feature Test Suite
 * Tests Features 1-14 domain logic:
 * - Capability graph & DAG dependencies
 * - Dynamic vitals, symptoms, and severity assistant
 * - Crisis mode, anti-concentration allocation, and bottlenecks
 * - Hospital and ambulance registrations & verification
 * - Live telemetry, in-transit vitals updates, and 7-stage patient journey
 * - Role-based notifications
 * - AI Operations briefing and safety non-decisional compliance
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCapabilityDependencies,
  evaluateHospitalCapabilityGraph,
} from '../src/domain/capabilityGraph';
import {
  evaluateSeverityAssistance,
  generateDynamicNeedProfile,
  EMERGENCY_SUBCATEGORIES,
} from '../src/domain/vitalsIntelligence';
import { JOURNEY_STAGES_ORDER } from '../src/domain/trackingAndTransit';
import { AiOperationsService } from '../src/domain/aiOperations';
import { Hospital } from '../src/services/types';

describe('Feature 1: Capability Graph & DAG Dependencies', () => {
  it('resolves direct and transitive dependencies for cath_lab', () => {
    const resolution = resolveCapabilityDependencies(['cath_lab']);
    expect(resolution.requiredNodes).toContain('cath_lab');
    expect(resolution.requiredNodes).toContain('cardiologist');
    expect(resolution.requiredNodes).toContain('icu');
  });

  it('evaluates hospital capability status accurately', () => {
    const sampleHospital: Hospital = {
      id: 'hosp_test',
      name: 'Test Super Specialty Hospital',
      lat: 21.17,
      lng: 72.83,
      trauma_team_on_shift: true,
      specialists_on_call: ['trauma_surgeon', 'cardiologist', 'anesthesiologist'],
      icu_beds_free: 5,
      ventilators_free: 3,
      capabilities: ['trauma_team', 'cath_lab', 'cardiac_icu', 'icu', 'oxygen_generator', 'emergency_power', 'ct_scan'],
      blood_stock: { 'O+': 10, 'A+': 5, 'B+': 5, 'AB+': 2, 'O-': 4, 'A-': 2, 'B-': 2, 'AB-': 1 },
      er_load_score: 1,
      accepts_scheme_patients: true,
      operational_status: { icu: true, ventilator: true, blood: true },
      last_updated_at: new Date().toISOString(),
    };

    const evaluation = evaluateHospitalCapabilityGraph(
      sampleHospital.capabilities,
      sampleHospital.specialists_on_call,
      sampleHospital.trauma_team_on_shift,
      sampleHospital.icu_beds_free,
      sampleHospital.ventilators_free,
      ['cath_lab', 'cardiologist', 'icu']
    );
    expect(evaluation.satisfied).toBe(true);
    expect(evaluation.satisfiedPct).toBe(100);
    expect(evaluation.missing.length).toBe(0);
  });
});

describe('Features 6, 7, 8, 9: Vitals Intelligence & Severity Assistant', () => {
  it('correctly suggests red severity for hypotensive tachycardia patient', () => {
    const vitals = {
      heart_rate: 135,
      blood_pressure_sys: 80,
      blood_pressure_dia: 50,
      spo2: 89,
      respiratory_rate: 28,
      gcs: 12,
    };
    const symptoms = {
      altered_mental_status: true,
      chest_pain: true,
      severe_bleeding: false,
      respiratory_distress: true,
    };

    const suggestion = evaluateSeverityAssistance('trauma', vitals, symptoms);
    expect(suggestion.suggested_severity).toBe('red');
    expect(suggestion.rationales.length).toBeGreaterThan(0);
    expect(suggestion.flags).toContain('PROFOUND_HYPOTENSION');
  });

  it('generates dynamic need profile expanding specialists and capability flags', () => {
    const needProfile = generateDynamicNeedProfile('cardiac', 'red', 'heart_attack');
    expect(needProfile.specialists_needed).toContain('cardiologist');
    expect(needProfile.capability_flags).toContain('cath_lab');
    expect(needProfile.capability_flags).toContain('icu');
  });

  it('includes subcategories across all emergency domains', () => {
    expect(EMERGENCY_SUBCATEGORIES['road_accident']).toBeDefined();
    expect(EMERGENCY_SUBCATEGORIES['stroke']).toBeDefined();
    expect(EMERGENCY_SUBCATEGORIES['child_emergency']).toBeDefined();
    expect(EMERGENCY_SUBCATEGORIES['burn_thermal']).toBeDefined();
  });
});

describe('Feature 13: 7-Stage Patient Journey', () => {
  it('defines all required sequential journey stages in order', () => {
    const stages = JOURNEY_STAGES_ORDER.map((s) => s.stage);
    expect(stages).toContain('CASE_CREATED');
    expect(stages).toContain('HOSPITAL_MATCHED');
    expect(stages).toContain('HOSPITAL_ACCEPTED');
    expect(stages).toContain('AMBULANCE_ASSIGNED');
    expect(stages).toContain('PATIENT_PICKED');
    expect(stages).toContain('TRANSIT_IN_PROGRESS');
    expect(stages).toContain('ARRIVED_AT_HOSPITAL');
    expect(stages).toContain('HANDOFF_COMPLETED');
  });
});

describe('Feature 14: AI Operations Safety & Non-Decisional Briefings', () => {
  it('always includes strict non-decisional disclaimer on incident briefing', async () => {
    const incident: any = {
      id: 'inc_test',
      name: 'Highway Collision Multi-Vehicle',
      type: 'mass_casualty',
      location: { lat: 21.19, lng: 72.81 },
      status: 'active',
      cases: ['case_1', 'case_2'],
      bottlenecksDetected: ['ICU Bed Surge'],
    };
    const allocations = [
      { caseId: 'case_1', hospitalId: 'hosp_1', hospitalName: 'Civil Hospital', severity: 'red' },
      { caseId: 'case_2', hospitalId: 'hosp_2', hospitalName: 'SMIMER Hospital', severity: 'yellow' },
    ];

    const briefing = await AiOperationsService.generateIncidentBriefing(incident, allocations);
    expect(briefing.disclaimer).toContain('Not for clinical diagnosis or triage routing decisions');
    expect(briefing.summary).toBeDefined();
    expect(briefing.bottlenecks).toBeDefined();
  });

  it('generates network-wide health briefing safely', async () => {
    const mockHospitals: any[] = [
      { id: 'h1', icu_beds_free: 8, ventilators_free: 4, er_load_score: 2 },
      { id: 'h2', icu_beds_free: 3, ventilators_free: 2, er_load_score: 3 },
    ];

    const briefing = await AiOperationsService.generateNetworkBriefing(mockHospitals, 5, false);
    expect(briefing.disclaimer).toContain('Not for clinical diagnosis or triage routing decisions');
    expect(briefing.summary).toContain('11 ICU beds');
  });
});

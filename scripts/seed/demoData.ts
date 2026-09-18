/**
 * Seed & Demo Dataset for Raahi Coordination System
 * 
 * Contains synthetic, production-shaped demo records for:
 * - 8 diverse hospitals (varying capabilities, loads, and freshness states)
 * - Demo cases covering cardiac, trauma, obstetric, and pediatric emergencies
 * - Mass casualty incident group with 4 linked cases
 * 
 * Conforms strictly to docs/data-model.md and docs/spec.md.
 * No real patient information.
 */

import { Hospital, Case } from '../../functions/src/services/types';

/**
 * Baseline reference timestamp for demo seeding (current time)
 */
const now = Date.now();
const minutesAgo = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();

export const DEMO_HOSPITALS: Hospital[] = [
  {
    id: 'hospital_001',
    name: 'CityCare General Hospital',
    lat: 21.1702,
    lng: 72.8311,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'orthopedist', 'general_surgeon', 'anesthetist'],
    icu_beds_free: 4,
    ventilators_free: 2,
    blood_stock: {
      'O-': 3,
      'O+': 14,
      'A+': 11,
      'A-': 2,
      'B+': 9,
      'B-': 1,
      'AB+': 5,
      'AB-': 1,
    },
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(4), // FRESH (<= 10 min)
    reliability_score: 0.94,
  },
  {
    id: 'hospital_002',
    name: 'Surat Apex Trauma Center',
    lat: 21.1825,
    lng: 72.8198,
    trauma_team_on_shift: true,
    specialists_on_call: ['orthopedist', 'general_surgeon', 'anesthetist', 'neurosurgeon'],
    icu_beds_free: 6,
    ventilators_free: 4,
    blood_stock: {
      'O-': 5,
      'O+': 18,
      'A+': 15,
      'A-': 4,
      'B+': 12,
      'B-': 2,
      'AB+': 6,
      'AB-': 2,
    },
    er_load_score: 1, // Low load
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(2), // FRESH
    reliability_score: 0.98,
  },
  {
    id: 'hospital_003',
    name: 'Mother & Child Care Hospital',
    lat: 21.1612,
    lng: 72.845,
    trauma_team_on_shift: false,
    specialists_on_call: ['obgyn', 'pediatrician', 'anesthetist'],
    icu_beds_free: 3,
    ventilators_free: 2,
    blood_stock: {
      'O-': 2,
      'O+': 8,
      'A+': 9,
      'A-': 1,
      'B+': 7,
      'B-': 1,
      'AB+': 3,
      'AB-': 1,
    },
    er_load_score: 2,
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(6), // FRESH
    reliability_score: 0.91,
  },
  {
    id: 'hospital_004',
    name: 'Metro Heart & Vascular Institute',
    lat: 21.1945,
    lng: 72.8289,
    trauma_team_on_shift: false,
    specialists_on_call: ['cardiologist', 'anesthetist'],
    icu_beds_free: 5,
    ventilators_free: 3,
    blood_stock: {
      'O-': 2,
      'O+': 10,
      'A+': 8,
      'A-': 2,
      'B+': 6,
      'B-': 1,
      'AB+': 4,
      'AB-': 1,
    },
    er_load_score: 3,
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(5), // FRESH
    reliability_score: 0.96,
  },
  {
    id: 'hospital_005',
    name: 'Lifeline Emergency Hospital',
    lat: 21.155,
    lng: 72.812,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'general_surgeon'],
    icu_beds_free: 2,
    ventilators_free: 1,
    blood_stock: {
      'O-': 1,
      'O+': 5,
      'A+': 4,
      'B+': 5,
    },
    er_load_score: 4, // High load
    accepts_scheme_patients: false,
    last_updated_at: minutesAgo(22), // STALE (> 10m and <= 30m) - Scenario D Stale Data
    reliability_score: 0.82,
  },
  {
    id: 'hospital_006',
    name: 'Sunrise Community Hospital',
    lat: 21.205,
    lng: 72.865,
    trauma_team_on_shift: false,
    specialists_on_call: ['general_surgeon'],
    icu_beds_free: 1,
    ventilators_free: 0,
    blood_stock: {
      'O+': 3,
      'A+': 2,
    },
    er_load_score: 3,
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(55), // UNKNOWN (> 30m) - De-weighted freshness
    reliability_score: 0.74,
  },
  {
    id: 'hospital_007',
    name: 'Diamond City Children & Pediatric Center',
    lat: 21.178,
    lng: 72.852,
    trauma_team_on_shift: false,
    specialists_on_call: ['pediatrician', 'anesthetist'],
    icu_beds_free: 4,
    ventilators_free: 2,
    blood_stock: {
      'O-': 2,
      'O+': 6,
      'A+': 5,
      'B+': 4,
    },
    er_load_score: 1,
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(3), // FRESH
    reliability_score: 0.95,
  },
  {
    id: 'hospital_008',
    name: 'New Horizon Medical Center',
    lat: 21.218,
    lng: 72.84,
    trauma_team_on_shift: true,
    specialists_on_call: ['cardiologist', 'orthopedist', 'obgyn', 'pediatrician'],
    icu_beds_free: 8,
    ventilators_free: 5,
    blood_stock: {
      'O-': 4,
      'O+': 20,
      'A+': 15,
      'B+': 15,
      'AB+': 8,
    },
    er_load_score: 5, // High ER load
    accepts_scheme_patients: true,
    last_updated_at: minutesAgo(8), // FRESH
    reliability_score: 0.88,
  },
];

export const DEMO_CASES: Case[] = [
  // Scenario A: Single acute cardiac case
  {
    id: 'case_demo_cardiac_01',
    created_at: minutesAgo(10),
    category: 'cardiac',
    severity: 'red',
    need_profile: {
      specialists_needed: ['cardiologist'],
      capability_flags: ['ecg', 'icu'],
      blood_type_needed: null,
    },
    vitals_summary: 'Severe radiating retrosternal chest pain, ST elevation, SpO2 91%, pulse 118',
    onset_time: '25 minutes ago',
    treatment_administered: 'Aspirin 300mg given, high-flow oxygen started',
    patient_basic_info: {
      age: 61,
      sex: 'male',
    },
    incident_group_id: null,
    ambulance_location: {
      lat: 21.1632,
      lng: 72.8398,
    },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },

  // Scenario B: Polytrauma case (triggers reject/timeout + reroute)
  {
    id: 'case_demo_trauma_01',
    created_at: minutesAgo(8),
    category: 'trauma',
    severity: 'red',
    need_profile: {
      specialists_needed: ['orthopedist'],
      capability_flags: ['trauma_team', 'icu'],
      blood_type_needed: 'O-',
    },
    vitals_summary: 'Open pelvic fracture, active haemorrhage, BP 82/50, pulse 135',
    onset_time: '15 minutes ago',
    treatment_administered: 'Pelvic binder placed, 2x wide-bore IV access, 1L normal saline running',
    patient_basic_info: {
      age: 34,
      sex: 'female',
    },
    incident_group_id: null,
    ambulance_location: {
      lat: 21.1805,
      lng: 72.825,
    },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },

  // Scenario D: Obstetric emergency demonstrating stale data handling
  {
    id: 'case_demo_obstetric_01',
    created_at: minutesAgo(5),
    category: 'obstetric',
    severity: 'red',
    need_profile: {
      specialists_needed: ['obgyn'],
      capability_flags: ['maternity', 'icu'],
      blood_type_needed: null,
    },
    vitals_summary: 'Severe pre-eclampsia, visual disturbance, BP 190/115, fetal bradycardia',
    onset_time: '35 minutes ago',
    treatment_administered: 'Magnesium sulfate IV loading dose given, left lateral tilt position',
    patient_basic_info: {
      age: 28,
      sex: 'female',
    },
    incident_group_id: null,
    ambulance_location: {
      lat: 21.168,
      lng: 72.822,
    },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },

  // Scenario C: Mass-Casualty Multi-Patient Batch (Highway Express collision, 4 linked patients)
  {
    id: 'case_mci_patient_1',
    created_at: minutesAgo(12),
    category: 'cardiac',
    severity: 'red',
    need_profile: {
      specialists_needed: ['cardiologist'],
      capability_flags: ['ecg', 'icu'],
      blood_type_needed: null,
    },
    vitals_summary: 'Blunt chest trauma, myocardial contusion, arrhythmia',
    onset_time: '20 minutes ago',
    treatment_administered: 'Oxygen, cardiac monitoring',
    patient_basic_info: { age: 52, sex: 'male' },
    incident_group_id: 'incident_expressway_mci_01',
    ambulance_location: { lat: 21.192, lng: 72.815 },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },
  {
    id: 'case_mci_patient_2',
    created_at: minutesAgo(12),
    category: 'trauma',
    severity: 'red',
    need_profile: {
      specialists_needed: [],
      capability_flags: ['trauma_team', 'icu'],
      blood_type_needed: 'O-',
    },
    vitals_summary: 'Severe polytrauma, pneumothorax, shock',
    onset_time: '20 minutes ago',
    treatment_administered: 'Chest decompression, tourniquet, crystalloids',
    patient_basic_info: { age: 29, sex: 'male' },
    incident_group_id: 'incident_expressway_mci_01',
    ambulance_location: { lat: 21.192, lng: 72.815 },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },
  {
    id: 'case_mci_patient_3',
    created_at: minutesAgo(12),
    category: 'obstetric',
    severity: 'yellow',
    need_profile: {
      specialists_needed: ['obgyn'],
      capability_flags: ['maternity'],
      blood_type_needed: null,
    },
    vitals_summary: 'Pregnant passenger (32 weeks), abdominal pain following seatbelt impact',
    onset_time: '20 minutes ago',
    treatment_administered: 'Spinal precautions, vitals monitoring',
    patient_basic_info: { age: 26, sex: 'female' },
    incident_group_id: 'incident_expressway_mci_01',
    ambulance_location: { lat: 21.192, lng: 72.815 },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },
  {
    id: 'case_mci_patient_4',
    created_at: minutesAgo(12),
    category: 'pediatric',
    severity: 'yellow',
    need_profile: {
      specialists_needed: ['pediatrician'],
      capability_flags: ['pediatric_emergency'],
      blood_type_needed: null,
    },
    vitals_summary: 'Pediatric passenger, clavicle fracture, minor head laceration, Glasgow Coma Scale 15',
    onset_time: '20 minutes ago',
    treatment_administered: 'Immobilization, wound dressing',
    patient_basic_info: { age: 7, sex: 'female' },
    incident_group_id: 'incident_expressway_mci_01',
    ambulance_location: { lat: 21.192, lng: 72.815 },
    status: 'routing',
    active_request_id: null,
    attempt_number: 0,
  },
];

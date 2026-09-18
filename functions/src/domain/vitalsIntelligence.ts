/**
 * Vitals Intelligence & Dynamic Need Profiling Engine (Features 6, 7, 8, 9)
 * 
 * Provides:
 * 1. Granular emergency categories & clinical subcategories
 * 2. Quantitative manual patient vitals structure & triage boundaries
 * 3. Deterministic rule-based severity recommendation assistance with clinical reasoning
 * 4. Dynamic Need Profile derivation powered by capability graph resolution
 */

import { resolveCapabilityDependencies } from './capabilityGraph';

export type MainCategory =
  | 'cardiac'
  | 'trauma'
  | 'neurological'
  | 'respiratory'
  | 'pediatric'
  | 'obstetric'
  | 'burn'
  | 'medical'
  | 'disaster'
  | 'other';

export interface EmergencySubcategory {
  id: string;
  name: string;
  parentCategory: MainCategory;
  defaultCapabilities: string[];
  requiresBloodType?: boolean;
}

export const EMERGENCY_SUBCATEGORIES: Record<string, EmergencySubcategory> = {
  // Trauma
  road_accident: { id: 'road_accident', name: 'Road Traffic Accident (High-Velocity)', parentCategory: 'trauma', defaultCapabilities: ['trauma_center', 'orthopedist'], requiresBloodType: true },
  industrial_accident: { id: 'industrial_accident', name: 'Industrial / Machinery Accident', parentCategory: 'trauma', defaultCapabilities: ['trauma_center', 'general_surgeon'], requiresBloodType: true },
  crush_injury: { id: 'crush_injury', name: 'Crush Injury & Entrapment', parentCategory: 'trauma', defaultCapabilities: ['trauma_center', 'orthopedist', 'icu'], requiresBloodType: true },
  multiple_trauma: { id: 'multiple_trauma', name: 'Multiple Trauma / Polytrauma', parentCategory: 'trauma', defaultCapabilities: ['trauma_center', 'neurosurgeon', 'orthopedist'], requiresBloodType: true },

  // Cardiac
  heart_attack: { id: 'heart_attack', name: 'Acute Myocardial Infarction / STEMI', parentCategory: 'cardiac', defaultCapabilities: ['cardiology', 'cath_lab'] },
  cardiac_arrest: { id: 'cardiac_arrest', name: 'Cardiac Arrest (Post-Resuscitation)', parentCategory: 'cardiac', defaultCapabilities: ['cardiology', 'icu', 'ventilator'] },
  chest_pain: { id: 'chest_pain', name: 'Acute Unstable Angina / Chest Pain', parentCategory: 'cardiac', defaultCapabilities: ['cardiology', 'ecg'] },

  // Neurological
  stroke: { id: 'stroke', name: 'Acute Ischemic Stroke (tPA Window)', parentCategory: 'neurological', defaultCapabilities: ['stroke_pathway', 'ct_scan'] },
  seizure: { id: 'seizure', name: 'Status Epilepticus / Prolonged Convulsions', parentCategory: 'neurological', defaultCapabilities: ['neurologist', 'icu'] },
  head_injury: { id: 'head_injury', name: 'Traumatic Brain Injury / Skull Fracture', parentCategory: 'neurological', defaultCapabilities: ['neurosurgeon', 'ct_scan', 'icu'] },

  // Respiratory
  respiratory_failure: { id: 'respiratory_failure', name: 'Acute Respiratory Failure / ARDS', parentCategory: 'respiratory', defaultCapabilities: ['respiratory_icu', 'ventilator'] },
  asthma_copd: { id: 'asthma_copd', name: 'Severe Acute Asthma / Exacerbation', parentCategory: 'respiratory', defaultCapabilities: ['respiratory_icu'] },

  // Pediatric
  child_emergency: { id: 'child_emergency', name: 'Critical Child Emergency', parentCategory: 'pediatric', defaultCapabilities: ['pediatric_emergency'] },
  neonatal: { id: 'neonatal', name: 'Neonatal Distress / Premature Asphyxia', parentCategory: 'pediatric', defaultCapabilities: ['pediatric_emergency', 'neonatal_icu'] },

  // Obstetric
  pregnancy_emergency: { id: 'pregnancy_emergency', name: 'Pre-Eclampsia / Obstructed Labor', parentCategory: 'obstetric', defaultCapabilities: ['maternity'] },

  // Burn
  burn_thermal: { id: 'burn_thermal', name: 'Extensive Thermal / Flame Burn', parentCategory: 'burn', defaultCapabilities: ['burn_unit'] },
  burn_chemical: { id: 'burn_chemical', name: 'Chemical Burn & Inhalation Injury', parentCategory: 'burn', defaultCapabilities: ['burn_unit', 'respiratory_icu'] },
  burn_electrical: { id: 'burn_electrical', name: 'High-Voltage Electrical Burn', parentCategory: 'burn', defaultCapabilities: ['burn_unit', 'cardiology'] },

  // Medical
  poisoning: { id: 'poisoning', name: 'Acute Ingestion / Organophosphate Poisoning', parentCategory: 'medical', defaultCapabilities: ['toxicology'] },
  infection_sepsis: { id: 'infection_sepsis', name: 'Refractory Septic Shock', parentCategory: 'medical', defaultCapabilities: ['sepsis_resuscitation'] },

  // Disaster
  mass_casualty: { id: 'mass_casualty', name: 'Mass Casualty / Crisis Incident', parentCategory: 'disaster', defaultCapabilities: ['trauma_center', 'icu'] },
};

export interface PatientVitals {
  heart_rate?: number | null; // bpm
  blood_pressure_sys?: number | null; // mmHg
  blood_pressure_dia?: number | null; // mmHg
  spo2?: number | null; // % (oxygen saturation)
  temperature?: number | null; // °C
  respiratory_rate?: number | null; // breaths/min
  blood_sugar?: number | null; // mg/dL
  gcs_score?: number | null; // Glasgow Coma Scale (3-15)
}

export interface PatientSymptoms {
  unconscious?: boolean;
  bleeding?: boolean;
  breathing_difficulty?: boolean;
  chest_pain?: boolean;
  seizure?: boolean;
  fracture?: boolean;
  burn?: boolean;
  pregnant?: boolean;
}

export interface SeveritySuggestion {
  suggested_severity: 'red' | 'yellow' | 'green';
  confidence_score: number; // 0 - 1
  rationales: string[];
  clinical_justification?: string[];
  critical_flags: string[];
  flags?: string[];
}

export interface DynamicNeedProfileResult {
  specialists_needed: string[];
  capability_flags: string[];
  blood_type_needed: string | null;
  resolved_capabilities: string[];
  optional_capabilities: string[];
  dependency_graph: Record<string, string[]>;
  summary_text: string;
}

/**
 * Deterministic Rule-Based Severity Assistance (Feature 9)
 * 
 * Clinically grounded algorithm matching international emergency triage guidelines.
 * Suggests RED, YELLOW, or GREEN with transparent rationales.
 * The human paramedic/dispatcher remains the final authority.
 */
export function evaluateSeverityAssistance(
  arg1?: any,
  arg2?: any,
  arg3?: any
): SeveritySuggestion {
  let vitals: PatientVitals | null | undefined;
  let symptoms: (PatientSymptoms & { altered_mental_status?: boolean; respiratory_distress?: boolean; severe_bleeding?: boolean }) | null | undefined;
  let category: string | undefined;

  if (typeof arg1 === 'string') {
    category = arg1;
    vitals = arg2;
    symptoms = arg3;
  } else {
    vitals = arg1;
    symptoms = arg2;
    category = arg3;
  }

  const rationales: string[] = [];
  const flags: string[] = [];
  let isRed = false;
  let isYellow = false;

  const gcs = (vitals as any)?.gcs_score ?? (vitals as any)?.gcs;

  // 1. SpO2 Evaluation
  if (vitals?.spo2 !== undefined && vitals?.spo2 !== null && vitals.spo2 > 0) {
    if (vitals.spo2 < 85) {
      isRed = true;
      flags.push('CRITICAL_HYPOXIA');
      rationales.push(`Severe hypoxia detected: SpO2 at ${vitals.spo2}% (<85%)`);
    } else if (vitals.spo2 < 92) {
      isYellow = true;
      flags.push('MODERATE_HYPOXIA');
      rationales.push(`Moderate oxygen desaturation: SpO2 at ${vitals.spo2}% (<92%)`);
    }
  }

  // 2. GCS Score (Consciousness)
  if (gcs !== undefined && gcs !== null) {
    if (gcs <= 8) {
      isRed = true;
      flags.push('SEVERE_COMA_GCS');
      rationales.push(`Severe neurological compromise: GCS score ${gcs} (<=8 indicates coma/compromised airway)`);
    } else if (gcs <= 12) {
      isYellow = true;
      flags.push('ALTERED_MENTAL_STATUS');
      rationales.push(`Altered consciousness: GCS score ${gcs} (9-12)`);
    }
  }

  // 3. Blood Pressure / Shock Index
  if (vitals?.blood_pressure_sys !== undefined && vitals?.blood_pressure_sys !== null) {
    if (vitals.blood_pressure_sys <= 80) {
      isRed = true;
      flags.push('PROFOUND_HYPOTENSION');
      rationales.push(`Profound hypotensive shock: Systolic BP ${vitals.blood_pressure_sys} mmHg (<=80)`);
    } else if (vitals.blood_pressure_sys < 90 || vitals.blood_pressure_sys > 190) {
      isYellow = true;
      flags.push('HEMODYNAMIC_INSTABILITY');
      rationales.push(`Hemodynamic alert: Systolic BP ${vitals.blood_pressure_sys} mmHg`);
    }
  }

  // Shock Index (Heart Rate / Systolic BP >= 1.0 indicates occult or overt shock)
  if (vitals?.heart_rate && vitals?.blood_pressure_sys && vitals.blood_pressure_sys > 0) {
    const shockIndex = vitals.heart_rate / vitals.blood_pressure_sys;
    if (shockIndex >= 1.0) {
      isRed = true;
      flags.push('ELEVATED_SHOCK_INDEX');
      rationales.push(`Shock Index critical: ${shockIndex.toFixed(2)} (HR ${vitals.heart_rate} / SBP ${vitals.blood_pressure_sys} >= 1.0)`);
    }
  }

  // 4. Heart Rate
  if (vitals?.heart_rate !== undefined && vitals?.heart_rate !== null) {
    if (vitals.heart_rate > 140 || vitals.heart_rate < 40) {
      isRed = true;
      flags.push('EXTREME_HEART_RATE');
      rationales.push(`Extreme tachycardia/bradycardia: Heart rate ${vitals.heart_rate} bpm`);
    } else if (vitals.heart_rate > 115 || vitals.heart_rate < 50) {
      isYellow = true;
      flags.push('ELEVATED_HEART_RATE');
      rationales.push(`Abnormal pulse: Heart rate ${vitals.heart_rate} bpm`);
    }
  }

  // 5. Symptom Triggers
  if (symptoms?.unconscious) {
    isRed = true;
    flags.push('UNCONSCIOUS');
    rationales.push('Patient is unresponsive / unconscious');
  }
  if ((symptoms?.breathing_difficulty || symptoms?.respiratory_distress) && (vitals?.spo2 ?? 100) < 90) {
    isRed = true;
    flags.push('ACUTE_RESPIRATORY_DISTRESS');
    rationales.push('Acute respiratory distress combined with hypoxia');
  }
  if (symptoms?.severe_bleeding) {
    isRed = true;
    flags.push('SEVERE_BLEEDING');
    rationales.push('Severe profuse bleeding reported');
  } else if (symptoms?.bleeding && isRed) {
    flags.push('HEMORRHAGIC_SHOCK');
    rationales.push('Active bleeding in presence of vital signs compromise');
  } else if (symptoms?.bleeding) {
    isYellow = true;
    flags.push('ACTIVE_HEMORRHAGE');
    rationales.push('Active hemorrhage reported');
  }
  if (symptoms?.altered_mental_status) {
    isYellow = true;
    flags.push('ALTERED_MENTAL_STATUS');
    rationales.push('Altered mental status noted by paramedics');
  }
  if (symptoms?.seizure) {
    isYellow = true;
    flags.push('ACTIVE_SEIZURE');
    rationales.push('Active / ongoing seizure episode reported');
  }
  if (symptoms?.chest_pain && category === 'cardiac') {
    isYellow = true;
    flags.push('ACUTE_CHEST_PAIN');
    rationales.push('Severe cardiac-type chest pain reported');
  }

  if (isRed) {
    return {
      suggested_severity: 'red',
      confidence_score: 0.95,
      rationales: rationales.length > 0 ? rationales : ['Critical physiological compromise'],
      clinical_justification: rationales.length > 0 ? rationales : ['Critical physiological compromise'],
      critical_flags: flags,
      flags,
    };
  }

  if (isYellow) {
    return {
      suggested_severity: 'yellow',
      confidence_score: 0.85,
      rationales: rationales.length > 0 ? rationales : ['Urgent medical observation needed'],
      clinical_justification: rationales.length > 0 ? rationales : ['Urgent medical observation needed'],
      critical_flags: flags,
      flags,
    };
  }

  return {
    suggested_severity: 'green',
    confidence_score: 0.9,
    rationales: ['Vitals within stable baseline parameters and no red-flag clinical triggers'],
    clinical_justification: ['Vitals within stable baseline parameters and no red-flag clinical triggers'],
    critical_flags: [],
    flags: [],
  };
}

/**
 * Deterministic Dynamic Need Profile Generator (Feature 8)
 * 
 * Integrates Case Category, Subcategory, Vitals, and Symptoms through the
 * Capability Graph layer to output resolved specialist and infrastructure requirements.
 */
export function generateDynamicNeedProfile(
  category: string,
  severity: 'red' | 'yellow' | 'green',
  subcategoryId?: string | null,
  vitals?: PatientVitals | null,
  symptoms?: PatientSymptoms | null,
  bloodTypeNeeded: string | null = null
): DynamicNeedProfileResult {
  const baseCaps: string[] = [];

  // 1. Identify subcategory or fallback to main category
  const subcat = subcategoryId ? EMERGENCY_SUBCATEGORIES[subcategoryId] : null;
  if (subcat) {
    baseCaps.push(...subcat.defaultCapabilities);
  } else {
    // Map legacy main category
    switch (category) {
      case 'cardiac':
        baseCaps.push('cardiology');
        break;
      case 'trauma':
        baseCaps.push('trauma_center');
        break;
      case 'neurological':
      case 'stroke':
        baseCaps.push('stroke_pathway');
        break;
      case 'respiratory':
        baseCaps.push('respiratory_icu');
        break;
      case 'pediatric':
        baseCaps.push('pediatric_emergency');
        break;
      case 'obstetric':
        baseCaps.push('maternity');
        break;
      case 'burn':
        baseCaps.push('burn_unit');
        break;
      case 'poisoning':
        baseCaps.push('toxicology');
        break;
      case 'sepsis':
        baseCaps.push('sepsis_resuscitation');
        break;
      default:
        baseCaps.push('general_physician');
        break;
    }
  }

  // 2. Vitals-driven additions
  if (vitals?.spo2 && vitals.spo2 < 88) {
    baseCaps.push('ventilator', 'icu');
  }
  if (vitals?.gcs_score && vitals.gcs_score <= 8) {
    baseCaps.push('icu', 'anesthetist');
  }
  if (vitals?.blood_pressure_sys && vitals.blood_pressure_sys < 80) {
    baseCaps.push('icu', 'blood_bank');
  }

  // 3. Symptoms-driven additions
  if (symptoms?.bleeding) {
    baseCaps.push('blood_bank');
    if (!bloodTypeNeeded) bloodTypeNeeded = 'O-';
  }
  if (symptoms?.chest_pain) {
    baseCaps.push('ecg', 'cardiology');
  }
  if (symptoms?.unconscious) {
    baseCaps.push('icu');
  }
  if (symptoms?.fracture) {
    baseCaps.push('orthopedist');
  }
  if (symptoms?.pregnant) {
    baseCaps.push('maternity');
  }

  // If RED severity, always ensure ICU is required
  if (severity === 'red') {
    baseCaps.push('icu');
  }

  // 4. Resolve full transitive dependencies through Capability Graph
  const graphResolution = resolveCapabilityDependencies(Array.from(new Set(baseCaps)));

  // Separate specialists vs capability flags for backward compatibility
  const specialists = graphResolution.requiredNodes.filter((id) =>
    ['cardiologist', 'trauma_team', 'general_surgeon', 'orthopedist', 'neurosurgeon', 'neurologist', 'pediatrician', 'obgyn', 'anesthetist', 'general_physician', 'pulmonologist', 'plastic_surgeon'].includes(id)
  );
  const flags = graphResolution.requiredNodes.filter((id) => !specialists.includes(id));

  const summary = `${specialists.map((s) => s.replace('_', ' ')).join(', ') || 'Attending ER Physician'} + ${flags.join(', ')}`;

  return {
    specialists_needed: specialists,
    capability_flags: flags,
    blood_type_needed: bloodTypeNeeded,
    resolved_capabilities: graphResolution.requiredNodes,
    optional_capabilities: graphResolution.optionalNodes,
    dependency_graph: graphResolution.dependencyTrace,
    summary_text: summary,
  };
}

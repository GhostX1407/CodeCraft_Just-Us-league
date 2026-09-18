/**
 * Healthcare Capability Graph Layer (Feature 1)
 * 
 * Defines dependency DAGs for emergency medical capabilities, services, specialists,
 * and infrastructure. Resolves transitive requirements for patient Need Profiles
 * and validates hospital capability sets deterministically before matching.
 */

export type CapabilityType = 'service' | 'equipment' | 'specialist' | 'infrastructure';

export interface CapabilityNode {
  id: string;
  name: string;
  type: CapabilityType;
  dependencies: string[]; // Hard prerequisite capability IDs
  optional_dependencies?: string[]; // Recommended/secondary capability IDs
  description?: string;
}

export interface HospitalCapability {
  hospitalId: string;
  capabilities: string[];
}

export interface NeedCapabilityProfile {
  caseId: string;
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  dependencyGraph: Record<string, string[]>;
}

/**
 * Canonical Healthcare Capability Dependency Registry
 */
export const CAPABILITY_GRAPH_NODES: Record<string, CapabilityNode> = {
  // --- Clinical Services ---
  cardiology: {
    id: 'cardiology',
    name: 'Cardiology Emergency Care',
    type: 'service',
    dependencies: ['cardiologist', 'ecg', 'icu'],
    optional_dependencies: ['ventilator', 'cath_lab'],
    description: 'Acute coronary syndrome, STEMI, and arrythmia resuscitation',
  },
  cath_lab: {
    id: 'cath_lab',
    name: 'Catheterization Laboratory',
    type: 'infrastructure',
    dependencies: ['cardiologist', 'icu'],
    optional_dependencies: ['ventilator'],
    description: 'Emergency percutaneous coronary intervention (PCI)',
  },
  trauma_center: {
    id: 'trauma_center',
    name: 'Trauma Resuscitation Center',
    type: 'service',
    dependencies: ['trauma_team', 'general_surgeon', 'icu', 'blood_bank'],
    optional_dependencies: ['ct_scan', 'orthopedist', 'neurosurgeon'],
    description: 'High-velocity impact, penetrating trauma, and severe polytrauma',
  },
  stroke_pathway: {
    id: 'stroke_pathway',
    name: 'Hyperacute Stroke Unit',
    type: 'service',
    dependencies: ['neurosurgeon', 'ct_scan', 'icu'],
    optional_dependencies: ['ventilator'],
    description: 'Intravenous thrombolysis (tPA) and endovascular thrombectomy',
  },
  pediatric_emergency: {
    id: 'pediatric_emergency',
    name: 'Pediatric Acute Care',
    type: 'service',
    dependencies: ['pediatrician', 'icu'],
    optional_dependencies: ['neonatal_icu', 'ventilator'],
    description: 'Pediatric resuscitation and emergency pediatric stabilization',
  },
  maternity: {
    id: 'maternity',
    name: 'Obstetric & Labor Suite',
    type: 'service',
    dependencies: ['obgyn', 'icu', 'blood_bank'],
    optional_dependencies: ['neonatal_icu'],
    description: 'Pre-eclampsia, postpartum hemorrhage, and emergent c-section',
  },
  burn_unit: {
    id: 'burn_unit',
    name: 'Specialized Burn Unit',
    type: 'service',
    dependencies: ['general_surgeon', 'icu', 'ventilator'],
    optional_dependencies: ['plastic_surgeon'],
    description: 'Severe flame, chemical, and electrical surface burns',
  },
  respiratory_icu: {
    id: 'respiratory_icu',
    name: 'Severe Respiratory Failure Unit',
    type: 'service',
    dependencies: ['ventilator', 'icu', 'anesthetist'],
    optional_dependencies: ['pulmonologist'],
    description: 'Mechanical ventilation, ARDS, and status asthmaticus',
  },
  toxicology: {
    id: 'toxicology',
    name: 'Clinical Toxicology / Poisoning Care',
    type: 'service',
    dependencies: ['anesthetist', 'icu'],
    optional_dependencies: ['ventilator'],
    description: 'Organophosphate poisoning, chemical ingestions, and antidotes',
  },
  sepsis_resuscitation: {
    id: 'sepsis_resuscitation',
    name: 'Sepsis Resuscitation Bay',
    type: 'service',
    dependencies: ['general_physician', 'icu'],
    optional_dependencies: ['ventilator'],
    description: 'Septic shock, high lactate, and aggressive fluid/vasopressor titration',
  },

  // --- Specialists ---
  cardiologist: { id: 'cardiologist', name: 'Interventional Cardiologist', type: 'specialist', dependencies: [] },
  trauma_team: { id: 'trauma_team', name: 'Trauma Resuscitation Team', type: 'specialist', dependencies: [] },
  general_surgeon: { id: 'general_surgeon', name: 'General Surgeon On-Call', type: 'specialist', dependencies: [] },
  orthopedist: { id: 'orthopedist', name: 'Orthopedic Trauma Surgeon', type: 'specialist', dependencies: [] },
  neurosurgeon: { id: 'neurosurgeon', name: 'Neurosurgeon', type: 'specialist', dependencies: [] },
  neurologist: { id: 'neurologist', name: 'Neurologist', type: 'specialist', dependencies: [] },
  pediatrician: { id: 'pediatrician', name: 'Pediatric Specialist', type: 'specialist', dependencies: [] },
  obgyn: { id: 'obgyn', name: 'Obstetrician / Gynecologist', type: 'specialist', dependencies: [] },
  anesthetist: { id: 'anesthetist', name: 'Critical Care Anesthetist', type: 'specialist', dependencies: [] },
  general_physician: { id: 'general_physician', name: 'General Physician / Intensivist', type: 'specialist', dependencies: [] },
  pulmonologist: { id: 'pulmonologist', name: 'Pulmonologist', type: 'specialist', dependencies: [] },
  plastic_surgeon: { id: 'plastic_surgeon', name: 'Reconstructive / Burn Surgeon', type: 'specialist', dependencies: [] },

  // --- Infrastructure & Equipment ---
  icu: { id: 'icu', name: 'Intensive Care Unit Bed', type: 'infrastructure', dependencies: [] },
  ventilator: { id: 'ventilator', name: 'Invasive Mechanical Ventilator', type: 'equipment', dependencies: [] },
  ecg: { id: 'ecg', name: '12-Lead Diagnostic ECG', type: 'equipment', dependencies: [] },
  ct_scan: { id: 'ct_scan', name: 'Computed Tomography (CT Scanner)', type: 'equipment', dependencies: [] },
  blood_bank: { id: 'blood_bank', name: 'Cold-Chain Blood Stock Bank', type: 'infrastructure', dependencies: [] },
  neonatal_icu: { id: 'neonatal_icu', name: 'Neonatal Intensive Care Unit', type: 'infrastructure', dependencies: [] },
};

/**
 * Resolves the full transitive closure of capability dependencies given requested nodes.
 */
export function resolveCapabilityDependencies(
  requestedCapabilityIds: string[]
): {
  requiredNodes: string[];
  optionalNodes: string[];
  dependencyTrace: Record<string, string[]>;
} {
  const required = new Set<string>();
  const optional = new Set<string>();
  const trace: Record<string, string[]> = {};

  function visit(nodeId: string, isRoot: boolean = false) {
    const node = CAPABILITY_GRAPH_NODES[nodeId];
    if (!node) {
      // If node is unmapped in graph, still treat it as a required leaf capability
      required.add(nodeId);
      return;
    }

    required.add(node.id);
    trace[node.id] = [...node.dependencies];

    for (const depId of node.dependencies) {
      if (!required.has(depId)) {
        visit(depId, false);
      }
    }

    if (isRoot && node.optional_dependencies) {
      for (const optId of node.optional_dependencies) {
        if (!required.has(optId)) {
          optional.add(optId);
        }
      }
    }
  }

  for (const rootId of requestedCapabilityIds) {
    visit(rootId, true);
  }

  return {
    requiredNodes: Array.from(required),
    optionalNodes: Array.from(optional).filter((id) => !required.has(id)),
    dependencyTrace: trace,
  };
}

/**
 * Evaluates whether a hospital satisfies a resolved capability graph.
 */
export function evaluateHospitalCapabilityGraph(
  hospitalCapabilities: string[],
  specialistsOnCall: string[],
  hasTraumaTeam: boolean,
  icuBedsFree: number,
  ventilatorsFree: number,
  requiredCapabilityNodes: string[]
): {
  satisfied: boolean;
  missing: string[];
  satisfiedPct: number;
} {
  const missing: string[] = [];

  for (const capId of requiredCapabilityNodes) {
    if (capId === 'icu') {
      if (icuBedsFree <= 0) missing.push('icu');
      continue;
    }
    if (capId === 'ventilator') {
      if (ventilatorsFree <= 0) missing.push('ventilator');
      continue;
    }
    if (capId === 'trauma_team') {
      if (!hasTraumaTeam && !hospitalCapabilities.includes('trauma_team')) {
        missing.push('trauma_team');
      }
      continue;
    }

    // Check specialists list
    const isSpecialist = specialistsOnCall.some(
      (s) => s.toLowerCase() === capId.toLowerCase() || s.toLowerCase().includes(capId.toLowerCase())
    );
    if (isSpecialist) continue;

    // Check capabilities list
    const hasCap = hospitalCapabilities.some(
      (c) => c.toLowerCase() === capId.toLowerCase() || c.toLowerCase().includes(capId.toLowerCase())
    );
    if (hasCap) continue;

    missing.push(capId);
  }

  const total = requiredCapabilityNodes.length;
  const satisfiedCount = total - missing.length;
  const satisfiedPct = total === 0 ? 100 : Math.round((satisfiedCount / total) * 100);

  return {
    satisfied: missing.length === 0,
    missing,
    satisfiedPct,
  };
}

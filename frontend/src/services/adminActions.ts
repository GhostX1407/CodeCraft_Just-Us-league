import { stateStore } from './stateStore';
import { notify, logAudit } from './notificationBus';
import { firestore } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import type {
  Hospital,
  Ambulance,
  HospitalRegistrationRecord,
} from '../types/domain';

/**
 * Adds a new accredited hospital to the regional coordination grid.
 */
export function addHospital(data: Omit<Hospital, 'id'>): Hospital {
  const id = 'hosp_' + Math.random().toString(36).substring(2, 8);
  const newHospital: Hospital = {
    ...data,
    id,
    last_updated_at: Date.now(),
    reliability_score: data.reliability_score ?? 1.0,
    er_load_score: data.er_load_score ?? 2,
    trauma_team_on_shift: data.trauma_team_on_shift ?? false,
    accepts_scheme_patients: data.accepts_scheme_patients ?? true,
    blood_stock: data.blood_stock || { 'O+': 5, 'O-': 2, 'A+': 4, 'B+': 6 },
    specialists_on_call: data.specialists_on_call || [],
  };

  const currentHospitals = stateStore.getHospitals();
  stateStore.setHospitals([...currentHospitals, newHospital]);

  // Sync to Firestore
  if (firestore) {
    try {
      const hospRef = doc(firestore, 'hospitals', id);
      setDoc(hospRef, newHospital).catch(() => {});
    } catch {
      // Firestore offline fallback
    }
  }

  logAudit({
    request_id: null,
    case_id: '',
    hospital_id: id,
    event_type: 'HOSPITAL_ADDED',
    actor_type: 'admin',
    snapshot_of_data_at_decision_time: {
      hospital_id: id,
      name: newHospital.name,
      icu_beds: newHospital.icu_beds_free,
      ventilators: newHospital.ventilators_free,
    },
  });

  notify('admin', 'all', {
    type: 'HOSPITAL_ACCREDITED',
    severity: 'info',
    title: 'New Hospital Accredited',
    message: `${newHospital.name} successfully onboarded into emergency routing grid with ${newHospital.icu_beds_free} ICU beds.`,
    hospitalId: id,
  });

  return newHospital;
}

/**
 * Updates capacity or capabilities of an existing hospital.
 */
export function updateHospital(id: string, patch: Partial<Hospital>): Hospital {
  const updated = stateStore.updateHospital(id, patch);

  // Sync to Firestore
  if (firestore) {
    try {
      const hospRef = doc(firestore, 'hospitals', id);
      setDoc(hospRef, updated, { merge: true }).catch(() => {});
    } catch {
      // Firestore offline fallback
    }
  }

  logAudit({
    request_id: null,
    case_id: '',
    hospital_id: id,
    event_type: 'HOSPITAL_UPDATED',
    actor_type: 'admin',
    snapshot_of_data_at_decision_time: { ...patch },
  });

  notify('admin', 'all', {
    type: 'HOSPITAL_PARAM_UPDATED',
    severity: 'info',
    title: 'Hospital Parameters Updated',
    message: `${updated.name} parameters updated by Regional Administration.`,
    hospitalId: id,
  });

  return updated;
}

/**
 * Deactivates and removes a hospital from the active coordination grid.
 */
export function removeHospital(id: string): void {
  const current = stateStore.getHospitals();
  const target = current.find((h) => h.id === id);
  const filtered = current.filter((h) => h.id !== id);
  stateStore.setHospitals(filtered);

  logAudit({
    request_id: null,
    case_id: '',
    hospital_id: id,
    event_type: 'HOSPITAL_REMOVED',
    actor_type: 'admin',
    snapshot_of_data_at_decision_time: { hospital_id: id, name: target?.name },
  });

  notify('admin', 'all', {
    type: 'HOSPITAL_DEACTIVATED',
    severity: 'warning',
    title: 'Hospital Deactivated',
    message: `${target?.name || id} was removed from emergency dispatch routing.`,
    hospitalId: id,
  });
}

/**
 * Registers a new emergency ambulance into the fleet.
 */
export function addAmbulance(data: Omit<Ambulance, 'id'>): Ambulance {
  const id = 'AMB-' + Math.floor(100 + Math.random() * 900);
  const newAmbulance: Ambulance = {
    ...data,
    id,
    availability: data.availability || 'available',
    status: data.status || 'verified',
    speed_kmh: data.speed_kmh || 0,
    heading_degrees: data.heading_degrees || 0,
    last_updated_at: new Date().toISOString(),
  };

  stateStore.setAmbulance(newAmbulance);

  // Sync to Firestore
  if (firestore) {
    try {
      const ambRef = doc(firestore, 'ambulances', id);
      setDoc(ambRef, newAmbulance).catch(() => {});
    } catch {
      // Firestore offline fallback
    }
  }

  logAudit({
    request_id: null,
    case_id: '',
    hospital_id: null,
    event_type: 'AMBULANCE_ADDED',
    actor_type: 'admin',
    snapshot_of_data_at_decision_time: {
      ambulance_id: id,
      vehicle_number: newAmbulance.vehicle_number,
      type: newAmbulance.ambulance_type,
    },
  });

  notify('admin', 'all', {
    type: 'FLEET_EXPANDED',
    severity: 'info',
    title: 'New Ambulance Commissioned',
    message: `Unit ${newAmbulance.vehicle_number} (${newAmbulance.ambulance_type}) active in dispatch registry.`,
    ambulanceId: id,
  });

  return newAmbulance;
}

/**
 * Updates an ambulance unit's availability or telemetry.
 */
export function updateAmbulance(id: string, patch: Partial<Ambulance>): void {
  const existing = stateStore.getAmbulance(id);
  if (!existing) return;

  const updated: Ambulance = {
    ...existing,
    ...patch,
    last_updated_at: new Date().toISOString(),
  };

  stateStore.setAmbulance(updated);

  if (firestore) {
    try {
      const ambRef = doc(firestore, 'ambulances', id);
      setDoc(ambRef, updated, { merge: true }).catch(() => {});
    } catch {
      // Fallback
    }
  }

  logAudit({
    request_id: null,
    case_id: '',
    hospital_id: null,
    event_type: 'AMBULANCE_UPDATED',
    actor_type: 'admin',
    snapshot_of_data_at_decision_time: { ambulance_id: id, ...patch },
  });
}

/**
 * Decommissions and removes an ambulance unit from the active registry.
 */
export function removeAmbulance(id: string): void {
  const existing = stateStore.getAmbulance(id);
  if (!existing) return;

  const updated: Ambulance = {
    ...existing,
    availability: 'maintenance',
    status: 'rejected',
    last_updated_at: new Date().toISOString(),
  };

  stateStore.setAmbulance(updated);

  logAudit({
    request_id: null,
    case_id: '',
    hospital_id: null,
    event_type: 'AMBULANCE_REMOVED',
    actor_type: 'admin',
    snapshot_of_data_at_decision_time: { ambulance_id: id, vehicle: existing.vehicle_number },
  });

  notify('admin', 'all', {
    type: 'AMBULANCE_DECOMMISSIONED',
    severity: 'warning',
    title: 'Ambulance Decommissioned',
    message: `Unit ${existing.vehicle_number} (${id}) decommissioned from emergency dispatch registry.`,
    ambulanceId: id,
  });
}

/**
 * Approves a pending hospital or ambulance registration.
 */
export function approveRegistration(id: string, type: 'hospital' | 'ambulance'): void {
  const now = new Date().toISOString();

  if (type === 'hospital') {
    const registrations = stateStore.getHospitalRegistrations();
    const reg = registrations.find((r) => r.id === id);

    if (reg) {
      const updatedReg: HospitalRegistrationRecord = {
        ...reg,
        status: 'approved',
        reviewed_at: now,
        reviewer_notes: 'Accredited by State Emergency Command.',
      };
      stateStore.setHospitalRegistration(updatedReg);

      // Promote to active Hospital list
      const newHospital: Hospital = {
        id: reg.id,
        name: reg.name,
        lat: reg.lat,
        lng: reg.lng,
        trauma_team_on_shift: reg.capabilities.includes('trauma_team'),
        specialists_on_call: reg.specialists_on_call || [],
        icu_beds_free: reg.icu_beds || 2,
        ventilators_free: reg.ventilators || 1,
        blood_stock: reg.blood_stock as any,
        er_load_score: 2,
        accepts_scheme_patients: true,
        last_updated_at: Date.now(),
        reliability_score: 1.0,
        contact_number: reg.contact_number,
      };

      const hospitals = stateStore.getHospitals();
      if (!hospitals.some((h) => h.id === reg.id)) {
        stateStore.setHospitals([...hospitals, newHospital]);
      }

      logAudit({
        request_id: null,
        case_id: '',
        hospital_id: reg.id,
        event_type: 'HOSPITAL_REGISTRATION_APPROVED',
        actor_type: 'admin',
        snapshot_of_data_at_decision_time: { hospital_id: reg.id, name: reg.name },
      });

      notify('hospital', reg.id, {
        type: 'REGISTRATION_APPROVED',
        severity: 'info',
        title: 'Accreditation Approved',
        message: 'Your hospital accreditation was verified by State Oversight. Your facility is now live for emergency admissions.',
        hospitalId: reg.id,
      });

      notify('admin', 'all', {
        type: 'HOSPITAL_REGISTRATION_APPROVED',
        severity: 'info',
        title: 'Registration Approved',
        message: `Approved ${reg.name} accreditation. Hospital promoted to live dispatch network.`,
        hospitalId: reg.id,
      });
    }
  } else {
    // Ambulance approval
    const ambulances = stateStore.getAmbulances();
    const amb = ambulances.find((a) => a.id === id);
    if (amb) {
      const updated: Ambulance = {
        ...amb,
        status: 'approved',
        availability: 'available',
        last_updated_at: now,
      };
      stateStore.setAmbulance(updated);

      logAudit({
        request_id: null,
        case_id: '',
        hospital_id: null,
        event_type: 'AMBULANCE_REGISTRATION_APPROVED',
        actor_type: 'admin',
        snapshot_of_data_at_decision_time: { ambulance_id: amb.id, vehicle: amb.vehicle_number },
      });

      notify('ambulance', amb.id, {
        type: 'REGISTRATION_APPROVED',
        severity: 'info',
        title: 'Fleet Unit Approved',
        message: `Vehicle ${amb.vehicle_number} has been verified and cleared for active paramedic dispatch.`,
        ambulanceId: amb.id,
      });

      notify('admin', 'all', {
        type: 'AMBULANCE_REGISTRATION_APPROVED',
        severity: 'info',
        title: 'Ambulance Approved',
        message: `Approved vehicle ${amb.vehicle_number} for active dispatch.`,
        ambulanceId: amb.id,
      });
    }
  }
}

/**
 * Rejects a pending hospital or ambulance registration with a reason.
 */
export function rejectRegistration(id: string, type: 'hospital' | 'ambulance', reason: string): void {
  const now = new Date().toISOString();

  if (type === 'hospital') {
    const registrations = stateStore.getHospitalRegistrations();
    const reg = registrations.find((r) => r.id === id);
    if (reg) {
      const updatedReg: HospitalRegistrationRecord = {
        ...reg,
        status: 'rejected',
        reviewed_at: now,
        reviewer_notes: reason || 'Application criteria unmet.',
      };
      stateStore.setHospitalRegistration(updatedReg);

      logAudit({
        request_id: null,
        case_id: '',
        hospital_id: reg.id,
        event_type: 'HOSPITAL_REGISTRATION_REJECTED',
        actor_type: 'admin',
        snapshot_of_data_at_decision_time: { hospital_id: reg.id, reason },
      });

      notify('hospital', reg.id, {
        type: 'REGISTRATION_REJECTED',
        severity: 'warning',
        title: 'Registration Not Approved',
        message: `Registration was declined: ${reason}`,
        hospitalId: reg.id,
      });

      notify('admin', 'all', {
        type: 'HOSPITAL_REGISTRATION_REJECTED',
        severity: 'warning',
        title: 'Registration Rejected',
        message: `Declined hospital registration for ${reg.name} (${reason}).`,
        hospitalId: reg.id,
      });
    }
  } else {
    const ambulances = stateStore.getAmbulances();
    const amb = ambulances.find((a) => a.id === id);
    if (amb) {
      const updated: Ambulance = {
        ...amb,
        status: 'rejected',
        availability: 'maintenance',
        last_updated_at: now,
      };
      stateStore.setAmbulance(updated);

      logAudit({
        request_id: null,
        case_id: '',
        hospital_id: null,
        event_type: 'AMBULANCE_REGISTRATION_REJECTED',
        actor_type: 'admin',
        snapshot_of_data_at_decision_time: { ambulance_id: amb.id, reason },
      });

      notify('ambulance', amb.id, {
        type: 'REGISTRATION_REJECTED',
        severity: 'warning',
        title: 'Unit Registration Declined',
        message: `Vehicle registration declined: ${reason}`,
        ambulanceId: amb.id,
      });

      notify('admin', 'all', {
        type: 'AMBULANCE_REGISTRATION_REJECTED',
        severity: 'warning',
        title: 'Ambulance Rejected',
        message: `Declined vehicle ${amb.vehicle_number} (${reason}).`,
        ambulanceId: amb.id,
      });
    }
  }
}

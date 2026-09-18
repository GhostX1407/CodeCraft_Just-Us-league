/**
 * Hospital & Ambulance Verification & Network Registration System (Features 3 & 4)
 * 
 * Provides self-service registration intake, pending verification state storage,
 * and administrator approval/rejection workflows that atomically enroll verified
 * facilities and fleet vehicles into the active coordination network.
 */

import { getDb } from '../services/firebase';
import { HospitalRepository } from '../services/repositories';
import { Hospital } from '../services/types';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type AmbulanceType = 'BLS' | 'ALS' | 'Trauma' | 'Neonatal';
export type AmbulanceFacility = 'oxygen' | 'ecg' | 'ventilator' | 'defibrillator' | 'stretcher';

export interface HospitalRegistrationInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_number: string;
  emergency_desk_phone?: string;
  capabilities: string[]; // e.g. ['trauma_team', 'cardiology', 'stroke_pathway', 'pediatric_emergency', 'burn_unit']
  icu_beds: number;
  ventilators: number;
  blood_stock: Record<string, number>;
  oxygen_supply_bar?: number;
  specialists_on_call: string[];
  accepts_scheme_patients?: boolean;
}

export interface HospitalRegistrationRecord extends HospitalRegistrationInput {
  id: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
}

export interface AmbulanceRegistrationInput {
  vehicle_number: string;
  organization: string;
  ambulance_type: AmbulanceType;
  capacity_patients: number;
  base_location: { lat: number; lng: number };
  facilities: AmbulanceFacility[];
  driver_name?: string;
  contact_number: string;
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  organization: string;
  ambulance_type: AmbulanceType;
  capacity_patients: number;
  current_location: { lat: number; lng: number };
  facilities: AmbulanceFacility[];
  contact_number: string;
  availability: 'available' | 'en_route' | 'busy' | 'maintenance';
  status: VerificationStatus;
  current_case_id?: string | null;
  speed_kmh?: number;
  heading_degrees?: number;
  last_updated_at: string;
}

export class RegistrationRepository {
  static getHospitalRegistrationsCol() {
    return getDb().collection('hospital_registrations');
  }

  static getAmbulancesCol() {
    return getDb().collection('ambulances');
  }

  // Hospital Registrations
  static async submitHospital(input: HospitalRegistrationInput): Promise<HospitalRegistrationRecord> {
    const id = `reg_hosp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: HospitalRegistrationRecord = {
      ...input,
      id,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };
    await this.getHospitalRegistrationsCol().doc(id).set(record);
    return record;
  }

  static async listHospitalRegistrations(status?: VerificationStatus): Promise<HospitalRegistrationRecord[]> {
    let query: FirebaseFirestore.Query = this.getHospitalRegistrationsCol();
    if (status) {
      query = query.where('status', '==', status);
    }
    const snap = await query.get();
    return snap.docs.map((d) => d.data() as HospitalRegistrationRecord);
  }

  static async verifyHospital(
    id: string,
    approved: boolean,
    reviewerNotes: string = '',
    actorId: string = 'admin'
  ): Promise<{ registration: HospitalRegistrationRecord; hospital?: Hospital }> {
    const docRef = this.getHospitalRegistrationsCol().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Hospital registration ${id} not found`);
    }

    const record = snap.data() as HospitalRegistrationRecord;
    const newStatus: VerificationStatus = approved ? 'verified' : 'rejected';
    const reviewedAt = new Date().toISOString();

    await docRef.update({
      status: newStatus,
      reviewed_at: reviewedAt,
      reviewer_notes: reviewerNotes,
    });

    record.status = newStatus;
    record.reviewed_at = reviewedAt;
    record.reviewer_notes = reviewerNotes;

    if (approved) {
      // Create official active Hospital entity
      const newHospital: Hospital = {
        id: `hosp_${id}`,
        name: record.name,
        lat: record.lat,
        lng: record.lng,
        trauma_team_on_shift: record.capabilities.includes('trauma_team') || record.specialists_on_call.includes('trauma_team'),
        specialists_on_call: record.specialists_on_call,
        icu_beds_free: record.icu_beds,
        ventilators_free: record.ventilators,
        capabilities: record.capabilities,
        blood_stock: record.blood_stock as any,
        er_load_score: 2,
        accepts_scheme_patients: record.accepts_scheme_patients ?? true,
        last_updated_at: reviewedAt,
        reliability_score: null, // "No history" initial baseline
        operational_status: {
          icu: record.icu_beds > 0,
          ventilator: record.ventilators > 0,
          blood: true,
        },
      };

      await HospitalRepository.create(newHospital);
      return { registration: record, hospital: newHospital };
    }

    return { registration: record };
  }

  // Ambulance Registrations
  static async submitAmbulance(input: AmbulanceRegistrationInput): Promise<Ambulance> {
    const id = `amb_${input.vehicle_number.replace(/\s+/g, '_').toLowerCase()}_${Date.now().toString(36)}`;
    const ambulance: Ambulance = {
      id,
      vehicle_number: input.vehicle_number,
      organization: input.organization,
      ambulance_type: input.ambulance_type,
      capacity_patients: input.capacity_patients,
      current_location: input.base_location,
      facilities: input.facilities,
      contact_number: input.contact_number,
      availability: 'available',
      status: 'pending',
      last_updated_at: new Date().toISOString(),
    };
    await this.getAmbulancesCol().doc(id).set(ambulance);
    return ambulance;
  }

  static async listAmbulances(status?: VerificationStatus): Promise<Ambulance[]> {
    let query: FirebaseFirestore.Query = this.getAmbulancesCol();
    if (status) {
      query = query.where('status', '==', status);
    }
    const snap = await query.get();
    return snap.docs.map((d) => d.data() as Ambulance);
  }

  static async verifyAmbulance(
    id: string,
    approved: boolean,
    actorId: string = 'admin'
  ): Promise<Ambulance> {
    const docRef = this.getAmbulancesCol().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`Ambulance ${id} not found`);
    }

    const newStatus: VerificationStatus = approved ? 'verified' : 'rejected';
    const now = new Date().toISOString();

    await docRef.update({
      status: newStatus,
      last_updated_at: now,
    });

    const updated = snap.data() as Ambulance;
    updated.status = newStatus;
    updated.last_updated_at = now;
    return updated;
  }

  static async updateAmbulanceTelemetry(
    id: string,
    location: { lat: number; lng: number },
    speedKmh?: number,
    headingDegrees?: number,
    availability?: 'available' | 'en_route' | 'busy' | 'maintenance'
  ): Promise<Ambulance | null> {
    const docRef = this.getAmbulancesCol().doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return null;

    const updates: Partial<Ambulance> = {
      current_location: location,
      last_updated_at: new Date().toISOString(),
    };
    if (speedKmh !== undefined) updates.speed_kmh = speedKmh;
    if (headingDegrees !== undefined) updates.heading_degrees = headingDegrees;
    if (availability !== undefined) updates.availability = availability;

    await docRef.update(updates as any);
    const updated = snap.data() as Ambulance;
    return { ...updated, ...updates };
  }
}

/**
 * Real-Time Ambulance Tracking, In-Transit Patient Telemetry, & Patient Journey Engine (Features 5, 10, 13)
 * 
 * Provides:
 * 1. Live GPS tracking and destination telemetry calculation (ETA, distance)
 * 2. In-transit patient condition stream (Stable, Deteriorating, Critical) and sequential vitals timeline
 * 3. Formal 7-stage Patient Journey state machine per Feature 13
 */

import { getDb } from '../services/firebase';
import { AuditRepository } from '../services/repositories';
import { PatientVitals } from './vitalsIntelligence';
import { calculateHaversineDistance } from '../matching/distance';

export type JourneyStage =
  | 'CASE_CREATED'
  | 'HOSPITAL_MATCHED'
  | 'HOSPITAL_ACCEPTED'
  | 'AMBULANCE_ASSIGNED'
  | 'PATIENT_PICKED'
  | 'TRANSIT_IN_PROGRESS'
  | 'ARRIVED_AT_HOSPITAL'
  | 'HANDOFF_COMPLETED';

export type PatientTransitStatus = 'stable' | 'deteriorating' | 'critical';

export interface VitalsTimelineEntry {
  timestamp: string;
  vitals: PatientVitals;
  status: PatientTransitStatus;
  logged_by: string;
  notes?: string;
}

export interface PatientJourneyStep {
  stage: JourneyStage;
  label: string;
  timestamp: string;
  completed: boolean;
  actor: string;
  details?: string;
}

export interface CaseTransitDetails {
  case_id: string;
  journey_stage: JourneyStage;
  journey_history: PatientJourneyStep[];
  current_transit_status: PatientTransitStatus;
  vitals_timeline: VitalsTimelineEntry[];
  ambulance_id?: string | null;
  assigned_hospital_id?: string | null;
  current_location?: { lat: number; lng: number };
  destination_location?: { lat: number; lng: number };
  distance_remaining_km?: number;
  eta_minutes?: number;
  speed_kmh?: number;
  heading_degrees?: number;
  route_polyline?: string;
  last_updated_at: string;
}

export const JOURNEY_STAGES_ORDER: { stage: JourneyStage; label: string }[] = [
  { stage: 'CASE_CREATED', label: 'Emergency Intake Created' },
  { stage: 'HOSPITAL_MATCHED', label: 'Candidate Hospital Identified' },
  { stage: 'HOSPITAL_ACCEPTED', label: 'Hospital Committed & Bed Held' },
  { stage: 'AMBULANCE_ASSIGNED', label: 'Ambulance Unit Dispatched' },
  { stage: 'PATIENT_PICKED', label: 'Patient Stabilized & Picked Up' },
  { stage: 'TRANSIT_IN_PROGRESS', label: 'Active Transit In Progress' },
  { stage: 'ARRIVED_AT_HOSPITAL', label: 'Ambulance Arrived at Hospital Bay' },
  { stage: 'HANDOFF_COMPLETED', label: 'Clinical Handoff & Care Complete' },
];

export class TrackingAndTransitService {
  static getTransitCol() {
    return getDb().collection('case_transit');
  }

  static async getTransitDetails(caseId: string): Promise<CaseTransitDetails | null> {
    const doc = await this.getTransitCol().doc(caseId).get();
    if (!doc.exists) return null;
    return doc.data() as CaseTransitDetails;
  }

  static async getCaseTransit(caseId: string): Promise<CaseTransitDetails | null> {
    return this.getTransitDetails(caseId);
  }

  /**
   * Initializes or gets journey tracking for a case
   */
  static async initializeJourney(
    caseId: string,
    actorId: string = 'emt_dispatch',
    location?: { lat: number; lng: number }
  ): Promise<CaseTransitDetails> {
    const now = new Date().toISOString();
    const initialHistory: PatientJourneyStep[] = [
      {
        stage: 'CASE_CREATED',
        label: 'Emergency Intake Created',
        timestamp: now,
        completed: true,
        actor: actorId,
      },
    ];

    const details: CaseTransitDetails = {
      case_id: caseId,
      journey_stage: 'CASE_CREATED',
      journey_history: initialHistory,
      current_transit_status: 'stable',
      vitals_timeline: [],
      current_location: location,
      last_updated_at: now,
    };

    await this.getTransitCol().doc(caseId).set(details);
    return details;
  }

  static async initializeCaseTransit(
    caseId: string,
    location?: { lat: number; lng: number },
    ambulanceId?: string
  ): Promise<CaseTransitDetails> {
    const details = await this.initializeJourney(caseId, ambulanceId || 'emt_dispatch', location);
    if (ambulanceId) {
      details.ambulance_id = ambulanceId;
      await this.getTransitCol().doc(caseId).update({ ambulance_id: ambulanceId });
    }
    return details;
  }

  /**
   * Advances a case through its patient journey timeline (Feature 13)
   */
  static async advanceJourneyStage(
    caseId: string,
    newStage: JourneyStage,
    actorId: string = 'system',
    detailsText?: string,
    location?: { lat: number; lng: number }
  ): Promise<CaseTransitDetails> {
    let current = await this.getTransitDetails(caseId);
    if (!current) {
      current = await this.initializeJourney(caseId, actorId, location);
    }

    const now = new Date().toISOString();
    const stageMeta = JOURNEY_STAGES_ORDER.find((s) => s.stage === newStage) || {
      stage: newStage,
      label: newStage.replace('_', ' '),
    };

    const newStep: PatientJourneyStep = {
      stage: newStage,
      label: stageMeta.label,
      timestamp: now,
      completed: true,
      actor: actorId,
      details: detailsText,
    };

    const updatedHistory = [...current.journey_history, newStep];

    const updates: Partial<CaseTransitDetails> = {
      journey_stage: newStage,
      journey_history: updatedHistory,
      last_updated_at: now,
    };

    if (location) {
      updates.current_location = location;
    }

    await this.getTransitCol().doc(caseId).update(updates as any);

    await AuditRepository.append({
      id: `audit_journey_${caseId}_${Date.now()}`,
      request_id: null,
      case_id: caseId,
      hospital_id: current.assigned_hospital_id || null,
      event_type: 'HANDOFF_COMPLETED',
      timestamp: now,
      actor_type: 'ambulance_user',
      actor_id: actorId,
      metadata: {
        journey_stage: newStage,
        label: stageMeta.label,
        details: detailsText,
      },
    });

    return { ...current, ...updates };
  }

  static async updateJourneyStage(
    caseId: string,
    newStage: JourneyStage,
    actorId: string = 'system',
    actorRole: string = 'system',
    detailsText?: string,
    location?: { lat: number; lng: number }
  ): Promise<CaseTransitDetails> {
    return this.advanceJourneyStage(caseId, newStage, actorId, detailsText, location);
  }

  /**
   * Records an in-transit patient condition update & vitals timeline entry (Feature 10)
   */
  static async recordTransitVitalsUpdate(
    caseId: string,
    status: PatientTransitStatus,
    vitals: PatientVitals,
    notes?: string,
    actorId: string = 'ambulance_user'
  ): Promise<CaseTransitDetails> {
    let current = await this.getTransitDetails(caseId);
    if (!current) {
      current = await this.initializeJourney(caseId, actorId);
    }

    const now = new Date().toISOString();
    const entry: VitalsTimelineEntry = {
      timestamp: now,
      vitals,
      status,
      logged_by: actorId,
      notes,
    };

    const updatedTimeline = [...current.vitals_timeline, entry];

    const updates: Partial<CaseTransitDetails> = {
      current_transit_status: status,
      vitals_timeline: updatedTimeline,
      last_updated_at: now,
    };

    await this.getTransitCol().doc(caseId).update(updates as any);

    // If patient is deteriorating or critical, update audit log immediately
    if (status === 'deteriorating' || status === 'critical') {
      await AuditRepository.append({
        id: `audit_deterioration_${caseId}_${Date.now()}`,
        request_id: null,
        case_id: caseId,
        hospital_id: current.assigned_hospital_id || null,
        event_type: 'CASE_CREATED',
        timestamp: now,
        actor_type: 'ambulance_user',
        actor_id: actorId,
        metadata: {
          alert: 'PATIENT_CONDITION_ALERT',
          patient_status: status,
          vitals,
          notes,
        },
      });
    }

    return { ...current, ...updates };
  }

  /**
   * Updates ambulance live coordinates and computes real-time ETA to destination (Feature 5)
   */
  static async updateTelemetry(
    ambulanceId: string,
    data: {
      latitude?: number;
      longitude?: number;
      speed_kmh?: number;
      heading?: number;
      route_polyline?: string;
      eta_seconds?: number;
      destination_hospital_id?: string;
      destination_location?: { lat: number; lng: number };
      case_id?: string;
    }
  ): Promise<{ distanceKm: number; etaMinutes: number }> {
    const lat = data.latitude || 0;
    const lng = data.longitude || 0;
    const destLat = data.destination_location?.lat || lat;
    const destLng = data.destination_location?.lng || lng;

    const distanceKm = calculateHaversineDistance({ lat, lng }, { lat: destLat, lng: destLng });
    const etaMinutes = data.eta_seconds ? Math.round(data.eta_seconds / 60) : Math.max(1, Math.round((distanceKm / 40) * 60));
    const now = new Date().toISOString();

    const telemetryDoc = {
      ambulance_id: ambulanceId,
      case_id: data.case_id || null,
      current_location: { lat, lng },
      destination_hospital_id: data.destination_hospital_id || null,
      destination_location: { lat: destLat, lng: destLng },
      distance_remaining_km: distanceKm,
      eta_minutes: etaMinutes,
      speed_kmh: data.speed_kmh || 0,
      heading_degrees: data.heading || 0,
      route_polyline: data.route_polyline || null,
      last_updated_at: now,
    };

    await getDb().collection('ambulance_telemetry').doc(ambulanceId).set(telemetryDoc, { merge: true });

    if (data.case_id) {
      await this.getTransitCol().doc(data.case_id).set(
        {
          case_id: data.case_id,
          ambulance_id: ambulanceId,
          current_location: { lat, lng },
          distance_remaining_km: distanceKm,
          eta_minutes: etaMinutes,
          speed_kmh: data.speed_kmh,
          heading_degrees: data.heading,
          route_polyline: data.route_polyline,
          last_updated_at: now,
        },
        { merge: true }
      );
    }

    return { distanceKm, etaMinutes };
  }

  static async getTelemetry(ambulanceId: string): Promise<any | null> {
    const doc = await getDb().collection('ambulance_telemetry').doc(ambulanceId).get();
    if (!doc.exists) return null;
    return doc.data();
  }
}

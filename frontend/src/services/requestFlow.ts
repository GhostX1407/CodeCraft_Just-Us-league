import { api } from './api';
import { notify, logAudit } from './notificationBus';
import { stateStore } from './stateStore';
import type { Actor, Request } from '../types/domain';

/**
 * High-level orchestration for dispatching an ambulance request with instant notifications.
 */
export async function sendEmergencyDispatch(
  caseId: string,
  targetHospitalId: string,
  actor: Actor
) {
  const hospitals = stateStore.getHospitals();
  const hosp = hospitals.find((h) => h.id === targetHospitalId);
  const hospitalName = hosp ? hosp.name : targetHospitalId;

  // 1. Call API matchCase with target override
  const result = await api.matchCase(caseId, actor, targetHospitalId);

  // 2. Direct notifications
  notify('hospital', targetHospitalId, {
    type: 'EMERGENCY_REQUEST_INCOMING',
    severity: 'critical',
    title: 'New Emergency Patient Dispatched',
    message: `Incoming trauma/emergency intake dispatched to ${hospitalName}. Case ${caseId}. Respond within 30s.`,
    caseId,
    hospitalId: targetHospitalId,
  });

  notify('admin', 'all', {
    type: 'DISPATCH_INITIATED',
    severity: 'urgent',
    title: 'Emergency Request Sent',
    message: `Ambulance unit ${actor.actor_id} dispatched request to ${hospitalName} for Case ${caseId}.`,
    caseId,
    hospitalId: targetHospitalId,
  });

  return result;
}

/**
 * Hospital confirms and locks patient admission.
 */
export async function acceptEmergencyAdmission(
  requestId: string,
  hospitalId: string,
  reason: string = 'Capacity confirmed, bed reserved'
) {
  const req = stateStore.getRequest(requestId);
  const hospitals = stateStore.getHospitals();
  const hosp = hospitals.find((h) => h.id === hospitalId);
  const hospitalName = hosp ? hosp.name : hospitalId;

  const result = await api.acceptRequest(requestId, {
    actor_type: 'hospital',
    actor_id: hospitalId,
  });

  notify('ambulance', 'all', {
    type: 'ADMISSION_CONFIRMED',
    severity: 'critical',
    title: 'Hospital Accepted • Destination Locked',
    message: `${hospitalName} ACCEPTED Case ${req?.case_id || ''}. 1 ICU bed held. Proceed directly to Emergency Bay.`,
    caseId: req?.case_id,
    hospitalId,
  });

  notify('admin', 'all', {
    type: 'ADMISSION_CONFIRMED',
    severity: 'info',
    title: 'Admission Accepted',
    message: `${hospitalName} accepted patient intake for Case ${req?.case_id || ''}.`,
    caseId: req?.case_id,
    hospitalId,
  });

  return result;
}

/**
 * Hospital declines intake and triggers rerouting.
 */
export async function declineEmergencyAdmission(
  requestId: string,
  hospitalId: string,
  reason: string
) {
  const req = stateStore.getRequest(requestId);
  const hospitals = stateStore.getHospitals();
  const hosp = hospitals.find((h) => h.id === hospitalId);
  const hospitalName = hosp ? hosp.name : hospitalId;

  const result = await api.rejectRequest(
    requestId,
    reason,
    { actor_type: 'hospital', actor_id: hospitalId }
  );

  notify('ambulance', 'all', {
    type: 'ADMISSION_DECLINED',
    severity: 'warning',
    title: 'Hospital Declined • Rerouting',
    message: `${hospitalName} declined (${reason}). Rerouting engine triggered for Case ${req?.case_id || ''}.`,
    caseId: req?.case_id,
    hospitalId,
  });

  notify('admin', 'all', {
    type: 'ADMISSION_DECLINED',
    severity: 'warning',
    title: 'Intake Declined',
    message: `${hospitalName} declined Case ${req?.case_id || ''}: ${reason}.`,
    caseId: req?.case_id,
    hospitalId,
  });

  return result;
}

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCase, useCaseRequests, useHospitals } from '../../hooks/useSubscriptions';
import { api, evaluateHospitalMatch } from '../../services/api';
import { stateStore } from '../../services/stateStore';
import { CommitmentCircuit } from '../../components/domain/CommitmentCircuit';
import { MatchCard } from '../../components/domain/MatchCard';
import { Countdown } from '../../components/domain/Countdown';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { LoadingState } from '../../components/feedback/LoadingState';
import { RadianceMap } from '../Admin/RadianceMap';
import { JourneyStage, PatientTransitStatus, CaseTransitDetails } from '../../types/domain';
import {
  PhoneCall,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Navigation,
  Activity,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Compass,
  Radio,
  Send,
  HeartPulse,
  AlertOctagon,
  Truck,
  UserCheck,
  MapPin,
  Flame,
} from 'lucide-react';
import clsx from 'clsx';

const JOURNEY_STAGES: { stage: JourneyStage; label: string; short: string; description: string }[] = [
  { stage: 'CASE_CREATED', label: 'Case Created', short: 'Created', description: 'Emergency intake logged' },
  { stage: 'HOSPITAL_MATCHED', label: 'Hospital Matched', short: 'Matched', description: 'Optimal facility identified' },
  { stage: 'HOSPITAL_ACCEPTED', label: 'Capacity Held', short: 'Committed', description: 'Bed & surgical team reserved' },
  { stage: 'AMBULANCE_ASSIGNED', label: 'Ambulance Dispatched', short: 'Dispatched', description: 'Unit responding' },
  { stage: 'PATIENT_PICKED', label: 'Patient Picked Up', short: 'Onboarded', description: 'Paramedic has secured patient' },
  { stage: 'TRANSIT_IN_PROGRESS', label: 'In Transit', short: 'En Route', description: 'Sirens active to facility' },
  { stage: 'ARRIVED_AT_HOSPITAL', label: 'Arrived at Facility', short: 'Arrived', description: 'In emergency triage bay' },
  { stage: 'HANDOFF_COMPLETED', label: 'Clinical Handoff Done', short: 'Handoff', description: 'Patient transferred to ER team' },
];

export const ActiveCasePage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const { data: caseDataObj } = useCase(caseId);
  const { data: requests } = useCaseRequests(caseId);
  const { data: allHospitals } = useHospitals();

  const [expandedRanked, setExpandedRanked] = useState(false);
  const [supersedeLoading, setSupersedeLoading] = useState(false);

  // Journey & Transit State
  const [transitDetails, setTransitDetails] = useState<CaseTransitDetails | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionStatus, setConditionStatus] = useState<PatientTransitStatus>('stable');
  const [notes, setNotes] = useState('');
  const [submittingCondition, setSubmittingCondition] = useState(false);
  const [vitalsUpdate, setVitalsUpdate] = useState({
    heart_rate: 88,
    bp_sys: 122,
    bp_dia: 78,
    spo2: 98,
    respiratory_rate: 16,
    gcs: 15,
  });

  // Telemetry HUD state
  const [telemetry, setTelemetry] = useState({
    speedKmh: 48,
    heading: 'NW (315°)',
    headingDegrees: 315,
    distanceKm: 3.8,
    etaMinutes: 7,
    lastPing: new Date().toLocaleTimeString(),
  });

  const c = caseDataObj?.case;
  const routing = caseDataObj?.routing;

  // Active or latest request
  const activeRequest = requests.length > 0 ? requests[requests.length - 1] : null;
  const targetHospital = activeRequest
    ? allHospitals.find((h) => h.id === activeRequest.hospital_id)
    : null;

  // Load journey and transit details on mount and state changes
  useEffect(() => {
    if (!caseId) return;
    const loadTransit = async () => {
      const details = await api.getCaseJourney(caseId);
      if (details) {
        setTransitDetails(details);
        setConditionStatus(details.current_transit_status || 'stable');
      } else {
        // Initialize default if not yet created
        const initTransit = stateStore.advanceJourneyStage(
          caseId,
          activeRequest?.status === 'accepted' ? 'HOSPITAL_ACCEPTED' : 'HOSPITAL_MATCHED',
          'Paramedic Crew 04'
        );
        setTransitDetails(initTransit);
      }
    };
    loadTransit();

    const unsub = stateStore.subscribe(() => {
      const stored = stateStore.getTransit(caseId);
      if (stored) setTransitDetails(stored);
    });
    return unsub;
  }, [caseId, activeRequest?.status]);

  // Fallback state when all hospitals in credibility list are exhausted
  if (routing?.status === 'exhausted' || (c && routing && !routing.active_request_id && !routing.accepted_hospital_id && routing.attempt_number && routing.attempt_number > 1)) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#2D231C] p-4 sm:p-8 max-w-4xl mx-auto flex items-center justify-center">
        <div className="p-8 sm:p-10 bg-white border-2 border-[#E11D48] rounded-3xl shadow-xl space-y-6 text-center w-full animate-fade-in">
          <div className="w-16 h-16 bg-[#FFE4E6] text-[#E11D48] rounded-full flex items-center justify-center mx-auto animate-pulse shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-block px-3 py-1 bg-[#FFE4E6] text-[#BE123C] rounded-full font-mono text-xs font-bold uppercase tracking-wider border border-[#FECDD3]">
              Dispatch Routing Exhausted
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#2D231C]">
              No Hospital Available
            </h1>
            <p className="text-sm font-mono text-[#7D7067] max-w-lg mx-auto leading-relaxed">
              All ranked hospital candidates in the regional credibility network have either timed out or declined Case {c?.id || caseId}. The priority dispatch queue is exhausted.
            </p>
          </div>
          <div className="p-4 bg-[#FFF7ED] border border-[#EA580C]/30 rounded-2xl text-xs font-mono text-[#C2410C] font-bold max-w-lg mx-auto">
            Emergency Action: Contact Regional Emergency Dispatch Coordinator immediately for manual override or secondary district diversion.
          </div>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              to="/ambulance"
              className="px-6 py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white font-mono text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Ambulance Terminal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!c || !routing || !activeRequest || !targetHospital) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#FAF8F5] text-[#2D231C] p-8 max-w-5xl mx-auto flex items-center justify-center">
        <LoadingState label="Synchronizing case telemetry and routing vectors…" variant="circuit" />
      </div>
    );
  }

  // Candidate rankings for collapsed queue
  const candidates = allHospitals
    .map((h) => evaluateHospitalMatch(h, c))
    .sort((a, b) => b.final_score - a.final_score)
    .filter((cand) => cand.hospital_id !== activeRequest.hospital_id);

  // Trigger Mid-Transit Reroute Demonstration
  const handleSimulateMidTransitCollapse = async () => {
    if (!caseId) return;
    setSupersedeLoading(true);
    await api.triggerSupersededReroute(caseId);
    setSupersedeLoading(false);
  };

  // Step advancement handler
  const handleAdvanceStage = async (targetStage?: JourneyStage) => {
    if (!caseId) return;
    const currentStage = transitDetails?.journey_stage || 'HOSPITAL_MATCHED';
    const currentIndex = JOURNEY_STAGES.findIndex((s) => s.stage === currentStage);
    const nextStage = targetStage || JOURNEY_STAGES[Math.min(currentIndex + 1, JOURNEY_STAGES.length - 1)].stage;

    const res = await api.advanceJourneyStage(caseId, nextStage, 'Ambulance Unit AMB-04 Paramedic', `Transitioned to ${nextStage}`);
    if (res?.transit_details) {
      setTransitDetails(res.transit_details);
    } else {
      const updated = stateStore.getTransit(caseId);
      if (updated) setTransitDetails(updated);
    }
  };

  // Telemetry ping simulation
  const handleSimulateTelemetryPing = async () => {
    const newSpeed = Math.floor(45 + Math.random() * 25);
    const newDistance = Math.max(0.2, +(telemetry.distanceKm - 0.4).toFixed(1));
    const newEta = Math.max(1, Math.ceil((newDistance / (newSpeed || 40)) * 60));

    setTelemetry({
      speedKmh: newSpeed,
      heading: 'NW (320°)',
      headingDegrees: 320,
      distanceKm: newDistance,
      etaMinutes: newEta,
      lastPing: new Date().toLocaleTimeString(),
    });

    await api.updateAmbulanceTelemetry('amb_als_04', {
      latitude: c.ambulance_location.lat + 0.005,
      longitude: c.ambulance_location.lng + 0.005,
      speed_kmh: newSpeed,
      heading: 320,
      eta_seconds: newEta * 60,
    });
  };

  // Log in-transit patient update
  const handleLogConditionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setSubmittingCondition(true);

    await api.recordTransitCondition(caseId, {
      condition: conditionStatus,
      vitals: vitalsUpdate,
      notes: notes || `In-transit condition reported as ${conditionStatus.toUpperCase()}`,
    });

    // Also notify if critical or deteriorating
    if (conditionStatus === 'critical' || conditionStatus === 'deteriorating') {
      stateStore.addNotification({
        id: 'flash_' + Math.random().toString(36).substring(2, 9),
        recipientRole: 'hospital',
        recipientId: targetHospital.id,
        type: 'PATIENT_DETERIORATING',
        caseId: c.id,
        title: `CRITICAL FLASH ALERT: Inbound Patient Deteriorating`,
        message: `Unit AMB-04 inbound to ${targetHospital.name}: Patient condition marked ${conditionStatus.toUpperCase()}. SpO2: ${vitalsUpdate.spo2}%, HR: ${vitalsUpdate.heart_rate} bpm. Trauma Bay standby required!`,
        timestamp: new Date().toISOString(),
        read: false,
        severity: 'urgent',
      });
    }

    setSubmittingCondition(false);
    setShowConditionModal(false);
    setNotes('');
  };

  const isAccepted = activeRequest.status === 'accepted';
  const isPending = activeRequest.status === 'pending';
  const isSuperseded = activeRequest.status === 'superseded';
  const isExhausted = (routing.status as string) === 'exhausted';

  const currentStage = transitDetails?.journey_stage || (isAccepted ? 'HOSPITAL_ACCEPTED' : 'HOSPITAL_MATCHED');
  const currentStageIndex = JOURNEY_STAGES.findIndex((s) => s.stage === currentStage);
  const nextStageItem = JOURNEY_STAGES[currentStageIndex + 1];

  return (
    <div className="min-h-[calc(100vh-64px)] text-[#2D231C] p-4 sm:p-8 font-sans select-none relative z-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
          <div className="flex items-center gap-3">
            <Link
              to="/ambulance"
              className="text-xs font-mono text-[#7D7067] font-bold hover:text-[#2D231C] flex items-center gap-1.5 border border-[#E8E2D9] px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#EA580C]" />
              <span>Back to Dispatch Terminal</span>
            </Link>
            <div>
              <div className="text-xs font-mono text-[#EA580C] uppercase tracking-wider font-extrabold flex items-center gap-2">
                <span>Active Transit Telemetry</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                <span className="text-[#52796F] font-bold">Unit AMB-04 (ALS)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-black text-[#2D231C] tracking-tight">
                Case {c.id} • {c.patient_basic_info.age}y {c.patient_basic_info.sex}
                {c.subcategory && (
                  <span className="ml-2 text-xs font-mono bg-[#FFF7ED] text-[#EA580C] px-2.5 py-1 rounded-full border border-[#EA580C]/30 align-middle">
                    {c.subcategory.replace(/_/g, ' ')}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-[#2D231C] font-bold bg-white px-3 py-1.5 rounded-full border border-[#E8E2D9] shadow-xs">
              Attempt {activeRequest.attempt_number} of {allHospitals.length}
            </span>
            <StatusBadge status={activeRequest.status} size="md" />
          </div>
        </div>

        {/* 7-STAGE PATIENT JOURNEY STEPPER */}
        <div className="p-5 sm:p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#EA580C]" />
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#2D231C]">
                7-Stage Emergency Patient Journey Tracker
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#7D7067]">Current:</span>
              <span className="text-xs font-mono font-black text-[#EA580C] bg-[#FFF7ED] px-2.5 py-0.5 rounded-full border border-[#EA580C]/30">
                {JOURNEY_STAGES[currentStageIndex]?.label || currentStage}
              </span>
            </div>
          </div>

          {/* Stepper visual dots and connections */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-2">
            {JOURNEY_STAGES.map((step, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;

              return (
                <div
                  key={step.stage}
                  onClick={() => handleAdvanceStage(step.stage)}
                  title={`Click to set stage to: ${step.label}`}
                  className={clsx(
                    'p-2.5 rounded-2xl border text-center transition-all cursor-pointer select-none',
                    isCurrent && 'bg-[#FFF7ED] border-[#EA580C] shadow-sm ring-2 ring-[#EA580C]/20',
                    isCompleted && 'bg-[#EFF6F3] border-[#52796F]/40 text-[#354F52]',
                    isUpcoming && 'bg-[#FAF8F5] border-[#E8E2D9] opacity-60 hover:opacity-100 hover:border-[#EA580C]/40'
                  )}
                >
                  <div className="flex items-center justify-center mb-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-[#52796F]" />
                    ) : isCurrent ? (
                      <span className="w-4 h-4 rounded-full bg-[#EA580C] text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-[#E8E2D9] text-[#7D7067] text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-display font-black leading-tight truncate">
                    {step.short}
                  </div>
                  <div className="text-[9px] font-mono text-[#7D7067] leading-tight truncate mt-0.5">
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advance Step Action Button */}
          {nextStageItem && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E2D9]">
              <span className="text-xs font-mono text-[#7D7067]">
                Next Milestone: <b className="text-[#2D231C] font-bold">{nextStageItem.label}</b> ({nextStageItem.description})
              </span>
              <button
                type="button"
                onClick={() => handleAdvanceStage()}
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <span>Advance to: {nextStageItem.label}</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}
        </div>

        {/* LIVE AMBULANCE TELEMETRY HUD */}
        <div className="p-5 sm:p-6 rounded-3xl border border-[#E8E2D9] bg-gradient-to-r from-white via-white to-[#FFF7ED]/30 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-[#EA580C] animate-pulse" />
              <span className="text-xs font-mono font-black uppercase tracking-wider text-[#2D231C]">
                Live Dynamic Telemetry & Heading HUD
              </span>
              <span className="text-[10px] font-mono bg-[#EFF6F3] text-[#354F52] px-2 py-0.5 rounded-full border border-[#52796F]/30 font-bold">
                STREAM CONNECTED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSimulateTelemetryPing}
                className="text-xs font-mono text-[#EA580C] bg-white hover:bg-[#FFF7ED] border border-[#EA580C]/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Simulate GPS Ping</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConditionModal(true)}
                className={clsx(
                  'text-xs font-mono text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all',
                  conditionStatus === 'critical' ? 'bg-[#E11D48] hover:bg-[#BE123C] animate-pulse' :
                  conditionStatus === 'deteriorating' ? 'bg-[#D97706] hover:bg-[#B45309]' :
                  'bg-[#52796F] hover:bg-[#354F52]'
                )}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Log In-Transit Condition</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] text-[#7D7067] uppercase font-bold">Ground Speed</span>
              <div className="text-xl font-black text-[#2D231C] mt-0.5 flex items-baseline gap-1">
                <span>{telemetry.speedKmh}</span>
                <span className="text-xs text-[#7D7067] font-semibold">km/h</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] text-[#7D7067] uppercase font-bold">Compass Bearing</span>
              <div className="text-base font-black text-[#EA580C] mt-1 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>{telemetry.heading}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] text-[#7D7067] uppercase font-bold">Distance Remaining</span>
              <div className="text-xl font-black text-[#2D231C] mt-0.5 flex items-baseline gap-1">
                <span>{telemetry.distanceKm}</span>
                <span className="text-xs text-[#7D7067] font-semibold">km</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9] shadow-xs">
              <span className="text-[10px] text-[#7D7067] uppercase font-bold">Dynamic ETA</span>
              <div className="text-xl font-black text-[#52796F] mt-0.5 flex items-baseline gap-1">
                <span>{telemetry.etaMinutes}</span>
                <span className="text-xs text-[#7D7067] font-semibold">mins</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9] shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#7D7067] uppercase font-bold">Patient Condition</span>
              <div className="mt-1">
                <span
                  className={clsx(
                    'text-xs font-black px-2.5 py-1 rounded-full uppercase inline-block border',
                    conditionStatus === 'critical' ? 'bg-[#FFE4E6] text-[#E11D48] border-[#FECDD3]' :
                    conditionStatus === 'deteriorating' ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' :
                    'bg-[#EFF6F3] text-[#354F52] border-[#52796F]/30'
                  )}
                >
                  {conditionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Flash alert banner if patient is deteriorating or critical */}
          {conditionStatus !== 'stable' && (
            <div className={clsx(
              'p-3.5 rounded-2xl border flex items-center gap-3 text-xs font-mono animate-fade-in',
              conditionStatus === 'critical' ? 'bg-[#FFE4E6] border-[#FECDD3] text-[#9F1239]' :
              'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
            )}>
              <AlertOctagon className="w-5 h-5 shrink-0 text-[#E11D48]" />
              <div className="space-y-0.5">
                <div className="font-black uppercase tracking-wider">
                  FLASH ALERT: Receiving facility notified of patient {conditionStatus.toUpperCase()} status
                </div>
                <div className="text-[11px] font-medium opacity-90">
                  {targetHospital.name} triage and surgical trauma teams have been put on high-alert standby.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MID-TRANSIT SUPERSEDED PRIORITY BANNER */}
        {isSuperseded && (
          <div className="p-4 bg-[#FEF3C7] border border-[#D97706]/50 rounded-2xl animate-fade-in text-xs font-mono text-[#B45309] space-y-1 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-[#B45309]">
              <AlertTriangle className="w-5 h-5 text-[#E11D48]" />
              <span>DESTINATION CHANGED MID-TRANSIT</span>
            </div>
            <p className="text-xs text-[#7D7067] font-sans font-medium leading-relaxed">
              {targetHospital.name} capability collapsed en route. Raahi proactively rerouted without driver intervention to preserve commitment safety.
            </p>
          </div>
        )}

        {/* AUTOMATIC REROUTE NARRATION */}
        {activeRequest.attempt_number > 1 && isPending && (
          <div className="p-4 bg-[#FFF7ED] border border-[#EA580C]/40 rounded-2xl animate-fade-in text-xs font-mono text-[#C2410C] font-bold flex items-center gap-3 shadow-xs">
            <RotateCcw className="w-5 h-5 shrink-0 animate-spin text-[#EA580C]" style={{ animationDuration: '4s' }} />
            <span>
              Previous facility declined or reached response deadline. Automatically rerouted to next ranked capability match.
            </span>
          </div>
        )}

        {/* 2-Column Responsive Web Application Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Routing State, Circuits & Decision Cards (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* SIGNATURE COMMITMENT CIRCUIT METAPHOR */}
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-[#7D7067] pb-2 border-b border-[#E8E2D9]">
                <span className="uppercase tracking-wider font-extrabold text-[#2D231C]">Commitment Circuit State</span>
                <span className="capitalize font-extrabold text-[#EA580C]">{activeRequest.status}</span>
              </div>
              <CommitmentCircuit
                from={{ label: 'Unit AMB-04' }}
                to={{ label: targetHospital.name }}
                status={activeRequest.status}
                freshness={targetHospital.last_updated_at ? 'fresh' : 'unknown'}
                attemptNumber={activeRequest.attempt_number}
              />
            </div>

            {/* COUNTDOWN BAR */}
            {isPending && (
              <div className="p-5 rounded-2xl border border-[#E8E2D9] bg-white shadow-xs">
                <Countdown
                  expiresAt={activeRequest.expires_at}
                  variant="bar"
                  label={`Awaiting confirmation commitment from ${targetHospital.name}`}
                  onExpire={() => {
                    if (activeRequest.status === 'pending') {
                      api.timeoutRequest(activeRequest.id);
                    }
                  }}
                />
              </div>
            )}

            {/* CASE OUTCOME: ACCEPTED COMMITMENT */}
            {isAccepted && (
              <div className="p-6 sm:p-8 rounded-3xl border-2 border-[#52796F] bg-[#EFF6F3]/25 shadow-sm space-y-6 animate-scale-settle relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#52796F] animate-pulse" />
                    <span className="font-mono text-xs uppercase tracking-wider font-extrabold text-[#354F52]">
                      Hospital Accepted • Confirmed Destination Locked
                    </span>
                  </div>
                  <span className="text-xs font-mono bg-[#EFF6F3] text-[#354F52] px-3 py-1 rounded-full font-black border border-[#52796F]/40">
                    STATUS: ACCEPTED
                  </span>
                </div>

                <div>
                  <div className="text-xs font-mono text-[#354F52] font-black uppercase tracking-wider mb-1 flex items-center gap-2">
                    <span>Hospital:</span>
                    <span className="text-base font-display font-black text-[#2D231C] underline decoration-[#52796F]">
                      {targetHospital.name}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-[#2D231C] leading-tight tracking-tight mt-1">
                    {activeRequest.reason_shown_to_dispatcher || `${targetHospital.name} Confirmed Commitment`}
                  </h2>
                  <p className="text-xs text-[#7D7067] font-mono font-bold mt-2">
                    Hospital reception staff explicitly committed to receive this patient in real time.
                  </p>
                </div>

                {/* Destination Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
                    <span className="text-[#7D7067] text-[10px] font-bold uppercase">ICU Beds</span>
                    <div className="font-extrabold text-[#52796F] mt-0.5">1 Reserved</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
                    <span className="text-[#7D7067] text-[10px] font-bold uppercase">Ventilators</span>
                    <div className="font-extrabold text-[#2D231C] mt-0.5">{targetHospital.ventilators_free} available</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
                    <span className="text-[#7D7067] text-[10px] font-bold uppercase">Trauma Team</span>
                    <div className="font-extrabold text-[#2D231C] mt-0.5">
                      {targetHospital.trauma_team_on_shift ? 'ON SHIFT' : 'STANDBY'}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-[#E8E2D9] shadow-xs">
                    <span className="text-[#7D7067] text-[10px] font-bold uppercase">ER Load</span>
                    <div className="font-extrabold text-[#2D231C] mt-0.5">{targetHospital.er_load_score}/5 Score</div>
                  </div>
                </div>

                {/* Direct Contact Button */}
                <div className="pt-2">
                  <a
                    href={`tel:${targetHospital.contact_number || '+917926850101'}`}
                    className="w-full py-4 px-6 bg-[#52796F] hover:bg-[#354F52] text-white font-display font-black rounded-2xl flex items-center justify-center gap-2.5 text-base shadow-md shadow-[#52796F]/25 transition-all select-none active:scale-[0.99] btn-tactile"
                  >
                    <PhoneCall className="w-5 h-5 text-white" />
                    <span>Contact Hospital Reception ({targetHospital.contact_number || '+91 79 2685 0101'})</span>
                  </a>
                </div>

                {/* Mid-Transit Collapse Simulator Button */}
                <div className="pt-3 border-t border-[#52796F]/30 flex items-center justify-between">
                  <span className="text-xs text-[#7D7067] font-mono font-bold">
                    Hackathon Demo Scenario F:
                  </span>
                  <button
                    type="button"
                    disabled={supersedeLoading}
                    onClick={handleSimulateMidTransitCollapse}
                    className="py-2 px-4 rounded-xl border border-[#E8E2D9] bg-white text-[#2D231C] hover:bg-[#FAF8F5] text-xs font-mono font-bold flex items-center gap-2 transition-colors active:scale-95 shadow-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
                    <span>Simulate Mid-Transit Capability Collapse</span>
                  </button>
                </div>
              </div>
            )}

            {/* IN-TRANSIT VITALS & CONDITION UPDATE HISTORY */}
            {transitDetails && transitDetails.vitals_timeline && transitDetails.vitals_timeline.length > 0 && (
              <div className="p-5 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]">
                  <span className="text-xs font-mono font-black uppercase text-[#2D231C]">
                    Recorded In-Transit Clinical Timeline ({transitDetails.vitals_timeline.length})
                  </span>
                  <span className="text-[10px] font-mono text-[#7D7067]">Chronological</span>
                </div>
                <div className="space-y-2.5">
                  {transitDetails.vitals_timeline.map((update, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] text-xs font-mono space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-black uppercase border',
                          update.status === 'critical' ? 'bg-[#FFE4E6] text-[#E11D48] border-[#FECDD3]' :
                          update.status === 'deteriorating' ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' :
                          'bg-[#EFF6F3] text-[#354F52] border-[#52796F]/30'
                        )}>
                          {update.status}
                        </span>
                        <span className="text-[10px] text-[#7D7067]">
                          {new Date(update.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[11px] pt-1">
                        <div>HR: <b>{update.vitals?.heart_rate ?? '-'}</b></div>
                        <div>BP: <b>{update.vitals?.blood_pressure_sys ?? '-'}/{update.vitals?.blood_pressure_dia ?? '-'}</b></div>
                        <div>SpO2: <b>{update.vitals?.spo2 ?? '-'}%</b></div>
                        <div>GCS: <b>{update.vitals?.gcs_score ?? '-'}</b></div>
                      </div>
                      {update.notes && (
                        <div className="text-[11px] text-[#7D7067] italic pt-1 border-t border-[#E8E2D9]/60">
                          "{update.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRIMARY MATCH CARD (When Pending) */}
            {!isAccepted && (
              <MatchCard
                hospital={targetHospital}
                matchResult={{
                  hospital_id: targetHospital.id,
                  rank: activeRequest.attempt_number,
                  capability_match_pct: activeRequest.match_score_breakdown.capability_match_pct,
                  distance_km: activeRequest.match_score_breakdown.distance_km,
                  distance_factor: activeRequest.match_score_breakdown.distance_factor,
                  load_factor: activeRequest.match_score_breakdown.load_factor,
                  staleness_factor: activeRequest.match_score_breakdown.staleness_factor,
                  final_score: activeRequest.match_score_breakdown.final_score,
                  eligibility: { eligible: true, reason: null },
                  freshness: {
                    status: 'fresh',
                    last_updated_at: targetHospital.last_updated_at,
                  },
                  reasons: [activeRequest.reason_shown_to_dispatcher],
                }}
                status={activeRequest.status}
              />
            )}

            {/* COLLAPSED NEXT-IN-LINE QUEUE */}
            {!isAccepted && candidates.length > 0 && (
              <div className="border border-[#E8E2D9] rounded-2xl bg-white p-5 text-xs font-mono shadow-xs">
                <button
                  type="button"
                  onClick={() => setExpandedRanked(!expandedRanked)}
                  className="w-full flex items-center justify-between text-[#7D7067] hover:text-[#2D231C] transition-colors"
                >
                  <span className="font-extrabold text-[#2D231C]">
                    Next in line if {targetHospital.name} does not respond ({candidates.length} candidates)
                  </span>
                  {expandedRanked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedRanked && (
                  <div className="mt-3 space-y-2 pt-3 border-t border-[#E8E2D9] animate-fade-in">
                    {candidates.map((cand, idx) => {
                      const hosp = allHospitals.find((h) => h.id === cand.hospital_id);
                      if (!hosp) return null;
                      return (
                        <div
                          key={cand.hospital_id}
                          className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#2D231C]">{hosp.name}</div>
                            <div className="text-[#7D7067] text-[11px] font-medium">
                              {cand.distance_km} km away • ER Load {hosp.er_load_score}/5 • Match Score: {cand.final_score}
                            </div>
                          </div>
                          <span className="text-[#EA580C] font-mono font-extrabold">Rank #{idx + 2}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EXHAUSTED STATE */}
            {isExhausted && (
              <div className="p-6 rounded-2xl border border-[#E11D48]/40 bg-[#FFE4E6]/25 text-center space-y-3">
                <h3 className="text-lg font-black text-[#E11D48]">
                  No Remaining Hospital Meets This Case Requirements
                </h3>
                <p className="text-xs text-[#7D7067] font-medium leading-relaxed">
                  All regional facilities were queried and declined or lacked required capacities. Manual clinical director override required.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Spatial Routing Map (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#EA580C]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#2D231C] font-black">
                    Spatial Route & Facility Vector
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#354F52] font-bold bg-[#EFF6F3] px-2.5 py-0.5 rounded-full border border-[#52796F]/40">
                  GPS Active • Leaflet
                </span>
              </div>

              <RadianceMap
                hospitals={allHospitals}
                activeRequest={activeRequest}
                activeCase={c}
                className="h-[360px] rounded-2xl border border-[#E8E2D9] shadow-inner"
              />

              {/* Patient Vitals Summary Card */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-[#7D7067] font-bold text-[10px] uppercase">
                  <span>Vitals Snapshot</span>
                  <span>Onset: {c.onset_time}</span>
                </div>
                <div className="text-[#2D231C] font-bold">{c.vitals_summary}</div>
                {c.vitals && (
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 text-[#2D231C]">
                    <div>HR: <b>{c.vitals.heart_rate}</b></div>
                    <div>BP: <b>{c.vitals.blood_pressure_sys}/{c.vitals.blood_pressure_dia}</b></div>
                    <div>SpO2: <b>{c.vitals.spo2}%</b></div>
                  </div>
                )}
                <div className="text-[#7D7067] font-medium text-[11px] pt-1.5 border-t border-[#E8E2D9]">
                  Treatment: {c.treatment_administered}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-mono">
                <Link
                  to={`/track/${c.id}`}
                  className="text-[#EA580C] hover:underline flex items-center gap-1.5 font-bold"
                >
                  <HeartHandshake className="w-4 h-4 text-[#EA580C]" />
                  <span>Open Family Tracker View ↗</span>
                </Link>
                <span className="text-[11px] text-[#7D7067] font-mono font-bold">ID: {c.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOG IN-TRANSIT CONDITION MODAL */}
        {showConditionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D231C]/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#E8E2D9] shadow-2xl space-y-5 animate-scale-settle">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div className="flex items-center gap-2.5">
                  <HeartPulse className="w-5 h-5 text-[#EA580C]" />
                  <h3 className="font-display font-black text-lg text-[#2D231C]">
                    Log In-Transit Condition Update
                  </h3>
                </div>
                <button
                  onClick={() => setShowConditionModal(false)}
                  className="text-[#7D7067] hover:text-[#2D231C] text-sm font-mono font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleLogConditionUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#7D7067] uppercase mb-1.5">
                    Patient Trend Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['stable', 'deteriorating', 'critical'] as PatientTransitStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setConditionStatus(st)}
                        className={clsx(
                          'p-3 rounded-2xl border text-xs font-mono font-black uppercase transition-all',
                          conditionStatus === st && st === 'stable' && 'bg-[#EFF6F3] border-[#52796F] text-[#354F52] ring-2 ring-[#52796F]/30',
                          conditionStatus === st && st === 'deteriorating' && 'bg-[#FEF3C7] border-[#D97706] text-[#B45309] ring-2 ring-[#D97706]/30',
                          conditionStatus === st && st === 'critical' && 'bg-[#FFE4E6] border-[#E11D48] text-[#E11D48] ring-2 ring-[#E11D48]/30',
                          conditionStatus !== st && 'bg-white border-[#E8E2D9] text-[#7D7067]'
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-[#7D7067] mb-1">Heart Rate</label>
                    <input
                      type="number"
                      value={vitalsUpdate.heart_rate}
                      onChange={(e) => setVitalsUpdate({ ...vitalsUpdate, heart_rate: +e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-[#7D7067] mb-1">BP Sys/Dia</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={vitalsUpdate.bp_sys}
                        onChange={(e) => setVitalsUpdate({ ...vitalsUpdate, bp_sys: +e.target.value })}
                        className="w-1/2 p-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        value={vitalsUpdate.bp_dia}
                        onChange={(e) => setVitalsUpdate({ ...vitalsUpdate, bp_dia: +e.target.value })}
                        className="w-1/2 p-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-[#7D7067] mb-1">SpO2 %</label>
                    <input
                      type="number"
                      value={vitalsUpdate.spo2}
                      onChange={(e) => setVitalsUpdate({ ...vitalsUpdate, spo2: +e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#7D7067] uppercase mb-1">
                    Paramedic Clinical Observations
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Oxygen cannula placed at 4L/min, IV access secured, pupil response intact..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-[#E8E2D9] text-xs font-mono font-medium focus:ring-2 focus:ring-[#EA580C] outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConditionModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold text-[#7D7067]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCondition}
                    className="px-5 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Update</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

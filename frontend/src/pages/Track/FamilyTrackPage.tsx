import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCase, useCaseRequests, useHospitals } from '../../hooks/useSubscriptions';
import { estimateEtaMinutes } from '../../utils/geo';
import { stateStore } from '../../services/stateStore';
import { api } from '../../services/api';
import { JourneyStage, CaseTransitDetails } from '../../types/domain';
import {
  HeartHandshake,
  ShieldCheck,
  Clock,
  ArrowLeft,
  CheckCircle2,
  PhoneCall,
  MapPin,
  Truck,
  HeartPulse,
} from 'lucide-react';
import clsx from 'clsx';

const FAMILY_JOURNEY_STAGES: { stage: JourneyStage; label: string; explanation: string }[] = [
  { stage: 'CASE_CREATED', label: 'Intake Logged', explanation: 'Emergency dispatch request created' },
  { stage: 'HOSPITAL_MATCHED', label: 'Facility Identified', explanation: 'Optimal emergency hospital selected' },
  { stage: 'HOSPITAL_ACCEPTED', label: 'Bed & Care Committed', explanation: 'Specialists and bed reserved' },
  { stage: 'AMBULANCE_ASSIGNED', label: 'Ambulance Dispatched', explanation: 'Paramedic team assigned to unit' },
  { stage: 'PATIENT_PICKED', label: 'Patient In Ambulance', explanation: 'Paramedics actively caring for patient' },
  { stage: 'TRANSIT_IN_PROGRESS', label: 'En Route to Hospital', explanation: 'Priority transit with continuous care' },
  { stage: 'ARRIVED_AT_HOSPITAL', label: 'Arrived at Care Bay', explanation: 'Ambulance reached hospital emergency bay' },
  { stage: 'HANDOFF_COMPLETED', label: 'Under Hospital Care', explanation: 'Clinical handoff complete to ER team' },
];

export const FamilyTrackPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();

  const { data: caseObj } = useCase(caseId);
  const { data: requests } = useCaseRequests(caseId);
  const { data: hospitals } = useHospitals();

  const [transit, setTransit] = useState<CaseTransitDetails | null>(null);

  const c = caseObj?.case;
  const activeRequest = requests.length > 0 ? requests[requests.length - 1] : null;
  const hospital = activeRequest ? hospitals.find((h) => h.id === activeRequest.hospital_id) : null;

  useEffect(() => {
    if (!caseId) return;
    const fetchTransit = async () => {
      const t = await api.getCaseJourney(caseId);
      if (t) setTransit(t);
    };
    fetchTransit();

    const unsub = stateStore.subscribe(() => {
      const stored = stateStore.getTransit(caseId);
      if (stored) setTransit(stored);
    });
    return unsub;
  }, [caseId]);

  const isCommitted = activeRequest?.status === 'accepted';
  const etaMinutes = transit?.eta_minutes ?? (activeRequest ? estimateEtaMinutes(activeRequest.match_score_breakdown.distance_km) : 8);

  const currentStage: JourneyStage = transit?.journey_stage || (isCommitted ? 'HOSPITAL_ACCEPTED' : 'HOSPITAL_MATCHED');
  const currentStageIndex = FAMILY_JOURNEY_STAGES.findIndex((s) => s.stage === currentStage);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D231C] p-4 sm:p-8 md:p-12 font-sans select-none flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Simple top back header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D9]">
          <Link
            to="/"
            className="text-xs font-mono font-bold text-[#7D7067] hover:text-[#EA580C] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Raahi Home</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#C2410C]">
            <HeartHandshake className="w-4 h-4 text-[#EA580C]" />
            <span>Family Reassurance Update</span>
          </div>
        </div>

        {/* Clean Reassurance Card on Light Paper Ground */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.06)] border border-[#E8E2D9] space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] flex items-center justify-center text-[#EA580C] shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono text-[#C2410C] uppercase tracking-wider font-black">
                Verified Emergency Transport Status
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#2D231C]">
                Patient {caseId || 'R-1042'}
              </h1>
            </div>
          </div>

          {/* Plain, Honest Reassurance Sentence */}
          <div className="p-6 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] text-base sm:text-lg text-[#4A3E36] leading-relaxed font-medium shadow-inner">
            {isCommitted && hospital ? (
              <span>
                Your loved one (Patient <b className="font-black text-[#2D231C]">{caseId || 'R-1042'}</b>) is being taken directly to{' '}
                <b className="font-black text-[#2D231C]">{hospital.name}</b>. The hospital has explicitly confirmed capacity and emergency surgical/ICU staff are prepared. Estimated arrival:{' '}
                <b className="font-black text-[#52796F]">{etaMinutes} minutes</b>.
              </span>
            ) : hospital ? (
              <span>
                Ambulance is actively coordinating priority routing for Patient{' '}
                <b className="font-black text-[#2D231C]">{caseId || 'R-1042'}</b>. Priority request dispatched to{' '}
                <b className="font-black text-[#2D231C]">{hospital.name}</b> and awaiting direct reception confirmation.
              </span>
            ) : (
              <span>
                Emergency transport is active for Patient{' '}
                <b className="font-black text-[#2D231C]">{caseId || 'R-1042'}</b>. The automated coordination system is confirming regional trauma capacity.
              </span>
            )}
          </div>

          {/* 7-STAGE REASSURING JOURNEY TRACKER */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-wider font-black text-[#2D231C] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#EA580C]" />
                <span>Patient Care Progression</span>
              </span>
              <span className="font-bold text-[#EA580C] bg-[#FFF7ED] px-2.5 py-0.5 rounded-full border border-[#EA580C]/30">
                {FAMILY_JOURNEY_STAGES[currentStageIndex]?.label || currentStage}
              </span>
            </div>

            <div className="space-y-2">
              {FAMILY_JOURNEY_STAGES.map((step, idx) => {
                const isCompleted = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const isUpcoming = idx > currentStageIndex;

                return (
                  <div
                    key={step.stage}
                    className={clsx(
                      'p-3 rounded-2xl border text-xs font-mono flex items-center justify-between transition-all',
                      isCurrent && 'bg-[#FFF7ED] border-[#EA580C] shadow-xs',
                      isCompleted && 'bg-[#EFF6F3] border-[#52796F]/30 text-[#354F52]',
                      isUpcoming && 'bg-white border-[#E8E2D9] opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#52796F] shrink-0" />
                      ) : isCurrent ? (
                        <span className="w-4 h-4 rounded-full bg-[#EA580C] text-white text-[10px] font-black flex items-center justify-center animate-pulse shrink-0">
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-[#E8E2D9] text-[#7D7067] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <div>
                        <div className="font-black text-[#2D231C]">{step.label}</div>
                        <div className="text-[11px] text-[#7D7067]">{step.explanation}</div>
                      </div>
                    </div>

                    {isCompleted && (
                      <span className="text-[10px] font-black text-[#52796F] uppercase">Completed</span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-black text-[#EA580C] uppercase animate-pulse">In Progress</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hospital Contact details if committed */}
          {hospital && (
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-[#7D7067] uppercase font-bold">Receiving Facility</div>
                  <div className="font-display font-black text-sm text-[#2D231C]">{hospital.name}</div>
                </div>
                {hospital.contact_number && (
                  <a
                    href={`tel:${hospital.contact_number}`}
                    className="px-3 py-1.5 bg-[#52796F] hover:bg-[#354F52] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Emergency Dept</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-[#7D7067] font-mono font-semibold pt-1">
            <Clock className="w-4 h-4 text-[#EA580C]" />
            <span>Live status synchronized via verified ambulance and hospital network telemetry.</span>
          </div>
        </div>

        <div className="text-center text-xs text-[#7D7067] font-mono font-bold">
          Raahi Emergency Coordination Network • Verified Patient Care
        </div>
      </div>
    </div>
  );
};

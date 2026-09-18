import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useHospital, useHospitalQueue, useCase } from '../../hooks/useSubscriptions';
import { api } from '../../services/api';
import { stateStore } from '../../services/stateStore';
import { RequestCard } from '../../components/domain/RequestCard';
import { HospitalCapabilityPanel } from '../../components/domain/HospitalCapabilityPanel';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { LoadingState } from '../../components/feedback/LoadingState';
import { playAlertSound } from '../../utils/sound';
import { CaseTransitDetails, JourneyStage, AppNotification } from '../../types/domain';
import {
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Volume2,
  Radio,
  Truck,
  AlertOctagon,
  HeartPulse,
  Navigation,
  UserCheck,
  Activity,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';

export const HospitalConsolePage: React.FC = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();

  const { data: hospital } = useHospital(hospitalId);
  const { data: pendingRequests } = useHospitalQueue(hospitalId);

  // Active request to show on takeover
  const activeRequest = pendingRequests.length > 0 ? pendingRequests[0] : null;
  const { data: caseObj } = useCase(activeRequest?.case_id);

  // Inbound transit data
  const [inboundTransits, setInboundTransits] = useState<{
    caseId: string;
    transit: CaseTransitDetails;
    caseData: any;
    ambulanceUnit: string;
  }[]>([]);

  // Flash alert state
  const [flashAlert, setFlashAlert] = useState<{
    caseId: string;
    condition: string;
    message: string;
    timestamp: string;
  } | null>(null);

  // Track accepted state for prep checklist
  const [acceptedCases, setAcceptedCases] = useState<
    {
      requestId: string;
      caseId: string;
      items: { label: string; done: boolean }[];
    }[]
  >([]);

  // Sound trigger on new pending request arrival
  const prevPendingCount = useRef(0);
  useEffect(() => {
    if (pendingRequests.length > prevPendingCount.current) {
      playAlertSound();
    }
    prevPendingCount.current = pendingRequests.length;
  }, [pendingRequests.length]);

  // Sync inbound transits and notifications for this hospital
  const refreshHospitalData = () => {
    if (!hospitalId) return;
    const allRequests = stateStore.getRequests();
    const acceptedForHospital = allRequests.filter(
      (r) => r.hospital_id === hospitalId && (r.status === 'accepted' || r.status === 'pending')
    );

    const transitsList: {
      caseId: string;
      transit: CaseTransitDetails;
      caseData: any;
      ambulanceUnit: string;
    }[] = [];

    for (const req of acceptedForHospital) {
      const c = stateStore.getCase(req.case_id);
      let t = stateStore.getTransit(req.case_id);
      if (!t && c) {
        // initialize transit if not present
        t = {
          case_id: req.case_id,
          journey_stage: req.status === 'accepted' ? 'HOSPITAL_ACCEPTED' : 'HOSPITAL_MATCHED',
          journey_history: [
            {
              stage: 'CASE_CREATED',
              label: 'Case Created',
              timestamp: new Date().toISOString(),
              completed: true,
              actor: 'system',
            },
          ],
          current_transit_status: 'stable',
          vitals_timeline: [],
          distance_remaining_km: req.match_score_breakdown.distance_km,
          eta_minutes: Math.ceil(req.match_score_breakdown.distance_km * 2),
          speed_kmh: 45,
          heading_degrees: 315,
          last_updated_at: new Date().toISOString(),
        };
      }
      if (t && c) {
        transitsList.push({
          caseId: req.case_id,
          transit: t,
          caseData: c,
          ambulanceUnit: 'Unit AMB-04 (ALS)',
        });
      }
    }

    setInboundTransits(transitsList);

    // Check for patient deterioration alerts
    const notifs = stateStore.getNotifications('hospital', hospitalId);
    const detNotif = notifs.find(
      (n) => n.type === 'PATIENT_DETERIORATING' && !n.read
    );

    if (detNotif) {
      setFlashAlert({
        caseId: detNotif.caseId || 'Unknown',
        condition: 'CRITICAL',
        message: detNotif.message,
        timestamp: detNotif.timestamp,
      });
    } else {
      // Check transits directly
      const criticalTransit = transitsList.find(
        (it) => it.transit.current_transit_status === 'critical' || it.transit.current_transit_status === 'deteriorating'
      );
      if (criticalTransit) {
        setFlashAlert({
          caseId: criticalTransit.caseId,
          condition: criticalTransit.transit.current_transit_status.toUpperCase(),
          message: `Inbound patient on ${criticalTransit.ambulanceUnit} has trended to ${criticalTransit.transit.current_transit_status.toUpperCase()}. Trauma bay resuscitation readiness required.`,
          timestamp: criticalTransit.transit.last_updated_at,
        });
      }
    }
  };

  useEffect(() => {
    refreshHospitalData();
    const unsub = stateStore.subscribe(refreshHospitalData);
    return unsub;
  }, [hospitalId, pendingRequests.length]);

  if (!hospital) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#2D231C] p-8 max-w-4xl mx-auto flex items-center justify-center">
        <LoadingState label="Connecting to hospital telemetry…" />
      </div>
    );
  }

  // Handle Accept
  const handleAccept = async (requestId: string) => {
    const res = await api.acceptRequest(requestId, {
      actor_type: 'hospital',
      actor_id: hospital.id,
    });

    if (res.success && caseObj?.case) {
      const need = caseObj.case.need_profile;
      const prepItems = [
        ...need.specialists_needed.map((s) => ({
          label: `Alert on-call ${s.replace(/_/g, ' ')} for immediate trauma/ER bay reception`,
          done: false,
        })),
        ...need.capability_flags.map((f) => ({
          label: `Sterilize & reserve ${f.replace(/_/g, ' ')} unit / bed`,
          done: false,
        })),
      ];

      if (need.blood_type_needed) {
        prepItems.push({
          label: `Crossmatch & reserve 2 units of ${need.blood_type_needed} blood from blood bank`,
          done: false,
        });
      }

      setAcceptedCases((prev) => [
        {
          requestId,
          caseId: caseObj.case!.id,
          items: prepItems,
        },
        ...prev,
      ]);

      // Automatically advance journey stage to committed
      api.advanceJourneyStage(caseObj.case.id, 'HOSPITAL_ACCEPTED', `${hospital.name} Reception Staff`, 'Bed & team confirmed');
      refreshHospitalData();
    }
  };

  // Handle Reject
  const handleReject = async (requestId: string, reason: string) => {
    await api.rejectRequest(requestId, reason, {
      actor_type: 'hospital',
      actor_id: hospital.id,
    });
    refreshHospitalData();
  };

  const toggleChecklistItem = (caseId: string, itemIdx: number) => {
    setAcceptedCases((prev) =>
      prev.map((c) => {
        if (c.caseId !== caseId) return c;
        const newItems = [...c.items];
        newItems[itemIdx].done = !newItems[itemIdx].done;
        return { ...c, items: newItems };
      })
    );
  };

  // Confirm arrival or complete handoff
  const handleAdvanceHandoff = async (caseId: string, targetStage: JourneyStage) => {
    await api.advanceJourneyStage(caseId, targetStage, `${hospital.name} ER Staff`, `Confirmed ${targetStage} at ER reception`);
    refreshHospitalData();
  };

  return (
    <div className="min-h-screen text-[#2D231C] p-4 sm:p-8 md:p-10 font-sans select-none relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Masthead Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8E2D9] bg-white/90 backdrop-blur-xl sticky top-0 z-30 pt-2 stagger-1">
          <div className="flex items-center gap-4">
            <Link
              to="/hospital"
              className="text-xs font-mono font-bold text-[#7D7067] hover:text-[#EA580C] flex items-center gap-1.5 border border-[#E8E2D9] px-3 py-1.5 rounded-xl bg-white transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Switch Hospital</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#C2410C] font-black uppercase tracking-wider">
                  Facility Reception Console
                </span>
                <span className="text-xs font-mono font-bold text-[#7D7067]">[{hospital.id}]</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-[#2D231C] tracking-tight">
                {hospital.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FreshnessBadge lastUpdatedAt={hospital.last_updated_at} />
            <button
              onClick={() => playAlertSound()}
              className="p-2.5 rounded-xl border border-[#E8E2D9] bg-white text-[#7D7067] hover:text-[#EA580C] transition-colors shadow-xs"
              title="Test alert sound chime"
            >
              <Volume2 className="w-4 h-4 text-[#EA580C]" />
            </button>
          </div>
        </div>

        {/* HIGH-PRIORITY CLINICAL FLASH ALERT (PATIENT IN-TRANSIT DETERIORATION) */}
        {flashAlert && (
          <div className="p-5 rounded-3xl bg-[#FFE4E6] border-2 border-[#E11D48] text-[#9F1239] animate-fade-in shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-mono text-xs font-black uppercase tracking-wider text-[#E11D48]">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
                <span>CLINICAL FLASH ALERT: Inbound Patient Deteriorating Mid-Transit</span>
              </div>
              <button
                onClick={() => setFlashAlert(null)}
                className="text-xs font-mono text-[#E11D48] hover:underline font-bold"
              >
                Dismiss Alert ✕
              </button>
            </div>
            <p className="text-sm font-sans font-bold leading-relaxed text-[#2D231C]">
              {flashAlert.message}
            </p>
            <div className="flex items-center gap-3 text-xs font-mono text-[#E11D48] font-semibold pt-1">
              <span>Case: <b>{flashAlert.caseId}</b></span>
              <span>•</span>
              <span>Timestamp: {new Date(flashAlert.timestamp).toLocaleTimeString()}</span>
              <span>•</span>
              <span className="font-bold underline">Trauma Resuscitation Team Alerted</span>
            </div>
          </div>
        )}

        {/* INCOMING REQUEST TAKEOVER ALARM */}
        {activeRequest && caseObj?.case && (
          <div className="space-y-4 animate-fade-in stagger-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-[#E11D48] font-black flex items-center gap-2 bg-[#FFE4E6] px-3.5 py-1.5 rounded-full border border-[#FECDD3]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse" />
                <span>INCOMING EMERGENCY TRANSPORT TAKEOVER — ACTION REQUIRED</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#2D231C] bg-white px-3 py-1 rounded-full border border-[#E8E2D9] shadow-xs">
                Queue: {pendingRequests.length} pending
              </span>
            </div>

            <RequestCard
              request={activeRequest}
              caseData={caseObj.case}
              hospital={hospital}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </div>
        )}

        {/* INCOMING AMBULANCE RADAR & CLINICAL HANDOFF SUITE */}
        {inboundTransits.length > 0 && (
          <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#EA580C] animate-pulse" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-[#2D231C]">
                  Incoming Ambulance Radar & Handoff Queue ({inboundTransits.length} Inbound)
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#354F52] bg-[#EFF6F3] px-2.5 py-0.5 rounded-full border border-[#52796F]/30 font-bold">
                RADAR ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inboundTransits.map(({ caseId, transit, caseData, ambulanceUnit }) => {
                const stage = transit.journey_stage;
                const isArrived = stage === 'ARRIVED_AT_HOSPITAL';
                const isCompleted = stage === 'HANDOFF_COMPLETED';

                return (
                  <div
                    key={caseId}
                    className={clsx(
                      'p-5 rounded-2xl border space-y-3.5 transition-all shadow-xs',
                      isCompleted ? 'bg-[#FAF8F5] border-[#E8E2D9] opacity-80' :
                      isArrived ? 'bg-[#EFF6F3] border-[#52796F]/40 ring-2 ring-[#52796F]/20' :
                      'bg-white border-[#E8E2D9]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#EA580C]" />
                        <span className="font-mono text-xs font-black text-[#2D231C]">{ambulanceUnit}</span>
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border',
                          transit.current_transit_status === 'critical' ? 'bg-[#FFE4E6] text-[#E11D48] border-[#FECDD3]' :
                          transit.current_transit_status === 'deteriorating' ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' :
                          'bg-[#EFF6F3] text-[#354F52] border-[#52796F]/30'
                        )}
                      >
                        {transit.current_transit_status}
                      </span>
                    </div>

                    <div>
                      <div className="font-display font-black text-sm text-[#2D231C]">
                        Case {caseId} • {caseData.patient_basic_info.age}y {caseData.patient_basic_info.sex}
                      </div>
                      <div className="text-xs font-mono text-[#7D7067] mt-0.5">
                        Category: <b className="text-[#2D231C] uppercase">{caseData.category}</b>
                        {caseData.subcategory && ` (${caseData.subcategory.replace(/_/g, ' ')})`}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E2D9]">
                      <div>
                        <span className="text-[9px] text-[#7D7067] uppercase font-bold block">Dynamic ETA</span>
                        <span className="font-black text-[#52796F]">{transit.eta_minutes ?? 6} mins</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#7D7067] uppercase font-bold block">Distance</span>
                        <span className="font-black text-[#2D231C]">{transit.distance_remaining_km ?? 3.4} km</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#7D7067] uppercase font-bold block">Speed</span>
                        <span className="font-black text-[#EA580C]">{transit.speed_kmh ?? 48} km/h</span>
                      </div>
                    </div>

                    {/* Stage transition buttons */}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-[#7D7067]">
                        Stage: <b className="text-[#2D231C]">{stage.replace(/_/g, ' ')}</b>
                      </span>

                      {!isCompleted && !isArrived && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceHandoff(caseId, 'ARRIVED_AT_HOSPITAL')}
                          className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm ER Arrival</span>
                        </button>
                      )}

                      {isArrived && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceHandoff(caseId, 'HANDOFF_COMPLETED')}
                          className="px-3 py-1.5 bg-[#52796F] hover:bg-[#354F52] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Complete Clinical Handoff</span>
                        </button>
                      )}

                      {isCompleted && (
                        <span className="text-xs font-mono font-black text-[#52796F] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Handoff Verified</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* POST-DECISION: COMMITTED PREPARATION CHECKLISTS */}
        {acceptedCases.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#52796F] font-black">
              <CheckCircle2 className="w-4 h-4 text-[#52796F]" />
              <span>Active Committed Patient Reception Checklists</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {acceptedCases.map((ac) => (
                <div
                  key={ac.caseId}
                  className="p-6 rounded-3xl border border-[#52796F]/30 bg-[#F0FDFA] space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#52796F]/20 pb-3">
                    <span className="font-mono text-xs font-black text-[#354F52] uppercase">
                      Incoming Case {ac.caseId}
                    </span>
                    <span className="text-[10px] font-mono bg-[#EFF6F3] text-[#354F52] px-2.5 py-0.5 rounded-full font-black border border-[#52796F]/30">
                      COMMITMENT HELD
                    </span>
                  </div>

                  <p className="text-xs text-[#7D7067] font-mono font-semibold">
                    Operational prep actions derived from patient need profile:
                  </p>

                  <div className="space-y-2 pt-1">
                    {ac.items.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleChecklistItem(ac.caseId, idx)}
                        className={clsx(
                          'p-3 rounded-xl border text-xs font-mono flex items-start gap-3 cursor-pointer transition-all duration-180 select-none active:scale-[0.99]',
                          item.done
                            ? 'border-[#52796F]/30 bg-[#EFF6F3]/30 text-[#7D7067] font-medium line-through'
                            : 'border-[#E8E2D9] bg-white text-[#2D231C] font-bold hover:border-[#EA580C]'
                        )}
                      >
                        {item.done ? (
                          <CheckSquare className="w-4 h-4 text-[#52796F] shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-[#A89F97] shrink-0 mt-0.5" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALM DEFAULT CONSOLE: TELEMETRY & CAPABILITY PANEL */}
        {!activeRequest && inboundTransits.length === 0 && (
          <div className="p-6 rounded-2xl border border-[#E8E2D9] bg-white text-center py-8 text-[#7D7067] font-mono text-xs flex items-center justify-center gap-2.5 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
            <span className="text-sm font-sans font-bold text-[#7D7067]">Console Idle • No incoming emergency dispatches pending confirmation</span>
          </div>
        )}

        {/* EDITABLE CAPABILITY PANEL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#7D7067] font-black">
              Live Facility Capacity Management (Self-Reporting)
            </span>
            <span className="text-[11px] font-mono font-bold text-[#EA580C]">
              Modifications immediately recalculate regional network ranks
            </span>
          </div>

          <HospitalCapabilityPanel hospital={hospital} editable={true} />
        </div>
      </div>
    </div>
  );
};

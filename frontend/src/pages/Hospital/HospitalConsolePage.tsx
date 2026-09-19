import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useHospital, useHospitals, useActiveRequests, useCase } from '../../hooks/useSubscriptions';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { stateStore } from '../../services/stateStore';
import { RequestCard } from '../../components/domain/RequestCard';
import { HospitalCapabilityPanel } from '../../components/domain/HospitalCapabilityPanel';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { LoadingState } from '../../components/feedback/LoadingState';
import { playAlertSound } from '../../utils/sound';
import { CaseTransitDetails, JourneyStage, Hospital, Request } from '../../types/domain';
import {
  CheckSquare,
  Square,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Volume2,
  Radio,
  Truck,
  AlertOctagon,
  HeartPulse,
  UserCheck,
  Building2,
  Lock,
  Layers,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';

export const HospitalConsolePage: React.FC = () => {
  const { hospitalId } = useParams<{ hospitalId?: string }>();
  const { user } = useAuth();

  const { data: allHospitals } = useHospitals();
  const { data: allPendingRequests } = useActiveRequests();

  // Facility filter: 'all' (default for coordinator) or a specific hospital
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<string>(hospitalId || 'all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [lockConflictError, setLockConflictError] = useState<string | null>(null);

  // Sync route param changes to filter
  useEffect(() => {
    if (hospitalId) {
      setSelectedFacilityFilter(hospitalId);
    }
  }, [hospitalId]);

  // Filter pending requests: by facility or network-wide
  const pendingRequests =
    selectedFacilityFilter === 'all'
      ? allPendingRequests
      : allPendingRequests.filter((r) => r.hospital_id === selectedFacilityFilter);

  // Active request to show on takeover
  const activeRequest: Request | null =
    (selectedRequestId ? pendingRequests.find((r) => r.id === selectedRequestId) : null) ||
    (pendingRequests.length > 0 ? pendingRequests[0] : null);

  const { data: caseObj } = useCase(activeRequest?.case_id);

  // Current hospital metadata
  const currentHospital: Hospital | null =
    (activeRequest ? allHospitals.find((h) => h.id === activeRequest.hospital_id) : null) ||
    (selectedFacilityFilter !== 'all' ? allHospitals.find((h) => h.id === selectedFacilityFilter) : null) ||
    allHospitals[0] ||
    null;

  // Inbound transit data
  const [inboundTransits, setInboundTransits] = useState<{
    caseId: string;
    transit: CaseTransitDetails;
    caseData: any;
    ambulanceUnit: string;
    hospitalName: string;
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
      hospitalName: string;
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

  // Sync inbound transits and notifications
  const refreshTransits = () => {
    const allRequests = stateStore.getRequests();
    const relevantRequests = allRequests.filter((r) => {
      if (selectedFacilityFilter !== 'all' && r.hospital_id !== selectedFacilityFilter) {
        return false;
      }
      return r.status === 'accepted' || r.status === 'pending';
    });

    const transitsList: {
      caseId: string;
      transit: CaseTransitDetails;
      caseData: any;
      ambulanceUnit: string;
      hospitalName: string;
    }[] = [];

    for (const req of relevantRequests) {
      const c = stateStore.getCase(req.case_id);
      let t = stateStore.getTransit(req.case_id);
      const targetHosp = allHospitals.find((h) => h.id === req.hospital_id);
      const hospName = targetHosp?.name || req.hospital_id;

      if (!t && c) {
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
          hospitalName: hospName,
        });
      }
    }

    setInboundTransits(transitsList);

    // Check for patient deterioration alerts
    const notifs = stateStore.getNotifications('coordinator', 'all');
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
      const criticalTransit = transitsList.find(
        (it) => it.transit.current_transit_status === 'critical' || it.transit.current_transit_status === 'deteriorating'
      );
      if (criticalTransit) {
        setFlashAlert({
          caseId: criticalTransit.caseId,
          condition: criticalTransit.transit.current_transit_status.toUpperCase(),
          message: `Inbound patient for ${criticalTransit.hospitalName} has trended to ${criticalTransit.transit.current_transit_status.toUpperCase()}. Resuscitation bay required.`,
          timestamp: criticalTransit.transit.last_updated_at,
        });
      }
    }
  };

  useEffect(() => {
    refreshTransits();
    const unsub = stateStore.subscribe(refreshTransits);
    return unsub;
  }, [selectedFacilityFilter, allHospitals.length, pendingRequests.length]);

  if (allHospitals.length === 0 || !currentHospital) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#2D231C] p-8 max-w-4xl mx-auto flex items-center justify-center">
        <LoadingState label="Connecting to regional coordinator network…" />
      </div>
    );
  }

  // Coordinator Acceptance Logic with First-Write-Wins Lock Handling
  const handleAccept = async (requestId: string) => {
    setLockConflictError(null);
    try {
      const res = await api.acceptRequest(requestId, {
        actor_type: 'coordinator' as any,
        actor_id: user?.id || 'usr_coord_regional',
      });

      if (!res.success) {
        setLockConflictError(
          res.error?.message ||
            'Concurrency Conflict: This request was already accepted or resolved by another coordinator. (First-write-wins lock active).'
        );
        return;
      }

      const acceptedReq = stateStore.getRequest(requestId);
      const targetHosp = allHospitals.find((h) => h.id === acceptedReq?.hospital_id) || currentHospital;

      if (caseObj?.case) {
        const need = caseObj.case.need_profile;
        const prepItems = [
          ...need.specialists_needed.map((s) => ({
            label: `Alert on-call ${s.replace(/_/g, ' ')} at ${targetHosp.name} for immediate trauma bay intake`,
            done: false,
          })),
          ...need.capability_flags.map((f) => ({
            label: `Reserve & sterilize ${f.replace(/_/g, ' ')} unit at ${targetHosp.name}`,
            done: false,
          })),
        ];

        if (need.blood_type_needed) {
          prepItems.push({
            label: `Crossmatch 2 units of ${need.blood_type_needed} blood from ${targetHosp.name} blood bank`,
            done: false,
          });
        }

        setAcceptedCases((prev) => [
          {
            requestId,
            caseId: caseObj.case!.id,
            hospitalName: targetHosp.name,
            items: prepItems,
          },
          ...prev,
        ]);

        api.advanceJourneyStage(
          caseObj.case.id,
          'HOSPITAL_ACCEPTED',
          `Coordinator on behalf of ${targetHosp.name}`,
          `Bed and trauma reception confirmed for ${targetHosp.name}`
        );
        refreshTransits();
      }
    } catch (err: any) {
      setLockConflictError(
        err.message ||
          'Lock Conflict: Another coordinator has accepted this request concurrently. Action safely prevented.'
      );
    }
  };

  // Coordinator Rejection / Advance to Next Hospital
  const handleReject = async (requestId: string, reason: string) => {
    setLockConflictError(null);
    try {
      const res = await api.rejectRequest(requestId, reason, {
        actor_type: 'coordinator' as any,
        actor_id: user?.id || 'usr_coord_regional',
      });
      if (!res.success) {
        setLockConflictError(res.error?.message || 'Unable to decline request.');
      }
      refreshTransits();
    } catch (err: any) {
      setLockConflictError(err.message || 'Error advancing request to next hospital.');
    }
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

  const handleAdvanceHandoff = async (caseId: string, targetStage: JourneyStage, hospName: string) => {
    await api.advanceJourneyStage(
      caseId,
      targetStage,
      `Coordinator (${hospName})`,
      `Confirmed ${targetStage} at ER reception`
    );
    refreshTransits();
  };

  return (
    <div className="min-h-screen text-[#2D231C] p-4 sm:p-8 md:p-10 font-sans select-none relative z-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Coordinator Masthead Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E8E2D9] bg-white/90 backdrop-blur-xl sticky top-0 z-30 pt-2 stagger-1">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] text-[#0D9488] flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#0D9488] font-black uppercase tracking-wider">
                  Emergency Dispatch Coordinator Console
                </span>
                <span className="text-xs font-mono font-bold text-[#7D7067] bg-[#F4EFE6] px-2 py-0.5 rounded-md border border-[#E8E2D9]">
                  Cross-Hospital Authority
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-[#2D231C] tracking-tight">
                {selectedFacilityFilter === 'all'
                  ? 'All Facilities (Network-Wide Dispatch)'
                  : currentHospital.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FreshnessBadge lastUpdatedAt={currentHospital.last_updated_at} />
            <button
              onClick={() => playAlertSound()}
              className="p-2.5 rounded-xl border border-[#E8E2D9] bg-white text-[#7D7067] hover:text-[#0D9488] transition-colors shadow-xs"
              title="Test alert sound chime"
            >
              <Volume2 className="w-4 h-4 text-[#0D9488]" />
            </button>
          </div>
        </div>

        {/* FACILITY FILTER TABS (All Facilities vs Individual Hospitals) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedFacilityFilter('all');
              setSelectedRequestId(null);
            }}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-2xs cursor-pointer',
              selectedFacilityFilter === 'all'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'bg-white text-[#7D7067] hover:text-[#2D231C] border border-[#E8E2D9]'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Network Hospitals</span>
            <span
              className={clsx(
                'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                selectedFacilityFilter === 'all' ? 'bg-white/25 text-white' : 'bg-[#F4EFE6] text-[#2D231C]'
              )}
            >
              {allPendingRequests.length}
            </span>
          </button>

          {allHospitals.map((hosp) => {
            const hospPending = allPendingRequests.filter((r) => r.hospital_id === hosp.id);
            const isSelected = selectedFacilityFilter === hosp.id;
            return (
              <button
                key={hosp.id}
                type="button"
                onClick={() => {
                  setSelectedFacilityFilter(hosp.id);
                  setSelectedRequestId(null);
                }}
                className={clsx(
                  'px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-2xs cursor-pointer',
                  isSelected
                    ? 'bg-[#0D9488] text-white shadow-xs'
                    : 'bg-white text-[#7D7067] hover:text-[#2D231C] border border-[#E8E2D9]'
                )}
              >
                <span>{hosp.name.split(' ')[0]}</span>
                {hospPending.length > 0 && (
                  <span
                    className={clsx(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                      isSelected ? 'bg-white text-[#0D9488]' : 'bg-[#FFE4E6] text-[#E11D48] animate-pulse'
                    )}
                  >
                    {hospPending.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* LOCK CONFLICT ALERT BANNER */}
        {lockConflictError && (
          <div className="p-4 rounded-2xl bg-[#FFE4E6] border-2 border-[#E11D48] text-[#9F1239] animate-fade-in flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-[#E11D48] shrink-0" />
              <div>
                <span className="font-bold text-sm block">First-Write-Wins Concurrency Lock</span>
                <span className="text-xs font-mono">{lockConflictError}</span>
              </div>
            </div>
            <button
              onClick={() => setLockConflictError(null)}
              className="px-3 py-1 bg-white text-[#E11D48] border border-[#E11D48]/30 rounded-xl text-xs font-mono font-bold hover:bg-[#FFF1F2]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CLINICAL FLASH ALERT */}
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
              <span className="font-bold underline">Coordinator Oversight Alerted</span>
            </div>
          </div>
        )}

        {/* MULTI-HOSPITAL INCOMING QUEUE SELECTOR (when multiple pending) */}
        {pendingRequests.length > 1 && (
          <div className="p-4 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase text-[#2D231C] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
                <span>Incoming Emergency Requests Across Network ({pendingRequests.length})</span>
              </span>
              <span className="text-[10px] font-mono text-[#7D7067]">Click request to inspect and accept</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {pendingRequests.map((req) => {
                const hosp = allHospitals.find((h) => h.id === req.hospital_id);
                const isSelected = activeRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequestId(req.id)}
                    className={clsx(
                      'p-3 rounded-xl border text-left font-mono text-xs transition-all flex flex-col justify-between gap-2 shadow-2xs',
                      isSelected
                        ? 'border-[#0D9488] bg-[#F0FDFA] ring-2 ring-[#0D9488]/20'
                        : 'border-[#E8E2D9] bg-[#FAF8F5] hover:border-[#0D9488]/60 hover:bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#2D231C]">{req.case_id}</span>
                      <span className="text-[10px] bg-[#FFF7ED] text-[#C2410C] px-2 py-0.5 rounded-full border border-[#EA580C]/30 font-bold">
                        Rank #{req.attempt_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7D7067] uppercase font-semibold block">Target Facility:</span>
                      <span className="font-bold text-[#2D231C] truncate block">{hosp?.name || req.hospital_id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* INCOMING REQUEST TAKEOVER CARD */}
        {activeRequest && (
          <div className="space-y-4 animate-fade-in stagger-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-[#E11D48] font-black flex items-center gap-2 bg-[#FFE4E6] px-3.5 py-1.5 rounded-full border border-[#FECDD3]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse" />
                  <span>EMERGENCY INTAKE TAKEOVER — ACTION REQUIRED</span>
                </span>
                <span className="text-xs font-mono font-black text-[#0D9488] bg-[#F0FDFA] px-3 py-1.5 rounded-full border border-[#99F6E4]">
                  Target: {currentHospital.name} (Rank #{activeRequest.attempt_number})
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-[#2D231C] bg-white px-3 py-1 rounded-full border border-[#E8E2D9] shadow-xs">
                Total Pending: {pendingRequests.length}
              </span>
            </div>

            {caseObj?.case ? (
              <RequestCard
                request={activeRequest}
                caseData={caseObj.case}
                hospital={currentHospital}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ) : (
              <div className="p-8 rounded-3xl bg-white border border-[#E8E2D9] text-center space-y-3 shadow-sm">
                <LoadingState label={`Streaming emergency telemetry for Case ${activeRequest.case_id}…`} />
              </div>
            )}
          </div>
        )}

        {/* INCOMING AMBULANCE RADAR & CLINICAL HANDOFF SUITE */}
        {inboundTransits.length > 0 && (
          <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#EA580C] animate-pulse" />
                <span className="text-xs font-mono font-black uppercase tracking-wider text-[#2D231C]">
                  Cross-Hospital Inbound Ambulance Radar ({inboundTransits.length} En Route)
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#354F52] bg-[#EFF6F3] px-2.5 py-0.5 rounded-full border border-[#52796F]/30 font-bold">
                NETWORK RADAR ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inboundTransits.map(({ caseId, transit, caseData, ambulanceUnit, hospitalName }) => {
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
                      <div className="text-xs font-mono text-[#0D9488] font-bold mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Destination: {hospitalName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E2D9]">
                      <div>
                        <span className="text-[9px] text-[#7D7067] uppercase font-bold block">ETA</span>
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
                          onClick={() => handleAdvanceHandoff(caseId, 'ARRIVED_AT_HOSPITAL', hospitalName)}
                          className="px-3 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm ER Arrival</span>
                        </button>
                      )}

                      {isArrived && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceHandoff(caseId, 'HANDOFF_COMPLETED', hospitalName)}
                          className="px-3 py-1.5 bg-[#52796F] hover:bg-[#354F52] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Complete Handoff</span>
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
                    <div>
                      <span className="font-mono text-xs font-black text-[#354F52] uppercase block">
                        Incoming Case {ac.caseId}
                      </span>
                      <span className="text-[11px] font-mono text-[#0D9488] font-bold">
                        Facility: {ac.hospitalName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-[#EFF6F3] text-[#354F52] px-2.5 py-0.5 rounded-full font-black border border-[#52796F]/30">
                      HOLD ACTIVE
                    </span>
                  </div>

                  <p className="text-xs text-[#7D7067] font-mono font-semibold">
                    Clinical and bed hold allocation checklist:
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
                            : 'border-[#E8E2D9] bg-white text-[#2D231C] font-bold hover:border-[#0D9488]'
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

        {/* CALM DEFAULT CONSOLE: NO ACTIVE INTAKE */}
        {!activeRequest && inboundTransits.length === 0 && (
          <div className="p-6 rounded-2xl border border-[#E8E2D9] bg-white text-center py-8 text-[#7D7067] font-mono text-xs flex items-center justify-center gap-2.5 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
            <span className="text-sm font-sans font-bold text-[#7D7067]">
              Coordinator Console Idle • All regional hospital emergency queues clear
            </span>
          </div>
        )}

        {/* EDITABLE FACILITY CAPABILITY PANEL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#7D7067] font-black">
              Hospital Capacity Management • {currentHospital.name}
            </span>
            <span className="text-[11px] font-mono font-bold text-[#0D9488]">
              Adjusting availability re-scores sequential priority across the network
            </span>
          </div>

          <HospitalCapabilityPanel hospital={currentHospital} editable={true} />
        </div>
      </div>
    </div>
  );
};

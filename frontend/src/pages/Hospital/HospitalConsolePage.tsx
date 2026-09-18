import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useHospital, useHospitalQueue, useCase } from '../../hooks/useSubscriptions';
import { api } from '../../services/api';
import { RequestCard } from '../../components/domain/RequestCard';
import { HospitalCapabilityPanel } from '../../components/domain/HospitalCapabilityPanel';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { LoadingState } from '../../components/feedback/LoadingState';
import { Card3D } from '../../components/primitives/Card3D';
import { playAlertSound } from '../../utils/sound';
import {
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Volume2,
} from 'lucide-react';
import clsx from 'clsx';

export const HospitalConsolePage: React.FC = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();

  const { data: hospital, status: hospStatus } = useHospital(hospitalId);
  const { data: pendingRequests } = useHospitalQueue(hospitalId);

  // Active request to show on takeover
  const activeRequest = pendingRequests.length > 0 ? pendingRequests[0] : null;
  const { data: caseObj } = useCase(activeRequest?.case_id);

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
      // Derive Prep Checklist from Need Profile per H.2.3
      const need = caseObj.case.need_profile;
      const prepItems = [
        ...need.specialists_needed.map((s) => ({
          label: `Alert on-call ${s.replace('_', ' ')} for immediate trauma/ER bay reception`,
          done: false,
        })),
        ...need.capability_flags.map((f) => ({
          label: `Sterilize & reserve ${f.replace('_', ' ')} unit / bed`,
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
    }
  };

  // Handle Reject
  const handleReject = async (requestId: string, reason: string) => {
    await api.rejectRequest(requestId, reason, {
      actor_type: 'hospital',
      actor_id: hospital.id,
    });
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

        {/* INCOMING REQUEST TAKEOVER ALARM (Section H.2.2) */}
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

        {/* POST-DECISION: COMMITTED PREPARATION CHECKLISTS (Section H.2.3) */}
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

        {/* CALM DEFAULT CONSOLE: TELEMETRY & CAPABILITY PANEL (Section H.2.1 & H.2.4) */}
        {!activeRequest && (
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

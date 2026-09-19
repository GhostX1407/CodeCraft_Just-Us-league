import React, { useState, useEffect } from 'react';
import { useHospitals, useActiveRequests, useAllRequests, useAuditLog, useReliability } from '../../hooks/useSubscriptions';
import { RadianceMap } from './RadianceMap';
import { AuditTimeline } from '../../components/domain/AuditTimeline';
import { ReliabilityMeter } from '../../components/domain/ReliabilityMeter';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { Countdown } from '../../components/domain/Countdown';
import { api } from '../../services/api';
import { stateStore } from '../../services/stateStore';
import { formatIsoTime } from '../../utils/time';
import {
  Incident,
  HospitalRegistrationRecord,
  Ambulance,
  OperationalBriefing,
} from '../../types/domain';
import {
  Shield,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Moon,
  Clock,
  Navigation,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  Sparkles,
  Radio,
  FileCheck,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';
import clsx from 'clsx';

export const AdminDashboardPage: React.FC = () => {
  const { data: hospitals } = useHospitals();
  const { data: activeRequests } = useActiveRequests();
  const { data: allRequests } = useAllRequests();
  const { data: auditEvents } = useAuditLog();
  const { data: reliabilityRows } = useReliability();

  const [quietMode, setQuietMode] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'crisis' | 'accreditation' | 'fleet' | 'ai'>('overview');

  // Crisis Mode State
  const [activeCrisis, setActiveCrisis] = useState<Incident | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [crisisSubmitting, setCrisisSubmitting] = useState(false);
  const [crisisForm, setCrisisForm] = useState({
    name: 'Surat Ring Road Pileup MCI',
    type: 'Multi-Vehicle Collision',
    casualty_count: 8,
    red_count: 3,
    yellow_count: 3,
    green_count: 2,
  });

  // Accreditation Queue State
  const [pendingHospitals, setPendingHospitals] = useState<HospitalRegistrationRecord[]>([]);
  const [pendingAmbulances, setPendingAmbulances] = useState<Ambulance[]>([]);
  const [ambulancesList, setAmbulancesList] = useState<Ambulance[]>([]);
  const [accreditationLoading, setAccreditationLoading] = useState(false);

  // AI Operations Briefing
  const [aiBriefing, setAiBriefing] = useState<OperationalBriefing | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Sync data
  const refreshAdminData = async () => {
    // Crisis
    const crisis = stateStore.getActiveCrisis();
    setActiveCrisis(crisis);

    // Pending registrations
    const pHosps = await api.listPendingHospitals();
    setPendingHospitals(pHosps);

    const pAmbs = await api.listAmbulances('pending');
    setPendingAmbulances(pAmbs);

    const allAmbs = await api.listAmbulances();
    setAmbulancesList(allAmbs);

    // AI Briefing
    const brief = await api.getNetworkBriefing();
    setAiBriefing(brief);
  };

  useEffect(() => {
    refreshAdminData();
    const unsub = stateStore.subscribe(refreshAdminData);
    return unsub;
  }, []);

  // Handle Crisis Declaration
  const handleDeclareCrisis = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrisisSubmitting(true);

    const res = await api.activateCrisisMode({
      name: crisisForm.name,
      type: crisisForm.type,
      location: { lat: 21.1702, lng: 72.8311 },
      casualtyCount: crisisForm.casualty_count,
      severityDistribution: {
        red: crisisForm.red_count,
        yellow: crisisForm.yellow_count,
        green: crisisForm.green_count,
      },
    });

    if (res.success && res.data) {
      setActiveCrisis(res.data.incident);
    }
    setCrisisSubmitting(false);
    setShowCrisisModal(false);
    setActiveTab('crisis');
  };

  // Hospital Verification
  const handleVerifyHospital = async (id: string, approved: boolean) => {
    setAccreditationLoading(true);
    await api.verifyHospital(id, approved, `Verified by Regional Accreditation Board on ${new Date().toLocaleDateString()}`);
    await refreshAdminData();
    setAccreditationLoading(false);
  };

  // Ambulance Verification
  const handleVerifyAmbulance = async (id: string, approved: boolean) => {
    setAccreditationLoading(true);
    await api.verifyAmbulance(id, approved);
    await refreshAdminData();
    setAccreditationLoading(false);
  };

  const primaryPending = activeRequests.length > 0 ? activeRequests[0] : null;

  return (
    <div
      className={clsx(
        'min-h-screen text-[#2D231C] p-4 sm:p-8 font-sans select-none transition-all duration-300 relative z-10',
        quietMode && 'opacity-90'
      )}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9] stagger-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#EA580C]/30 flex items-center justify-center text-[#EA580C] shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#C2410C] font-black">
                Regional Emergency Command & Reliability Authority
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-[#2D231C] tracking-tight">
                Raahi Network Oversight
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            {/* Crisis Declaration Trigger Button */}
            <button
              type="button"
              onClick={() => setShowCrisisModal(true)}
              className="px-3.5 py-1.5 rounded-xl border border-[#E11D48] bg-[#FFE4E6] text-[#E11D48] hover:bg-[#FECDD3] font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Flame className="w-4 h-4 text-[#E11D48] animate-pulse" />
              <span>Declare Crisis Mode</span>
            </button>

            {/* Quiet Mode Toggle */}
            <button
              type="button"
              onClick={() => setQuietMode(!quietMode)}
              className={clsx(
                'px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors shadow-xs font-bold',
                quietMode
                  ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]'
                  : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:text-[#EA580C] hover:bg-[#FAF8F5]'
              )}
            >
              <Moon className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>{quietMode ? 'Quiet Active' : 'Quiet'}</span>
            </button>

            <span className="text-[#354F52] font-black flex items-center gap-1.5 bg-[#EFF6F3] px-3 py-1 rounded-full border border-[#52796F]/40">
              <span className="w-2 h-2 rounded-full bg-[#52796F] animate-pulse" />
              <span>Network Synced</span>
            </span>
          </div>
        </div>

        {/* ACTIVE CRISIS BANNER */}
        {activeCrisis && (
          <div className="p-5 rounded-3xl bg-[#FEF2F2] border-2 border-[#E11D48] shadow-md animate-fade-in space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E11D48]/20 pb-2">
              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wider text-[#E11D48]">
                <Flame className="w-5 h-5 text-[#E11D48] animate-pulse" />
                <span>RAAHI CRISIS MODE ACTIVE • {activeCrisis.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#E11D48] text-white px-2.5 py-0.5 rounded-full">
                  ANTI-CONCENTRATION ENGINE ENGAGED
                </span>
                <button
                  onClick={() => setActiveCrisis(null)}
                  className="text-xs font-mono text-[#7D7067] hover:text-[#2D231C]"
                >
                  Dismiss ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-white rounded-2xl border border-[#E8E2D9]">
                <span className="text-[#7D7067] text-[10px] uppercase font-bold">Total Casualties</span>
                <div className="text-xl font-black text-[#2D231C] mt-0.5">{activeCrisis.cases?.length || 8} Patients</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#FECDD3]">
                <span className="text-[#E11D48] text-[10px] uppercase font-bold">Red (Critical)</span>
                <div className="text-xl font-black text-[#E11D48] mt-0.5">{activeCrisis.severityDistribution?.red || 3} Cases</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#FDE68A]">
                <span className="text-[#B45309] text-[10px] uppercase font-bold">Yellow (Urgent)</span>
                <div className="text-xl font-black text-[#B45309] mt-0.5">{activeCrisis.severityDistribution?.yellow || 3} Cases</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-[#A7F3D0]">
                <span className="text-[#047857] text-[10px] uppercase font-bold">Green (Delayed)</span>
                <div className="text-xl font-black text-[#047857] mt-0.5">{activeCrisis.severityDistribution?.green || 2} Cases</div>
              </div>
            </div>

            {/* Bottlenecks Warning */}
            {activeCrisis.bottlenecksDetected && activeCrisis.bottlenecksDetected.length > 0 && (
              <div className="p-3 bg-[#FFF7ED] border border-[#EA580C]/40 rounded-2xl text-xs font-mono text-[#C2410C] flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#EA580C] shrink-0" />
                <span>
                  <b>Bottlenecks Detected:</b> {activeCrisis.bottlenecksDetected.join(' • ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E2D9] pb-3 text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={clsx(
              'px-4 py-2 rounded-xl transition-all',
              activeTab === 'overview'
                ? 'bg-[#2D231C] text-white shadow-xs'
                : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5]'
            )}
          >
            Overview & Radiance Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crisis')}
            className={clsx(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'crisis'
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5]'
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Crisis Command</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accreditation')}
            className={clsx(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'accreditation'
                ? 'bg-[#52796F] text-white shadow-xs'
                : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5]'
            )}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Accreditation Queue</span>
            {(pendingHospitals.length + pendingAmbulances.length > 0) && (
              <span className="bg-[#E11D48] text-white text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1">
                {pendingHospitals.length + pendingAmbulances.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={clsx(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'fleet'
                ? 'bg-[#2D231C] text-white shadow-xs'
                : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5]'
            )}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Fleet Radar ({ambulancesList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={clsx(
              'px-4 py-2 rounded-xl transition-all flex items-center gap-1.5',
              activeTab === 'ai'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5]'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Operations Analyst</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & SPATIAL RADIANCE */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-page-smooth">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-2">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-[#7D7067]">
                  <span className="uppercase tracking-wider font-black">Spatial Capability Radiance</span>
                  <span className="font-bold">{hospitals.length} Facilities Monitored</span>
                </div>
                <RadianceMap hospitals={hospitals} activeRequest={primaryPending} />
              </div>

              <div className="border border-[#E8E2D9] rounded-3xl bg-white shadow-sm p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#EA580C] font-black flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#EA580C]" />
                      <span>Live Coordination Grid</span>
                    </span>
                    <span className="text-xs font-mono font-black bg-[#FFF7ED] text-[#C2410C] border border-[#EA580C]/30 px-2.5 py-0.5 rounded-full">
                      {activeRequests.length} Pending • {allRequests.length} Total
                    </span>
                  </div>

                  {allRequests.length === 0 ? (
                    <div className="py-12 text-center text-xs font-mono font-bold text-[#A89F97]">
                      No emergency requests in flight.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-3 max-h-[460px] overflow-y-auto pr-1">
                      {allRequests.slice(0, 10).map((req) => {
                        const hosp = hospitals.find((h) => h.id === req.hospital_id);
                        const isPending = req.status === 'pending';
                        const isAccepted = req.status === 'accepted';
                        const isRejected = req.status === 'rejected';

                        return (
                          <div
                            key={req.id}
                            className={clsx(
                              'p-3.5 rounded-2xl border space-y-2 shadow-xs transition-all',
                              isPending && 'bg-[#FFF7ED]/40 border-[#EA580C]/40',
                              isAccepted && 'bg-[#EFF6F3]/50 border-[#52796F]/40',
                              isRejected && 'bg-[#FAF8F5] border-[#E8E2D9] opacity-85',
                              !isPending && !isAccepted && !isRejected && 'bg-[#FAF8F5] border-[#E8E2D9]'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-black text-[#2D231C] flex items-center gap-1.5">
                                {isPending && <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />}
                                {isAccepted && <span className="w-2 h-2 rounded-full bg-[#52796F]" />}
                                <span>Case {req.case_id}</span>
                              </span>
                              <StatusBadge status={req.status} size="sm" />
                            </div>

                            <div className="text-xs font-mono font-bold text-[#2D231C]">
                              <span className="text-[#EA580C]">Ambulance (Unit AMB-01)</span>
                              <span className="text-[#7D7067] mx-1.5">→</span>
                              <span>{hosp?.name || req.hospital_id}</span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono text-[#7D7067]">
                              <span>Time: <b className="text-[#2D231C]">{formatIsoTime(req.sent_at)}</b></span>
                              {req.attempt_number > 1 && (
                                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#E8E2D9]">
                                  Attempt {req.attempt_number}
                                </span>
                              )}
                            </div>

                            {isPending && (
                              <div className="pt-1">
                                <Countdown expiresAt={req.expires_at} variant="bar" />
                              </div>
                            )}

                            {isAccepted && (
                              <div className="text-[11px] font-mono text-[#354F52] bg-white p-2 rounded-xl border border-[#52796F]/30 font-bold">
                                ✓ Capacity Reserved: 1 ICU Bed held at destination
                              </div>
                            )}

                            {isRejected && req.rejection_reason && (
                              <div className="text-[10px] font-mono text-[#991B1B] bg-white p-1.5 rounded-lg border border-[#FECDD3]">
                                Decline note: {req.rejection_reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E8E2D9] text-[11px] font-mono font-semibold text-[#7D7067] flex items-center justify-between">
                  <span>Backend Live Sync Active</span>
                  <span className="w-2 h-2 rounded-full bg-[#52796F] animate-pulse" />
                </div>
              </div>
            </div>

            {/* REGIONAL FACILITY RELIABILITY SCORECARD */}
            <div className="border border-[#E8E2D9] rounded-3xl bg-white shadow-sm p-6 space-y-4 stagger-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div>
                  <h2 className="text-lg font-display font-black text-[#2D231C] tracking-tight">
                    Hospital Capability & Reliability Scorecard
                  </h2>
                  <p className="text-xs font-mono font-medium text-[#7D7067] mt-0.5">
                    Evaluated from real-time response latency and capacity truthfulness
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-[#A89F97]">Section H.3.3</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reliabilityRows.map((row) => {
                  const hosp = hospitals.find((h) => h.id === row.hospital_id);
                  return (
                    <div
                      key={row.hospital_id}
                      className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-black text-[#2D231C] truncate">
                            {row.hospital_name || hosp?.name || row.hospital_id}
                          </div>
                          <div className="text-[10px] font-mono text-[#7D7067] font-bold uppercase mt-0.5">
                            Reliability Rating • {row.response_metrics?.accepted_count ?? 0} Dispatches
                          </div>
                        </div>
                        <FreshnessBadge lastUpdatedAt={hosp?.last_updated_at || Date.now()} showSentenceOnUnknown={false} />
                      </div>

                      <ReliabilityMeter score={row.reliability_score} metrics={row.response_metrics} />

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                        <div className="bg-white p-2 rounded-xl border border-[#E8E2D9]">
                          <span className="text-[9px] text-[#7D7067] font-bold block">ACCEPTED</span>
                          <span className="font-black text-[#52796F]">{row.response_metrics?.accepted_count ?? 0}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-[#E8E2D9]">
                          <span className="text-[9px] text-[#7D7067] font-bold block">HONOURED</span>
                          <span className="font-black text-[#EA580C]">{row.response_metrics?.successful_commitment_count ?? 0}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-[#E8E2D9]">
                          <span className="text-[9px] text-[#7D7067] font-bold block">AVG SPEED</span>
                          <span className="font-black text-[#2D231C]">{row.response_metrics?.average_response_seconds ?? 0}s</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FORENSIC AUDIT TIMELINE */}
            <div className="border border-[#E8E2D9] rounded-3xl bg-white shadow-sm p-6 space-y-4 stagger-4">
              <button
                type="button"
                onClick={() => setAuditOpen(!auditOpen)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-[#EA580C] font-black">
                    Forensic Verification Flight Recorder
                  </div>
                  <h3 className="text-lg font-display font-black text-[#2D231C] tracking-tight mt-0.5">
                    Network Audit Log ({auditEvents.length} Immutable Recorded Events)
                  </h3>
                </div>
                <div className="p-2 rounded-xl border border-[#E8E2D9] hover:bg-[#FAF8F5] text-[#EA580C]">
                  {auditOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {auditOpen && (
                <div className="pt-4 border-t border-[#E8E2D9] animate-fade-in">
                  <AuditTimeline events={auditEvents} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CRISIS COMMAND */}
        {activeTab === 'crisis' && (
          <div className="space-y-6 animate-page-smooth">
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div>
                  <h2 className="text-lg font-display font-black text-[#2D231C]">
                    Raahi Crisis & Mass Casualty Coordination Engine
                  </h2>
                  <p className="text-xs font-mono text-[#7D7067] mt-0.5">
                    Dynamic anti-concentration algorithm prevents hospital saturation during multi-casualty incidents
                  </p>
                </div>
                <button
                  onClick={() => setShowCrisisModal(true)}
                  className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Flame className="w-4 h-4" />
                  <span>Declare Incident</span>
                </button>
              </div>

              {activeCrisis ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#2D231C]">{activeCrisis.name}</span>
                      <span className="text-xs font-mono text-[#52796F] font-bold bg-[#EFF6F3] px-2.5 py-0.5 rounded-full border border-[#52796F]/30">
                        Status: ACTIVE
                      </span>
                    </div>
                    <p className="text-xs font-sans text-[#7D7067] leading-relaxed">
                      {activeCrisis.incidentSummary || 'Mass casualty incident declared. Anti-concentration load balancing distributes casualties across regional trauma network.'}
                    </p>
                  </div>

                  {/* Anti-concentration Hospital Allocation Visualizer */}
                  {activeCrisis.hospitalAllocation && (
                    <div className="space-y-2">
                      <span className="text-xs font-mono uppercase font-black text-[#2D231C]">
                        Anti-Concentration Hospital Cohort Allocation
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.entries(activeCrisis.hospitalAllocation).map(([hospId, alloc]: [string, any]) => {
                          const h = hospitals.find((item) => item.id === hospId);
                          return (
                            <div key={hospId} className="p-3.5 bg-white rounded-2xl border border-[#E8E2D9] space-y-1 text-xs font-mono">
                              <div className="font-black text-[#2D231C] truncate">{h?.name || hospId}</div>
                              <div className="text-[11px] text-[#7D7067]">
                                Allocated: <b className="text-[#EA580C] font-bold">{alloc.assigned_cases || alloc.red_cases + alloc.yellow_cases} cases</b>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#52796F]">
                                <span>Red: {alloc.red_cases || 0}</span>
                                <span>•</span>
                                <span>Yellow: {alloc.yellow_cases || 0}</span>
                                <span>•</span>
                                <span>Green: {alloc.green_cases || 0}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-xs font-mono text-[#7D7067]">
                  No active crisis declared. Regional network operating under standard deterministic dispatch.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACCREDITATION & VERIFICATION QUEUE */}
        {activeTab === 'accreditation' && (
          <div className="space-y-6 animate-page-smooth">
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-display font-black text-[#2D231C]">
                  Clinical Facility & Ambulance Accreditation Queue
                </h2>
                <p className="text-xs font-mono text-[#7D7067] mt-0.5">
                  Verify capabilities, ICU beds, and equipment checklists before onboarding to the live dispatch engine
                </p>
              </div>

              {/* Pending Hospitals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]">
                  <span className="text-xs font-mono uppercase tracking-wider font-black text-[#2D231C] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#EA580C]" />
                    <span>Pending Hospital Accreditations ({pendingHospitals.length})</span>
                  </span>
                </div>

                {pendingHospitals.length === 0 ? (
                  <div className="py-6 text-center text-xs font-mono text-[#A89F97]">
                    All hospital applications verified and accredited.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingHospitals.map((hosp) => (
                      <div
                        key={hosp.id}
                        className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] flex flex-wrap items-center justify-between gap-4 text-xs font-mono"
                      >
                        <div className="space-y-1">
                          <div className="font-black text-sm text-[#2D231C]">{hosp.name}</div>
                          <div className="text-[#7D7067]">{hosp.address} • Contact: {hosp.contact_number}</div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {hosp.capabilities.map((c) => (
                              <span key={c} className="bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9] text-[10px] text-[#2D231C]">
                                {c}
                              </span>
                            ))}
                            <span className="bg-[#EFF6F3] text-[#354F52] px-2 py-0.5 rounded-md border border-[#52796F]/30 text-[10px] font-bold">
                              ICU Beds: {hosp.icu_beds}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={accreditationLoading}
                            onClick={() => handleVerifyHospital(hosp.id, true)}
                            className="px-3.5 py-1.5 bg-[#52796F] hover:bg-[#354F52] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accredit Facility</span>
                          </button>
                          <button
                            type="button"
                            disabled={accreditationLoading}
                            onClick={() => handleVerifyHospital(hosp.id, false)}
                            className="px-3 py-1.5 bg-white border border-[#E8E2D9] hover:bg-[#FFE4E6] text-[#E11D48] rounded-xl font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Ambulances */}
              <div className="space-y-3 pt-4 border-t border-[#E8E2D9]">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]">
                  <span className="text-xs font-mono uppercase tracking-wider font-black text-[#2D231C] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#EA580C]" />
                    <span>Pending Ambulance Verifications ({pendingAmbulances.length})</span>
                  </span>
                </div>

                {pendingAmbulances.length === 0 ? (
                  <div className="py-6 text-center text-xs font-mono text-[#A89F97]">
                    All ambulance vehicles verified and licensed.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingAmbulances.map((amb) => (
                      <div
                        key={amb.id}
                        className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] flex flex-wrap items-center justify-between gap-4 text-xs font-mono"
                      >
                        <div className="space-y-1">
                          <div className="font-black text-sm text-[#2D231C] flex items-center gap-2">
                            <span>{amb.vehicle_number}</span>
                            <span className="text-[10px] bg-[#FFF7ED] text-[#EA580C] px-2 py-0.5 rounded-full border border-[#EA580C]/30 font-bold">
                              {amb.ambulance_type}
                            </span>
                          </div>
                          <div className="text-[#7D7067]">{amb.organization} • Contact: {amb.contact_number}</div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {amb.facilities.map((f) => (
                              <span key={f} className="bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9] text-[10px] text-[#2D231C]">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={accreditationLoading}
                            onClick={() => handleVerifyAmbulance(amb.id, true)}
                            className="px-3.5 py-1.5 bg-[#52796F] hover:bg-[#354F52] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Vehicle</span>
                          </button>
                          <button
                            type="button"
                            disabled={accreditationLoading}
                            onClick={() => handleVerifyAmbulance(amb.id, false)}
                            className="px-3 py-1.5 bg-white border border-[#E8E2D9] hover:bg-[#FFE4E6] text-[#E11D48] rounded-xl font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AMBULANCE FLEET RADAR */}
        {activeTab === 'fleet' && (
          <div className="space-y-6 animate-page-smooth">
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div>
                  <h2 className="text-lg font-display font-black text-[#2D231C]">
                    Regional Emergency Ambulance Fleet Radar
                  </h2>
                  <p className="text-xs font-mono text-[#7D7067] mt-0.5">
                    Live telemetry, location vectors, and onboard equipment status across active units
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-[#EFF6F3] text-[#354F52] px-3 py-1 rounded-full border border-[#52796F]/30">
                  {ambulancesList.length} Units Online
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ambulancesList.map((amb) => (
                  <div key={amb.id} className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-2.5 text-xs font-mono shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#EA580C]" />
                        <span className="font-black text-[#2D231C]">{amb.vehicle_number}</span>
                      </div>
                      <span className={clsx(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border',
                        amb.availability === 'available' ? 'bg-[#EFF6F3] text-[#354F52] border-[#52796F]/30' :
                        amb.availability === 'en_route' ? 'bg-[#FFF7ED] text-[#C2410C] border-[#EA580C]/30' :
                        'bg-white text-[#7D7067] border-[#E8E2D9]'
                      )}>
                        {amb.availability}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#7D7067]">
                      Type: <b className="text-[#2D231C]">{amb.ambulance_type}</b> • {amb.organization}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2 rounded-xl border border-[#E8E2D9]">
                      <div>Speed: <b>{amb.speed_kmh ?? 45} km/h</b></div>
                      <div>Heading: <b>{amb.heading_degrees ?? 315}°</b></div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {amb.facilities.map((fac) => (
                        <span key={fac} className="bg-white px-1.5 py-0.5 rounded text-[9px] border border-[#E8E2D9]">
                          {fac}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI OPERATIONS ANALYST */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-page-smooth">
            <div className="p-6 rounded-3xl border border-[#E8E2D9] bg-white shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E2D9]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#7C3AED]" />
                  <div>
                    <h2 className="text-lg font-display font-black text-[#2D231C]">
                      Raahi AI Operations Layer • Network Coordination Briefing
                    </h2>
                    <p className="text-xs font-mono text-[#7D7067]">
                      Operational situation summary and bottleneck pattern analysis
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={async () => {
                    setAiLoading(true);
                    const b = await api.getNetworkBriefing();
                    setAiBriefing(b);
                    setAiLoading(false);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#E8E2D9] bg-white hover:bg-[#FAF8F5] text-xs font-mono font-bold flex items-center gap-1.5 text-[#7D7067]"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', aiLoading && 'animate-spin')} />
                  <span>Refresh Analysis</span>
                </button>
              </div>

              {/* MANDATORY STRICT NON-DECISIONAL DISCLAIMER */}
              <div className="p-4 bg-[#F5F3FF] border border-[#DDD6FE] rounded-2xl text-xs font-mono text-[#6D28D9] flex items-start gap-3">
                <Info className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                <div>
                  <div className="font-black uppercase tracking-wider">
                    Administrative Operations Advisory (Non-Decisional)
                  </div>
                  <div className="text-[11px] leading-relaxed mt-0.5">
                    {aiBriefing?.disclaimer ||
                      'AI-generated operational brief for administrative coordination only. Not for clinical diagnosis or triage routing decisions. The deterministic capability engine remains the sole authority for all matching and allocation.'}
                  </div>
                </div>
              </div>

              {aiBriefing && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-1.5">
                    <span className="text-[10px] text-[#7D7067] uppercase font-bold">Executive Situation Summary</span>
                    <p className="text-sm font-sans font-medium text-[#2D231C] leading-relaxed">
                      {aiBriefing.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-[#E8E2D9] space-y-2">
                      <span className="text-[10px] text-[#7D7067] uppercase font-bold">Key Telemetry Observations</span>
                      <ul className="space-y-1.5 list-disc list-inside text-[#2D231C]">
                        {aiBriefing.keyObservations.map((obs, idx) => (
                          <li key={idx}>{obs}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#E8E2D9] space-y-2">
                      <span className="text-[10px] text-[#7D7067] uppercase font-bold">Operational Recommendations</span>
                      <ul className="space-y-1.5 list-disc list-inside text-[#2D231C]">
                        {aiBriefing.operationalRecommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E2D9] text-[10px] text-[#7D7067]">
                    <span>Model: <b>{aiBriefing.modelUsed}</b></span>
                    <span>Timestamp: {new Date(aiBriefing.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CRISIS DECLARATION MODAL */}
        {showCrisisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D231C]/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#E8E2D9] shadow-2xl space-y-5 animate-scale-settle">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-[#E11D48]" />
                  <h3 className="font-display font-black text-lg text-[#2D231C]">
                    Declare Regional Crisis Incident
                  </h3>
                </div>
                <button
                  onClick={() => setShowCrisisModal(false)}
                  className="text-[#7D7067] hover:text-[#2D231C] text-sm font-mono font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleDeclareCrisis} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#7D7067] uppercase mb-1">
                    Incident Title / Event Name
                  </label>
                  <input
                    type="text"
                    required
                    value={crisisForm.name}
                    onChange={(e) => setCrisisForm({ ...crisisForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#EA580C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#7D7067] uppercase mb-1">
                    Incident Classification
                  </label>
                  <select
                    value={crisisForm.type}
                    onChange={(e) => setCrisisForm({ ...crisisForm, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold outline-none"
                  >
                    <option value="Multi-Vehicle Collision">Multi-Vehicle Collision</option>
                    <option value="Industrial Explosion">Industrial Explosion</option>
                    <option value="Structural Collapse">Structural Collapse</option>
                    <option value="Chemical Inhalation Surge">Chemical Inhalation Surge</option>
                    <option value="Natural Disaster">Natural Disaster</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#7D7067] uppercase mb-1">
                    Estimated Casualties
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={crisisForm.casualty_count}
                    onChange={(e) => setCrisisForm({ ...crisisForm, casualty_count: +e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#E11D48] uppercase mb-1">Red (Critical)</label>
                    <input
                      type="number"
                      value={crisisForm.red_count}
                      onChange={(e) => setCrisisForm({ ...crisisForm, red_count: +e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#FECDD3] bg-[#FFE4E6] text-xs font-mono font-black text-[#E11D48]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#B45309] uppercase mb-1">Yellow (Urgent)</label>
                    <input
                      type="number"
                      value={crisisForm.yellow_count}
                      onChange={(e) => setCrisisForm({ ...crisisForm, yellow_count: +e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#FDE68A] bg-[#FEF3C7] text-xs font-mono font-black text-[#B45309]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#047857] uppercase mb-1">Green (Delayed)</label>
                    <input
                      type="number"
                      value={crisisForm.green_count}
                      onChange={(e) => setCrisisForm({ ...crisisForm, green_count: +e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] text-xs font-mono font-black text-[#047857]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCrisisModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold text-[#7D7067]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={crisisSubmitting}
                    className="px-5 py-2.5 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Engage Crisis Engine</span>
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

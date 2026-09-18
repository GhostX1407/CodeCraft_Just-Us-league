import React, { useState } from 'react';
import { useHospitals, useActiveRequests, useAuditLog, useReliability } from '../../hooks/useSubscriptions';
import { RadianceMap } from './RadianceMap';
import { AuditTimeline } from '../../components/domain/AuditTimeline';
import { ReliabilityMeter } from '../../components/domain/ReliabilityMeter';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { Countdown } from '../../components/domain/Countdown';
import {
  Shield,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Moon,
  Sun,
  Clock,
  Navigation,
} from 'lucide-react';
import clsx from 'clsx';

export const AdminDashboardPage: React.FC = () => {
  const { data: hospitals } = useHospitals();
  const { data: activeRequests } = useActiveRequests();
  const { data: auditEvents } = useAuditLog();
  const { data: reliabilityRows } = useReliability();

  const [quietMode, setQuietMode] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

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

          <div className="flex items-center gap-4 text-xs font-mono">
            {/* Quiet Mode Toggle per F.8 */}
            <button
              type="button"
              onClick={() => setQuietMode(!quietMode)}
              className={clsx(
                'px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors shadow-xs font-bold',
                quietMode
                  ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]'
                  : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:text-[#EA580C] hover:bg-[#FAF8F5]'
              )}
            >
              <Moon className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>{quietMode ? 'Quiet Mode Active' : 'Enable Quiet Mode'}</span>
            </button>

            <span className="text-[#354F52] font-black flex items-center gap-1.5 bg-[#EFF6F3] px-3 py-1 rounded-full border border-[#52796F]/40">
              <span className="w-2 h-2 rounded-full bg-[#52796F] animate-pulse" />
              <span>Network Synchronized</span>
            </span>
          </div>
        </div>

        {/* Core Layout: Dominant 2.5D Radiance Map + Live Activity Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-2">
          {/* Dominant Map (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#7D7067]">
              <span className="uppercase tracking-wider font-black">Spatial Capability Radiance</span>
              <span className="font-bold">{hospitals.length} Facilities Monitored</span>
            </div>
            <RadianceMap hospitals={hospitals} activeRequest={primaryPending} />
          </div>

          {/* Right Rail: Live Routing Activity Rail (Section H.3.2) */}
          <div className="border border-[#E8E2D9] rounded-3xl bg-white shadow-sm p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
                <span className="text-xs font-mono uppercase tracking-wider text-[#EA580C] font-black flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#EA580C]" />
                  <span>Concurrent Dispatches</span>
                </span>
                <span className="text-xs font-mono font-black bg-[#FFF7ED] text-[#C2410C] border border-[#EA580C]/30 px-2.5 py-0.5 rounded-full">
                  {activeRequests.length} Active
                </span>
              </div>

              {activeRequests.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono font-bold text-[#A89F97]">
                  No pending ambulance requests in flight.
                </div>
              ) : (
                <div className="space-y-3 pt-3">
                  {activeRequests.map((req) => {
                    const hosp = hospitals.find((h) => h.id === req.hospital_id);
                    return (
                      <div
                        key={req.id}
                        className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9] space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-[#2D231C]">
                            Case {req.case_id}
                          </span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <div className="text-xs text-[#7D7067] font-medium truncate">
                          Target: <b className="text-[#2D231C] font-bold">{hosp?.name || req.hospital_id}</b>
                        </div>
                        {req.status === 'pending' && (
                          <div className="pt-1">
                            <Countdown expiresAt={req.expires_at} variant="bar" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E8E2D9] text-[11px] font-mono font-semibold text-[#7D7067]">
              Auto-refreshes via BroadcastChannel cross-tab live sync.
            </div>
          </div>
        </div>

        {/* REGIONAL FACILITY RELIABILITY SCORECARD (Section H.3.3) */}
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

                  {/* Reliability Score Meter */}
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

        {/* FORENSIC AUDIT TIMELINE (Collapsible Drawer, Section H.3.4) */}
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
    </div>
  );
};

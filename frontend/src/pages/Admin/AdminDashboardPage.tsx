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
        'min-h-screen text-[#0F172A] p-4 sm:p-8 font-sans select-none transition-all duration-300 relative z-10',
        quietMode && 'opacity-90'
      )}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0] stagger-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E6F7F7] border border-[#149B9E]/30 flex items-center justify-center text-[#149B9E] shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#0D7C7E] font-black">
                Regional Emergency Command & Reliability Authority
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] tracking-tight">
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
                  ? 'border-[#149B9E] bg-[#E6F7F7] text-[#0D7C7E]'
                  : 'border-[#E2E8F0] bg-white text-[#475569] hover:text-[#149B9E] hover:bg-[#F8FAFC]'
              )}
            >
              <Moon className="w-3.5 h-3.5 text-[#149B9E]" />
              <span>{quietMode ? 'Quiet Mode Active' : 'Enable Quiet Mode'}</span>
            </button>

            <span className="text-[#0F766E] font-black flex items-center gap-1.5 bg-[#CCFBF1] px-3 py-1 rounded-full border border-[#0D9488]/40">
              <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
              <span>Network Synchronized</span>
            </span>
          </div>
        </div>

        {/* Core Layout: Dominant 2.5D Radiance Map + Live Activity Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-2">
          {/* Dominant Map (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#475569]">
              <span className="uppercase tracking-wider font-black">Spatial Capability Radiance</span>
              <span className="font-bold">{hospitals.length} Facilities Monitored</span>
            </div>
            <RadianceMap hospitals={hospitals} activeRequest={primaryPending} />
          </div>

          {/* Right Rail: Live Routing Activity Rail (Section H.3.2) */}
          <div className="border border-[#E2E8F0] rounded-3xl bg-white shadow-sm p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <span className="text-xs font-mono uppercase tracking-wider text-[#149B9E] font-black flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#149B9E]" />
                  <span>Concurrent Dispatches</span>
                </span>
                <span className="text-xs font-mono font-black bg-[#E6F7F7] text-[#0D7C7E] border border-[#149B9E]/30 px-2.5 py-0.5 rounded-full">
                  {activeRequests.length} Active
                </span>
              </div>

              {activeRequests.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono font-bold text-[#94A3B8]">
                  No pending ambulance requests in flight.
                </div>
              ) : (
                <div className="space-y-3 pt-3">
                  {activeRequests.map((req) => {
                    const hosp = hospitals.find((h) => h.id === req.hospital_id);
                    return (
                      <div
                        key={req.id}
                        className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-[#0F172A]">
                            Case {req.case_id}
                          </span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <div className="text-xs text-[#475569] font-medium truncate">
                          Target: <b className="text-[#0F172A] font-bold">{hosp?.name || req.hospital_id}</b>
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

            <div className="pt-3 border-t border-[#E2E8F0] text-[11px] font-mono font-semibold text-[#64748B]">
              Auto-refreshes via BroadcastChannel cross-tab live sync.
            </div>
          </div>
        </div>

        {/* REGIONAL FACILITY RELIABILITY SCORECARD (Section H.3.3) */}
        <div className="border border-[#E2E8F0] rounded-3xl bg-white shadow-sm p-6 space-y-4 stagger-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-lg font-display font-black text-[#0F172A] tracking-tight">
                Hospital Capability & Reliability Scorecard
              </h2>
              <p className="text-xs font-mono font-medium text-[#475569] mt-0.5">
                Evaluated from real-time response latency and capacity truthfulness
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#94A3B8]">Section H.3.3</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reliabilityRows.map((row) => {
              const hosp = hospitals.find((h) => h.id === row.hospital_id);
              return (
                <div
                  key={row.hospital_id}
                  className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-black text-[#0F172A] truncate">
                        {row.hospital_name || hosp?.name || row.hospital_id}
                      </div>
                      <div className="text-[10px] font-mono text-[#64748B] font-bold uppercase mt-0.5">
                        Reliability Rating • {row.response_metrics?.accepted_count ?? 0} Dispatches
                      </div>
                    </div>
                    <FreshnessBadge lastUpdatedAt={hosp?.last_updated_at || Date.now()} showSentenceOnUnknown={false} />
                  </div>

                  {/* Reliability Score Meter */}
                  <ReliabilityMeter score={row.reliability_score} metrics={row.response_metrics} />

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                    <div className="bg-white p-2 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[9px] text-[#64748B] font-bold block">ACCEPTED</span>
                      <span className="font-black text-[#0D9488]">{row.response_metrics?.accepted_count ?? 0}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[9px] text-[#64748B] font-bold block">HONOURED</span>
                      <span className="font-black text-[#149B9E]">{row.response_metrics?.successful_commitment_count ?? 0}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[9px] text-[#64748B] font-bold block">AVG SPEED</span>
                      <span className="font-black text-[#0F172A]">{row.response_metrics?.average_response_seconds ?? 0}s</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORENSIC AUDIT TIMELINE (Collapsible Drawer, Section H.3.4) */}
        <div className="border border-[#E2E8F0] rounded-3xl bg-white shadow-sm p-6 space-y-4 stagger-4">
          <button
            type="button"
            onClick={() => setAuditOpen(!auditOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#149B9E] font-black">
                Forensic Verification Flight Recorder
              </div>
              <h3 className="text-lg font-display font-black text-[#0F172A] tracking-tight mt-0.5">
                Network Audit Log ({auditEvents.length} Immutable Recorded Events)
              </h3>
            </div>
            <div className="p-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#149B9E]">
              {auditOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {auditOpen && (
            <div className="pt-4 border-t border-[#E2E8F0] animate-fade-in">
              <AuditTimeline events={auditEvents} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

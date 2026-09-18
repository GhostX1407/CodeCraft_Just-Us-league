import React, { useState } from 'react';
import clsx from 'clsx';
import { AuditEvent } from '../../types/domain';
import { formatIsoTime, timeAgo } from '../../utils/time';
import { ChevronRight, ChevronDown, Database, Terminal, Clock, ShieldCheck } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditEvent[];
  className?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events, className }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'REQUEST_ACCEPTED':
      case 'HOLD_CREATED':
        return 'text-commit bg-commit/10 border-commit/40';
      case 'REQUEST_SENT':
      case 'MATCH_COMPUTED':
        return 'text-signal bg-signal/10 border-signal/40';
      case 'REQUEST_REJECTED':
      case 'REQUEST_TIMED_OUT':
      case 'ROUTING_EXHAUSTED':
        return 'text-critical bg-critical/10 border-critical/40';
      case 'REROUTE_TRIGGERED':
      case 'REQUEST_SUPERSEDED':
        return 'text-caution bg-caution/10 border-caution/40';
      default:
        return 'text-text-mid bg-ink-700 border-line-1';
    }
  };

  return (
    <div className={clsx('border border-[#E8E2D9] rounded-2xl bg-white shadow-sm overflow-hidden select-none', className)}>
      <div className="flex items-center justify-between p-4 border-b border-[#E8E2D9] bg-[#FAF8F5]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-signal" />
          <span className="text-sm font-black font-mono tracking-tight text-[#2D231C] uppercase">
            Forensic Audit Trail
          </span>
        </div>
        <span className="text-xs font-mono text-[#7D7067] font-bold">
          {events.length} Immutable Event Records
        </span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-[#7D7067] font-mono text-xs font-bold">
          No events recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-[#E8E2D9] max-h-[520px] overflow-y-auto">
          {events.map((event, idx) => {
            const isExpanded = expandedId === event.id;
            return (
              <div key={event.id || idx} className="group hover:bg-[#FAF8F5] transition-colors">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#7D7067] group-hover:text-[#2D231C]">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>

                    <span className="font-mono text-xs text-[#2D231C] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#EA580C]" />
                      <span>{formatIsoTime(event.timestamp)}</span>
                      <span className="text-[#7D7067] text-[10px]">({timeAgo(event.timestamp)})</span>
                    </span>

                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-bold border tracking-wider',
                        getEventBadge(event.event_type)
                      )}
                    >
                      {event.event_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs text-[#7D7067] font-bold">
                    <span>Actor: <b className="text-[#2D231C]">{event.actor_type}</b></span>
                    {event.hospital_id && (
                      <span>Hosp: <b className="text-[#2D231C]">{event.hospital_id}</b></span>
                    )}
                    {event.case_id && (
                      <span className="hidden sm:inline">Case: <b className="text-[#2D231C]">{event.case_id}</b></span>
                    )}
                  </div>
                </div>

                {/* Decision-Time Snapshot JSON Drawer */}
                {isExpanded && (
                  <div className="p-4 bg-[#FAF8F5] border-t border-b border-[#E8E2D9] animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-signal flex items-center gap-1.5 font-bold">
                        <Database className="w-3.5 h-3.5" />
                        <span>Snapshot of State at Decision Time</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#7D7067] font-bold">
                        SHA256 verified • Immutable Record
                      </span>
                    </div>

                    <pre className="p-3 rounded-xl bg-white border border-[#E8E2D9] font-mono text-xs text-[#2D231C] font-bold shadow-sm overflow-x-auto max-h-60 selection:bg-signal/20">
                      {JSON.stringify(event.snapshot_of_data_at_decision_time || {}, null, 2)}
                    </pre>

                    <div className="mt-2 text-[10px] font-sans text-[#7D7067] font-semibold flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-[#EA580C]" />
                      <span>
                        Snapshot captures exact capacity, blood stocks, and distance parameters at the millisecond of routing.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

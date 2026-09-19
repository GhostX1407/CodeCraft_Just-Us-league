import React, { useState, useEffect } from 'react';
import { stateStore } from '../../services/stateStore';
import type { AuditEvent } from '../../types/domain';
import {
  Layers,
  Search,
  Filter,
  Download,
  Clock,
  Radio,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  User,
  Building2,
  Ambulance,
  Cpu,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = () => {
    setLogs(stateStore.getAuditLogs());
  };

  useEffect(() => {
    loadLogs();
    const unsub = stateStore.subscribe(loadLogs);
    return unsub;
  }, []);

  const eventTypes = Array.from(new Set(logs.map((l) => l.event_type))).sort();

  const filteredLogs = logs.filter((log) => {
    // Event type filter
    if (selectedEventType !== 'all' && log.event_type !== selectedEventType) {
      return false;
    }

    // Actor type filter
    if (selectedActor !== 'all' && log.actor_type !== selectedActor) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = log.id.toLowerCase().includes(q);
      const matchCase = log.case_id?.toLowerCase().includes(q);
      const matchHosp = log.hospital_id?.toLowerCase().includes(q);
      const matchType = log.event_type.toLowerCase().includes(q);
      const matchActor = log.actor_type.toLowerCase().includes(q);
      return matchId || matchCase || matchHosp || matchType || matchActor;
    }

    return true;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `raahi_audit_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActorIcon = (actor: string) => {
    switch (actor) {
      case 'ambulance':
        return <Ambulance className="w-3.5 h-3.5 text-[#DC2626]" />;
      case 'hospital':
        return <Building2 className="w-3.5 h-3.5 text-[#0284C7]" />;
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-[#D97706]" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-[#52796F]" />;
    }
  };

  const getEventBadge = (type: string) => {
    if (type.includes('ACCEPTED') || type.includes('APPROVED')) {
      return 'bg-[#EFF6F3] text-[#52796F] border-[#52796F]/30';
    }
    if (type.includes('REJECTED') || type.includes('DECLINED')) {
      return 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]';
    }
    if (type.includes('TIMED_OUT') || type.includes('WARNING')) {
      return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    }
    return 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E8E2D9] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="font-display font-black text-2xl text-[#2D231C]">
              Authoritative System Audit Log
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
              Oversight Only
            </span>
          </div>
          <p className="text-xs text-[#7D7067] font-medium mt-1">
            Immutable, cross-entity ledger recording emergency triage decisions, hospital commitments, and administrative changes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFF6F3] border border-[#52796F]/30 text-[11px] font-mono font-bold text-[#52796F]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#52796F]" />
            <span>Live Stream Connected</span>
          </div>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-1.5 rounded-xl border border-[#E8E2D9] hover:border-[#EA580C] bg-white text-xs font-mono font-bold text-[#2D231C] hover:text-[#EA580C] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#7D7067] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Case ID, Hospital, or Event Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono focus:border-[#EA580C] focus:outline-hidden"
          />
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#7D7067]" />
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold text-[#2D231C] bg-white focus:border-[#EA580C] focus:outline-hidden"
          >
            <option value="all">All Event Types ({logs.length})</option>
            {eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>

          {/* Actor Filter */}
          <select
            value={selectedActor}
            onChange={(e) => setSelectedActor(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold text-[#2D231C] bg-white focus:border-[#EA580C] focus:outline-hidden"
          >
            <option value="all">All Actors</option>
            <option value="ambulance">Ambulance Crews</option>
            <option value="hospital">Hospital ER Teams</option>
            <option value="admin">System Administrators</option>
            <option value="system">Engine / Autonomous</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table / Feed */}
      <div className="rounded-3xl bg-white border border-[#E8E2D9] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E2D9] bg-[#FAF8F5] flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#2D231C]">
            Showing {filteredLogs.length} audit entries
          </span>
          <span className="text-[10px] font-mono text-[#7D7067]">
            Timestamps synchronized with authoritative backend
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Clock className="w-8 h-8 text-[#E8E2D9] mx-auto" />
            <p className="font-bold text-sm text-[#2D231C]">No audit records match your filters.</p>
            <p className="text-xs text-[#7D7067]">Adjust your search query or event type selector.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E2D9]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const dateObj = new Date(
                typeof log.timestamp === 'number'
                  ? log.timestamp
                  : (log.timestamp as any)?.seconds
                  ? (log.timestamp as any).seconds * 1000
                  : Date.now()
              );

              return (
                <div key={log.id} className="p-4 hover:bg-[#FAF8F5]/60 transition-colors">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-[#E8E2D9] shadow-2xs">
                        {getActorIcon(log.actor_type)}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                              getEventBadge(log.event_type)
                            )}
                          >
                            {log.event_type}
                          </span>
                          <span className="text-[11px] font-mono text-[#7D7067]">
                            by <span className="font-bold capitalize text-[#2D231C]">{log.actor_type}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-[#7D7067] flex-wrap">
                          {log.case_id && (
                            <span>
                              Case: <strong className="text-[#2D231C]">{log.case_id}</strong>
                            </span>
                          )}
                          {log.hospital_id && (
                            <span>
                              • Hosp: <strong className="text-[#2D231C]">{log.hospital_id}</strong>
                            </span>
                          )}
                          {log.request_id && (
                            <span>
                              • Req: <strong className="text-[#2D231C]">{log.request_id.slice(0, 10)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-[11px] font-mono text-[#7D7067] tabular-nums">
                        {dateObj.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        • {dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>

                      <button
                        type="button"
                        className="p-1 rounded-lg border border-[#E8E2D9] bg-white text-[#7D7067]"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Decision Snapshot JSON Viewer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#E8E2D9] space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#7D7067]">
                        <div className="flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-[#EA580C]" />
                          <span>snapshot_of_data_at_decision_time</span>
                        </div>
                        <span>ID: {log.id}</span>
                      </div>

                      <pre className="p-3.5 rounded-2xl bg-[#1E1915] text-[#FED7AA] text-[11px] font-mono overflow-x-auto border border-[#E8E2D9]">
                        {JSON.stringify(log.snapshot_of_data_at_decision_time, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import { stateStore } from '../../services/stateStore';
import { subscribeToPushNotifications } from '../../services/notificationBus';
import type { AppNotification } from '../../types/domain';
import {
  Building2,
  Ambulance,
  Activity,
  Clock,
  Layers,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  ExternalLink,
  Radio,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';

export const EnhancedAdminDashboardPage: React.FC = () => {
  const [hospitalsCount, setHospitalsCount] = useState(0);
  const [ambulancesCount, setAmbulancesCount] = useState(0);
  const [activeCasesCount, setActiveCasesCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingRegistrationsCount, setPendingRegistrationsCount] = useState(0);
  const [globalNotifications, setGlobalNotifications] = useState<AppNotification[]>([]);

  const syncMetrics = () => {
    const state = stateStore.getState();
    setHospitalsCount(state.hospitals.length);
    setAmbulancesCount(Object.keys(state.ambulances || {}).length);
    const cases = Object.values(state.cases || {});
    setActiveCasesCount(cases.length);
    const requests = Object.values(state.requests || {});
    setPendingRequestsCount(requests.filter((r) => r.status === 'pending').length);
    const regs = Object.values(state.hospitalRegistrations || {});
    setPendingRegistrationsCount(regs.filter((r) => r.status === 'pending').length);
  };

  useEffect(() => {
    syncMetrics();
    const unsubStore = stateStore.subscribe(syncMetrics);

    // Global real-time stream for Admin (sees notifications across ALL roles)
    const unsubNotifs = subscribeToPushNotifications('admin', undefined, (list) => {
      setGlobalNotifications(list.slice(0, 15));
    });

    return () => {
      unsubStore();
      unsubNotifs();
    };
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />;
      case 'urgent':
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Regional Command Action Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Management Portals Navigation Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/admin/hospitals"
            className="p-4 rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#EA580C] shadow-xs flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-black text-sm text-[#2D231C] group-hover:text-[#EA580C] transition-colors">
                  Manage Hospitals
                </h4>
                <p className="text-[11px] font-mono text-[#7D7067]">
                  {hospitalsCount} accredited • Capacity & accreditation
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#7D7067] group-hover:text-[#EA580C] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/admin/ambulances"
            className="p-4 rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#EA580C] shadow-xs flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] group-hover:scale-105 transition-transform">
                <Ambulance className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-black text-sm text-[#2D231C] group-hover:text-[#EA580C] transition-colors">
                  Manage Ambulances
                </h4>
                <p className="text-[11px] font-mono text-[#7D7067]">
                  {ambulancesCount} units • Real-time telemetry
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#7D7067] group-hover:text-[#EA580C] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            to="/admin/audit-log"
            className="p-4 rounded-2xl bg-white border border-[#E8E2D9] hover:border-[#EA580C] shadow-xs flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-black text-sm text-[#2D231C] group-hover:text-[#EA580C] transition-colors">
                  Authoritative Audit Log
                </h4>
                <p className="text-[11px] font-mono text-[#7D7067]">
                  Full cross-entity decision trail
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#7D7067] group-hover:text-[#EA580C] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Live Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs">
            <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold block">
              Total Hospitals
            </span>
            <span className="text-xl font-black text-[#2D231C] mt-0.5 block">{hospitalsCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs">
            <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold block">
              Emergency Fleet
            </span>
            <span className="text-xl font-black text-[#2D231C] mt-0.5 block">{ambulancesCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs">
            <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold block">
              Active Cases
            </span>
            <span className="text-xl font-black text-[#EA580C] mt-0.5 block">{activeCasesCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs">
            <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold block">
              Pending Dispatches
            </span>
            <span className="text-xl font-black text-[#DC2626] mt-0.5 block">
              {pendingRequestsCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-[#E8E2D9] shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-[#7D7067] uppercase font-bold block">
              Pending Approvals
            </span>
            <span className="text-xl font-black text-[#D97706] mt-0.5 block">
              {pendingRegistrationsCount}
            </span>
          </div>
        </div>

        {/* Global Cross-Role Real-Time Notification Stream Panel */}
        <div className="p-4 rounded-3xl bg-white border border-[#E8E2D9] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-display font-black text-sm text-[#2D231C]">
                Global Cross-Role Event Stream
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFF6F3] text-[#52796F] border border-[#52796F]/30 font-bold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse text-[#52796F]" />
                <span>Live Push</span>
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#7D7067]">
              Admin monitors notifications addressed to Hospitals, Ambulances & Command
            </span>
          </div>

          {globalNotifications.length === 0 ? (
            <div className="py-4 text-center text-xs font-mono text-[#7D7067]">
              No events in current push stream.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {globalNotifications.map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {getSeverityIcon(n.severity)}
                      <strong className="text-[#2D231C] truncate text-[11px]">{n.title}</strong>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-sm bg-white border border-[#E8E2D9] text-[#7D7067] uppercase font-bold shrink-0">
                      {n.recipientRole}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#524438] line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between pt-0.5 text-[9px] font-mono text-[#7D7067]">
                    <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {n.caseId && <span>Case: {n.caseId.slice(0, 8)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Unmodified AdminDashboardPage */}
      <AdminDashboardPage />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useActiveRequests } from '../../hooks/useSubscriptions';
import { subscribeToPushNotifications } from '../../services/notificationBus';
import { stateStore } from '../../services/stateStore';
import { api } from '../../services/api';
import { isAudioUnlocked, unlockAudio, playAlertSound } from '../../utils/sound';
import { NotificationComposerModal } from './NotificationComposerModal';
import type { AppNotification } from '../../types/domain';
import type { UserRole } from '../../services/authStore';
import {
  Ambulance,
  Building2,
  Shield,
  Users,
  Layers,
  Volume2,
  VolumeX,
  RotateCcw,
  LogOut,
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Info,
  ShieldAlert,
  Clock,
  Sparkles,
  ExternalLink,
  Send,
  Trash2,
  Radio,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const RoleAwareAppHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: activeRequests } = useActiveRequests();

  const [audioActive, setAudioActive] = useState(isAudioUnlocked());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const prevCountRef = useRef(0);

  const role: UserRole = (user?.role === 'hospital' ? 'coordinator' : user?.role) || 'ambulance';

  const handleClearAll = async () => {
    await api.clearAllNotifications();
    setNotifications([]);
  };

  // Role Accent Color Scheme
  const roleConfig = {
    ambulance: {
      accentBorder: 'border-[#EF4444]/40',
      accentBg: 'bg-[#FEF2F2]',
      accentText: 'text-[#DC2626]',
      accentRing: 'ring-[#DC2626]/20',
      badgeBg: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
      activeNav: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
      dotColor: 'bg-[#DC2626]',
      roleLabel: 'Field EMS Dispatch',
    },
    coordinator: {
      accentBorder: 'border-[#0D9488]/40',
      accentBg: 'bg-[#F0FDFA]',
      accentText: 'text-[#0D9488]',
      accentRing: 'ring-[#0D9488]/20',
      badgeBg: 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]',
      activeNav: 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]',
      dotColor: 'bg-[#0D9488]',
      roleLabel: 'Emergency Coordinator',
    },
    hospital: {
      accentBorder: 'border-[#0D9488]/40',
      accentBg: 'bg-[#F0FDFA]',
      accentText: 'text-[#0D9488]',
      accentRing: 'ring-[#0D9488]/20',
      badgeBg: 'bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]',
      activeNav: 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]',
      dotColor: 'bg-[#0D9488]',
      roleLabel: 'Emergency Coordinator',
    },
    admin: {
      accentBorder: 'border-[#D97706]/40',
      accentBg: 'bg-[#FFFBEB]',
      accentText: 'text-[#D97706]',
      accentRing: 'ring-[#D97706]/20',
      badgeBg: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
      activeNav: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
      dotColor: 'bg-[#D97706]',
      roleLabel: 'Regional Health Command',
    },
    family: {
      accentBorder: 'border-[#059669]/40',
      accentBg: 'bg-[#ECFDF5]',
      accentText: 'text-[#059669]',
      accentRing: 'ring-[#059669]/20',
      badgeBg: 'bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]',
      activeNav: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
      dotColor: 'bg-[#059669]',
      roleLabel: 'Patient Next-of-Kin',
    },
  }[role];

  // Dynamic Navigation Map per role
  const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
    ambulance: [
      { path: '/ambulance', label: 'Dispatch', icon: Ambulance },
      { path: '/ambulance/mass-casualty', label: 'Mass-Casualty', icon: Users },
    ],
    coordinator: [
      {
        path: '/coordinator',
        label: 'Coordinator Console',
        icon: Building2,
      },
    ],
    hospital: [
      {
        path: '/coordinator',
        label: 'Coordinator Console',
        icon: Building2,
      },
    ],
    admin: [
      { path: '/admin', label: 'Oversight', icon: Shield },
      { path: '/admin/hospitals', label: 'Manage Hospitals', icon: Building2 },
      { path: '/admin/ambulances', label: 'Manage Ambulances', icon: Ambulance },
      { path: '/admin/audit-log', label: 'Audit Log', icon: Layers },
    ],
    family: [],
  };

  const navItems = NAV_BY_ROLE[role] || [];

  // Subscribe to push notifications (ZERO interval polling)
  useEffect(() => {
    const recipientTarget =
      role === 'coordinator'
        ? 'all'
        : (user?.badge || 'all');

    const unsub = subscribeToPushNotifications(role, recipientTarget, (list) => {
      setNotifications(list);

      const unread = list.filter((n) => !n.read).length;
      if (unread > prevCountRef.current && isAudioUnlocked()) {
        playAlertSound();
      }
      prevCountRef.current = unread;
      setPrevUnreadCount(unread);
    });

    return unsub;
  }, [role, user?.badge, user?.redirectPath]);

  const handleAudioToggle = () => {
    const success = unlockAudio();
    if (success) {
      setAudioActive(true);
      playAlertSound();
    }
  };

  const handleReset = () => {
    stateStore.resetToSeed();
    window.location.reload();
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      stateStore.markNotificationRead(n.id);
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = (id: string) => {
    stateStore.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  // Don't render top nav on login page or standalone family tracking
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/track/')) {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const primaryPending = activeRequests.length > 0 ? activeRequests[0] : null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />;
      case 'urgent':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <>
      <header
        className={clsx(
          'sticky top-0 z-40 select-none bg-white/95 backdrop-blur-md border-b transition-colors duration-300 shadow-xs',
          roleConfig.accentBorder
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Metaphor Logo */}
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/raahi-logo.png"
                alt="Raahi Logo"
                className="w-8 h-8 rounded-xl object-contain shadow-xs border border-[#E8E2D9] group-hover:scale-105 transition-transform bg-white p-0.5"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-base tracking-tight text-[#2D231C] group-hover:text-[#EA580C] transition-colors">
                    Raahi
                  </span>
                  <span
                    className={clsx(
                      'text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase font-black border tracking-wider',
                      roleConfig.badgeBg
                    )}
                  >
                    {role}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#7D7067] hidden sm:block">
                  {roleConfig.roleLabel}
                </span>
              </div>
            </Link>

            {/* Dynamic Role-Filtered Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 border-l border-[#E8E2D9] pl-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/ambulance'
                    ? location.pathname === '/ambulance' || location.pathname.startsWith('/ambulance/case_')
                    : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all',
                      isActive
                        ? clsx('border shadow-xs', roleConfig.activeNav)
                        : 'text-[#7D7067] hover:text-[#2D231C] hover:bg-[#F4EFE6]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2.5">
            {/* Active In-Flight Case Notification Pill */}
            {primaryPending && (
              <button
                onClick={() => navigate(`/ambulance/${primaryPending.case_id}`)}
                className="px-3 py-1.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-mono font-black flex items-center gap-2 hover:bg-[#FECACA] transition-all animate-pulse shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                <span className="hidden sm:inline">Active:</span>
                <span>{primaryPending.case_id.slice(0, 10)}</span>
              </button>
            )}

            {/* Real Local Alert Dispatch Button */}
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl border border-[#EA580C]/30 bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              title="Dispatch Real Notification Locally"
            >
              <Send className="w-3.5 h-3.5 text-[#EA580C]" />
              <span className="hidden sm:inline">Send Alert</span>
            </button>

            {/* Push-Based Real-Time Notification Bell */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={clsx(
                'relative p-2 rounded-xl border bg-white hover:bg-[#FAF8F5] text-[#2D231C] transition-all shadow-xs group',
                unreadCount > 0 ? roleConfig.accentBorder : 'border-[#E8E2D9]'
              )}
              title="Real-Time Network Alerts"
              aria-label="Open notifications drawer"
            >
              <Bell
                className={clsx(
                  'w-4 h-4 transition-transform group-hover:scale-110',
                  unreadCount > 0 ? roleConfig.accentText : 'text-[#7D7067]'
                )}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Audio Alerts Tone Toggle */}
            <button
              onClick={handleAudioToggle}
              className={clsx(
                'p-2 rounded-xl border transition-all duration-180 shadow-xs',
                audioActive
                  ? 'border-[#52796F] text-[#52796F] bg-[#EFF6F3]'
                  : 'border-[#D97706] text-[#D97706] bg-[#FEF3C7] hover:bg-[#FDE68A] animate-pulse'
              )}
              title={audioActive ? 'Audio tone active' : 'Click to unlock audio chime alerts'}
            >
              {audioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reset Demo Data */}
            <button
              onClick={handleReset}
              className="p-2 rounded-xl border border-[#E8E2D9] text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5] transition-colors shadow-xs"
              title="Reset to clean demo data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* User Session Info & Role Switcher */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#E8E2D9]">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#2D231C] truncate max-w-[130px]">
                    {user.name}
                  </span>
                  <span
                    className={clsx(
                      'text-[9px] font-mono font-bold uppercase tracking-wider',
                      roleConfig.accentText
                    )}
                  >
                    {user.badge}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1.5 rounded-xl border border-[#E8E2D9] hover:border-[#DC2626]/50 bg-white hover:bg-[#FEF2F2] text-xs font-mono font-bold text-[#7D7067] hover:text-[#DC2626] flex items-center gap-1.5 transition-all shadow-xs"
                  title="Switch console role"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Switch</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Real-Time Push Notification Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E8E2D9] transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2.5">
                <Bell className={clsx('w-5 h-5', roleConfig.accentText)} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-black text-[#2D231C] text-base">
                      {role === 'admin' ? 'Network-Wide Alerts' : 'Role Alerts'}
                    </h3>
                    <span
                      className={clsx(
                        'text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase',
                        roleConfig.badgeBg
                      )}
                    >
                      {role}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#7D7067]">
                    Real Local Push • No Automated Spam
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="text-xs font-mono text-[#EA580C] hover:bg-[#FFF7ED] flex items-center gap-1 font-bold px-2 py-1 rounded-lg border border-[#EA580C]/30 transition-colors"
                  title="Dispatch a real notification locally"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-mono text-[#7D7067] hover:text-red-600 flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-mono text-[#7D7067] hover:text-[#EA580C] flex items-center gap-1 font-bold px-2 py-1 rounded-lg hover:bg-white"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#E8E2D9]/40 text-[#7D7067] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {notifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-[#7D7067] text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D9] flex items-center justify-center text-[#A89F91]">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#2D231C]">No Active Notifications</p>
                    <p className="text-xs text-[#7D7067] max-w-xs mt-1">
                      No fake or automated notifications. Only real alerts that you dispatch locally will appear here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#EA580C] text-white text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-[#C2410C] transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Real Alert Now</span>
                  </button>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={clsx(
                      'p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative group',
                      n.read
                        ? 'border-[#E8E2D9] bg-white opacity-75 hover:opacity-100'
                        : 'border-[#EA580C]/40 bg-[#FFF7ED]/60 shadow-xs'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(n.severity)}
                        <h4 className="font-bold text-xs text-[#2D231C] leading-snug">{n.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-[#7D7067] shrink-0">
                        {new Date(n.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-[#524438] leading-relaxed pl-6">{n.message}</p>

                    <div className="pl-6 pt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {n.caseId && (
                          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9] text-[#7D7067]">
                            Case: {n.caseId}
                          </span>
                        )}
                        {n.hospitalId && (
                          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-md border border-[#E8E2D9] text-[#7D7067]">
                            Hosp: {n.hospitalId}
                          </span>
                        )}
                      </div>

                      {n.caseId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerOpen(false);
                            navigate(`/ambulance/${n.caseId}`);
                          }}
                          className="text-[11px] font-mono text-[#EA580C] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Real Local Notification Composer Modal */}
      <NotificationComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        defaultRole={role}
        onSuccess={() => {
          setDrawerOpen(true);
        }}
      />
    </>
  );
};

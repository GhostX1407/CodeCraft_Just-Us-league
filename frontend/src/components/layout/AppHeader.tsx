import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useActiveRequests } from '../../hooks/useSubscriptions';
import { useAuth } from '../../hooks/useAuth';
import { isAudioUnlocked, unlockAudio, playAlertSound } from '../../utils/sound';
import { stateStore } from '../../services/stateStore';
import {
  Ambulance,
  Building2,
  Shield,
  Users,
  HeartHandshake,
  Layers,
  Volume2,
  VolumeX,
  RotateCcw,
  LogOut,
  UserCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { NotificationDrawer } from './NotificationDrawer';

export const AppHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: activeRequests } = useActiveRequests();
  const [audioActive, setAudioActive] = useState(isAudioUnlocked());

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

  const navItems = [
    { path: '/ambulance', label: 'Ambulance Dispatch', icon: Ambulance },
    { path: '/hospital', label: 'Hospital Console', icon: Building2 },
    { path: '/admin', label: 'Admin Oversight', icon: Shield },
    { path: '/ambulance/mass-casualty', label: 'Mass-Casualty', icon: Users },
    { path: '/dev/components', label: 'Component Gallery', icon: Layers },
  ];

  // Don't show top nav on login page or family tracking page to maintain plain reassurance posture
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/track/')) {
    return null;
  }

  const primaryPending = activeRequests.length > 0 ? activeRequests[0] : null;

  return (
    <header className="border-b border-[#E8E2D9] bg-white/95 backdrop-blur-md sticky top-0 z-40 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Metaphor Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/raahi-logo.png"
              alt="Raahi Logo"
              className="w-8 h-8 rounded-xl object-contain shadow-xs border border-[#FED7AA] group-hover:scale-105 transition-transform bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-[#2D231C] font-sans group-hover:text-[#EA580C] transition-colors">
                  Raahi
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] uppercase font-black">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#7D7067] hidden sm:block">
                Capability-Match Routing Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 border-l border-[#E8E2D9] pl-6">
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
                    'px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all',
                    isActive
                      ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] shadow-xs'
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
        <div className="flex items-center gap-3">
          {/* Active In-Flight Case Notification Pill */}
          {primaryPending && (
            <button
              onClick={() => navigate(`/ambulance/${primaryPending.case_id}`)}
              className="px-3 py-1.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-mono font-black flex items-center gap-2 hover:bg-[#FECACA] transition-all animate-pulse shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
              <span>Active: {primaryPending.case_id.slice(0, 11)}</span>
            </button>
          )}

          {/* Role Notification Drawer */}
          <NotificationDrawer currentRole={user?.role || 'admin'} recipientId={user?.badge} />

          <button
            onClick={handleAudioToggle}
            className={clsx(
              'px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs',
              audioActive
                ? 'border-[#52796F]/40 text-[#52796F] bg-[#EFF6F3]'
                : 'border-[#F59E0B]/50 text-[#B45309] bg-[#FEF3C7] hover:bg-[#FDE68A] animate-pulse'
            )}
            title={audioActive ? 'Alert tone active' : 'Click to enable audio tone alerts'}
          >
            {audioActive ? <Volume2 className="w-4 h-4 text-[#52796F]" /> : <VolumeX className="w-4 h-4 text-[#B45309]" />}
            <span className="hidden lg:inline text-[11px]">
              {audioActive ? 'Audio Live' : 'Enable Tone'}
            </span>
          </button>

          {/* User Session Badge & Switch Role */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E2D9]">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-[#2D231C] truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-[#EA580C] font-bold uppercase">
                  {user.badge}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-xl border border-[#E8E2D9] hover:border-[#EA580C]/50 bg-white hover:bg-[#FAF8F5] text-xs font-mono font-bold text-[#7D7067] hover:text-[#2D231C] flex items-center gap-1.5 transition-all shadow-xs"
                title="Switch role / sign in as another user"
              >
                <LogOut className="w-3.5 h-3.5 text-[#EA580C]" />
                <span className="hidden md:inline">Switch Role</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] hover:bg-[#EA580C] hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Reset Demo State Button */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl border border-[#E8E2D9] text-[#7D7067] hover:text-[#2D231C] hover:bg-[#FAF8F5] transition-colors shadow-xs"
            title="Reset to clean demo data"
          >
            <RotateCcw className="w-4 h-4 text-[#7D7067]" />
          </button>
        </div>
      </div>
    </header>
  );
};

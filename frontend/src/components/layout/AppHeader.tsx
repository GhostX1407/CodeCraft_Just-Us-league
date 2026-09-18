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
    <header className="border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md sticky top-0 z-40 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Metaphor Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-[#E6F7F7] border border-[#149B9E]/40 flex items-center justify-center text-[#149B9E] font-mono font-black text-base shadow-xs group-hover:border-[#149B9E] group-hover:bg-[#149B9E] group-hover:text-white transition-all">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-[#0F172A] font-sans group-hover:text-[#149B9E] transition-colors">
                  Raahi
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#E6F7F7] text-[#0D7C7E] border border-[#149B9E]/30 uppercase font-black">
                  v1.0
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#64748B] hidden sm:block">
                Capability-Match Routing Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 border-l border-[#E2E8F0] pl-6">
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
                      ? 'bg-[#E6F7F7] text-[#0D7C7E] border border-[#149B9E]/40 shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
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
              className="px-3 py-1.5 rounded-xl bg-[#FFE4E6] border border-[#FECDD3] text-[#E11D48] text-xs font-mono font-black flex items-center gap-2 hover:bg-[#FECDD3] transition-all animate-pulse shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              <span>Active: {primaryPending.case_id.slice(0, 11)}</span>
            </button>
          )}

          {/* Audio Tone Button */}
          <button
            onClick={handleAudioToggle}
            className={clsx(
              'px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-xs',
              audioActive
                ? 'border-[#0D9488]/40 text-[#0F766E] bg-[#CCFBF1]'
                : 'border-[#F59E0B]/50 text-[#B45309] bg-[#FEF3C7] hover:bg-[#FDE68A] animate-pulse'
            )}
            title={audioActive ? 'Alert tone active' : 'Click to enable audio tone alerts'}
          >
            {audioActive ? <Volume2 className="w-4 h-4 text-[#0D9488]" /> : <VolumeX className="w-4 h-4 text-[#B45309]" />}
            <span className="hidden lg:inline text-[11px]">
              {audioActive ? 'Audio Live' : 'Enable Tone'}
            </span>
          </button>

          {/* User Session Badge & Switch Role */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-[#0F172A] truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] font-mono text-[#149B9E] font-bold uppercase">
                  {user.badge}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-xl border border-[#E2E8F0] hover:border-[#149B9E]/50 bg-white hover:bg-[#F8FAFC] text-xs font-mono font-bold text-[#475569] hover:text-[#0F172A] flex items-center gap-1.5 transition-all shadow-xs"
                title="Switch role / sign in as another user"
              >
                <LogOut className="w-3.5 h-3.5 text-[#149B9E]" />
                <span className="hidden md:inline">Switch Role</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 rounded-xl bg-[#E6F7F7] border border-[#149B9E]/40 text-[#0D7C7E] hover:bg-[#149B9E] hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Reset Demo State Button */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-xs"
            title="Reset to clean demo data"
          >
            <RotateCcw className="w-4 h-4 text-[#64748B]" />
          </button>
        </div>
      </div>
    </header>
  );
};

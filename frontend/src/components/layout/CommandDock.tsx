import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useActiveRequests } from '../../hooks/useSubscriptions';
import { isAudioUnlocked, unlockAudio, playAlertSound } from '../../utils/sound';
import { stateStore } from '../../services/stateStore';
import {
  Ambulance,
  Building2,
  Shield,
  Users,
  Layers,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Radio,
  Clock,
  Activity,
  LogOut,
  UserCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';

export const CommandDock: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: activeRequests } = useActiveRequests();
  const [audioActive, setAudioActive] = useState(isAudioUnlocked());
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSurfaces = [
    { path: '/ambulance', label: 'Ambulance', icon: Ambulance },
    { path: '/hospital', label: 'Hospital', icon: Building2 },
    { path: '/admin', label: 'Network Map', icon: Shield },
    { path: '/ambulance/mass-casualty', label: 'Mass-Casualty', icon: Users },
  ];

  // Hidden on login page and family tracking to keep pure dedicated posture
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/track/')) {
    return null;
  }

  const activeRequest = activeRequests.length > 0 ? activeRequests[0] : null;

  return (
    <div className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-3 pointer-events-none select-none">
      <nav
        aria-label="System Command Dock"
        className="pointer-events-auto bg-white/95 backdrop-blur-2xl border border-[#E8E2D9] rounded-full px-3 sm:px-4 py-2 shadow-[0_16px_40px_rgba(45,35,28,0.08)] flex items-center gap-2 sm:gap-3 transition-all duration-300 ring-1 ring-[#EA580C]/[0.12]"
      >
        {/* Brand Core */}
        <Link
          to="/"
          className="flex items-center gap-2.5 pr-2.5 sm:pr-3 border-r border-[#E8E2D9] hover:opacity-90 transition-opacity group"
        >
          <img
            src="/raahi-logo.png"
            alt="Raahi Logo"
            className="w-9 h-9 rounded-xl object-contain shadow-xs border border-[#FED7AA] group-hover:scale-105 transition-transform bg-white p-0.5"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-base tracking-tight text-[#2D231C]">
                Raahi
              </span>
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#5C4E45] font-extrabold hidden lg:flex tracking-wider uppercase">
              <Activity className="w-3 h-3 text-[#EA580C]" />
              <span>Routing Core</span>
            </div>
          </div>
        </Link>

        {/* Surface Posture Buttons */}
        <div className="flex items-center gap-1.5">
          {navSurfaces.map((item) => {
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
                  'px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-sans transition-all duration-200 flex items-center gap-2',
                  isActive
                    ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] font-extrabold shadow-xs'
                    : 'text-[#5C4E45] hover:text-[#2D231C] hover:bg-[#F4EFE6] border border-transparent font-bold'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Dynamic Focus Pill: Active Urgent Request in Flight */}
        {activeRequest && (
          <button
            onClick={() => navigate(`/ambulance/${activeRequest.case_id}`)}
            className="px-3 py-1.5 rounded-full bg-[#FFF7ED] border border-[#EA580C] text-[#C2410C] text-xs font-mono font-bold flex items-center gap-2 hover:bg-[#FFEDD5] transition-all animate-pulse shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
            <span className="hidden sm:inline">Active:</span>
            <span>{activeRequest.case_id.slice(0, 10)}</span>
          </button>
        )}

        {/* Live System Time in Tabular Mono */}
        {currentTime && (
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-[11px] font-mono text-[#2D231C] font-bold tabular-nums">
            <Clock className="w-3 h-3 text-[#EA580C]" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Utility Controls */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#E8E2D9]">
          {/* Audio Chime Trigger */}
          <button
            onClick={handleAudioToggle}
            className={clsx(
              'p-2 rounded-full border transition-all duration-180',
              audioActive
                ? 'border-[#52796F] text-[#52796F] bg-[#EFF6F3] shadow-xs'
                : 'border-[#D97706] text-[#D97706] bg-[#FEF3C7] hover:bg-[#FDE68A] animate-pulse'
            )}
            title={audioActive ? 'Alert tone active (Web Audio API)' : 'Click to unlock alert audio chime'}
          >
            {audioActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Component Gallery */}
          <Link
            to="/dev/components"
            className="p-2 rounded-full border border-[#E8E2D9] text-[#7D7067] hover:text-[#2D231C] hover:bg-[#F4EFE6] transition-colors"
            title="Open Component Testbench"
          >
            <Layers className="w-3.5 h-3.5" />
          </Link>

          {/* Reset Demo Data */}
          <button
            onClick={handleReset}
            className="p-2 rounded-full border border-[#E8E2D9] text-[#7D7067] hover:text-[#2D231C] hover:bg-[#F4EFE6] transition-colors"
            title="Reset to clean initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* User Session Pill if logged in */}
          {user && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E8E2D9] text-xs font-sans font-bold">
              <span className="w-2 h-2 rounded-full bg-[#52796F]" />
              <span className="text-[#2D231C] truncate max-w-[130px] font-extrabold">{user.name.split(' ')[0]}</span>
              <span className="text-[11px] font-mono text-[#EA580C] font-extrabold uppercase">({user.badge})</span>
            </div>
          )}

          {/* Dedicated Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] hover:text-[#B91C1C] text-xs sm:text-sm font-sans font-extrabold transition-all shadow-xs group cursor-pointer"
            title="Sign out and return to login"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

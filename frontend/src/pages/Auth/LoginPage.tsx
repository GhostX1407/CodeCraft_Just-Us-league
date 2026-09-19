import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { DEMO_ACCOUNTS } from '../../services/authStore';
import { LogoIntroOverlay } from '../../components/layout/LogoIntroOverlay';
import { Soft3DRibbonCanvas } from '../../components/layout/Soft3DRibbonCanvas';
import {
  Ambulance,
  Building2,
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Check,
} from 'lucide-react';
import clsx from 'clsx';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  // If user is already logged in, redirect them to their destination directly without intro
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.redirectPath || '/ambulance', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // When user is not logged in, video plays upon opening or reloading the login page
  const [showIntro, setShowIntro] = useState(() => !isAuthenticated);
  const [introFinished, setIntroFinished] = useState(() => isAuthenticated);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setIntroFinished(true);
  };

  // Soft 3D wave ribbons appear smoothly 2 seconds after the login page emerges
  const [showRibbons, setShowRibbons] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (introFinished) {
      timer = setTimeout(() => {
        setShowRibbons(true);
      }, 2000);
    } else {
      setShowRibbons(false);
    }
    return () => clearTimeout(timer);
  }, [introFinished]);

  // Development helper on window to test intro or manual control
  useEffect(() => {
    (window as unknown as { replayRaahiIntro?: () => void }).replayRaahiIntro = () => {
      setShowIntro(true);
      setIntroFinished(false);
      setShowRibbons(false);
    };
  }, []);

  const [selectedRole, setSelectedRole] = useState<'ambulance' | 'coordinator' | 'admin'>('ambulance');
  // Inputs start empty - not hardcoded
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const activeRoles: { key: 'ambulance' | 'coordinator' | 'admin'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'ambulance', label: 'Ambulance Dispatch', icon: Ambulance },
    { key: 'coordinator', label: 'Coordinator Dispatch', icon: Building2 },
    { key: 'admin', label: 'Regional Oversight', icon: Shield },
  ];

  // Role switch handler - changes role and clears inputs for clean entry
  const handleSelectRole = (role: 'ambulance' | 'coordinator' | 'admin') => {
    setSelectedRole(role);
    setError(null);
    setUsername('');
    setPassword('');
    setApplied(false);
  };

  // Form submit handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your identity / email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your access password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = login(username, password, selectedRole);
      setLoading(false);
      if (res.success && res.user) {
        navigate(res.user.redirectPath);
      } else {
        setError(res.message || 'Authentication failed. Please verify your credentials.');
      }
    }, 300);
  };

  // Helper to click-to-apply credentials into inputs
  const handleApplyCredentials = () => {
    const creds = DEMO_ACCOUNTS[selectedRole];
    setUsername(creds.username);
    setPassword(creds.password);
    setError(null);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const ROLE_THEME = {
    ambulance: {
      name: 'Ambulance EMT',
      accentText: 'text-[#EA580C]',
      accentBg: 'bg-[#FFF7ED]',
      accentBorder: 'border-[#FED7AA]',
      topBar: 'from-[#EA580C] via-[#F59E0B] to-[#EA580C]',
      btnGradient: 'from-[#EA580C] via-[#F97316] to-[#EA580C]',
      btnShadow: 'shadow-[#EA580C]/25',
      focusBorder: 'focus:border-[#EA580C] focus:ring-[#EA580C]/20',
      dotBg: 'bg-[#EA580C]',
    },
    coordinator: {
      name: 'Emergency Coordinator',
      accentText: 'text-[#0D9488]',
      accentBg: 'bg-[#F0FDFA]',
      accentBorder: 'border-[#99F6E4]',
      topBar: 'from-[#0D9488] via-[#14B8A6] to-[#0D9488]',
      btnGradient: 'from-[#0D9488] via-[#14B8A6] to-[#0D9488]',
      btnShadow: 'shadow-[#0D9488]/25',
      focusBorder: 'focus:border-[#0D9488] focus:ring-[#0D9488]/20',
      dotBg: 'bg-[#0D9488]',
    },
    admin: {
      name: 'Regional Admin',
      accentText: 'text-[#4F46E5]',
      accentBg: 'bg-[#EEF2FF]',
      accentBorder: 'border-[#C7D2FE]',
      topBar: 'from-[#4F46E5] via-[#6366F1] to-[#4F46E5]',
      btnGradient: 'from-[#4F46E5] via-[#6366F1] to-[#4F46E5]',
      btnShadow: 'shadow-[#4F46E5]/25',
      focusBorder: 'focus:border-[#4F46E5] focus:ring-[#4F46E5]/20',
      dotBg: 'bg-[#4F46E5]',
    },
  };

  const currentRoleMeta = activeRoles.find((r) => r.key === selectedRole) || activeRoles[0];
  const ActiveIcon = currentRoleMeta.icon;
  const currentTheme = ROLE_THEME[selectedRole];

  return (
    <>
      {/* One-Time Animated Raahi Logo Intro Overlay */}
      {showIntro && <LogoIntroOverlay onComplete={handleIntroComplete} />}

      {/* Main Login Page Container - Quietly Emerges after Intro */}
      <div
        className={clsx(
          'min-h-screen bg-[#FAF8F5] text-[#2D231C] flex flex-col justify-between p-4 sm:p-6 font-sans select-none relative z-10 overflow-hidden transition-all duration-700 ease-out',
          introFinished ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        )}
      >
        {/* Soft Horizontal 3D Wave Ribbons - Emerges 2s After Login Page Appears */}
        <Soft3DRibbonCanvas visible={showRibbons} />

        {/* Top Header */}
        <header className="w-full flex items-center justify-between pb-4 border-b border-[#E8E2D9] relative z-10">
          <div className="flex items-center gap-3.5">
            <img
              src="/raahi-logo.png"
              alt="Raahi Logo"
              className="w-12 h-12 rounded-2xl object-contain shadow-xs border border-[#E8E2D9] bg-white p-0.5 hover:scale-105 transition-transform duration-300"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-display font-black text-[#2D231C] tracking-tight">
                  Raahi
                </span>
                <span className="text-xs font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                  EMS Gateway
                </span>
              </div>
              <p className="text-sm font-medium text-[#5C4E45]">
                Smart Emergency Medical Routing
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#EFF6F3] px-3 py-1.5 rounded-full border border-[#52796F]/30">
            <span className="w-2.5 h-2.5 rounded-full bg-[#52796F] animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#52796F] uppercase tracking-wider">
              Network Online
            </span>
          </div>
        </header>

        {/* Main Login Card Section */}
        <main className="max-w-md mx-auto w-full my-auto py-6 relative z-10">
          <div className="bg-white border border-[#E8E2D9] rounded-3xl overflow-hidden shadow-[0_12px_36px_rgba(45,35,28,0.06)] hover:shadow-[0_16px_44px_rgba(45,35,28,0.09)] transition-shadow duration-300">
            {/* Smooth Role Top Accent Line */}
            <div className={clsx("h-1 w-full bg-gradient-to-r transition-all duration-500 ease-out", currentTheme.topBar)} />

            <div className="p-6 sm:p-8">
              {/* 3 Clean Role Segmented Switcher with Smooth Sliding Indicator */}
              <div className="relative grid grid-cols-3 gap-1.5 p-1.5 bg-[#F4EFE6] rounded-2xl border border-[#E8E2D9] mb-6">
                {/* Sliding Active Background Pill */}
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-xl bg-white shadow-[0_2px_8px_rgba(45,35,28,0.08)] border border-[#E8E2D9] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    width: 'calc((100% - 24px) / 3)',
                    left: '6px',
                    transform: `translateX(${
                      selectedRole === 'ambulance'
                        ? '0%'
                        : selectedRole === 'coordinator'
                        ? 'calc(100% + 6px)'
                        : 'calc(200% + 12px)'
                    })`,
                  }}
                />

                {activeRoles.map((roleItem) => {
                  const Icon = roleItem.icon;
                  const isActive = selectedRole === roleItem.key;
                  const itemTheme = ROLE_THEME[roleItem.key];
                  return (
                    <button
                      key={roleItem.key}
                      type="button"
                      onClick={() => handleSelectRole(roleItem.key)}
                      className={clsx(
                        'relative z-10 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-sans flex flex-col items-center justify-center gap-1.5 transition-all duration-200 select-none cursor-pointer',
                        isActive
                          ? 'text-[#2D231C] font-extrabold'
                          : 'text-[#7D7067] hover:text-[#2D231C] font-semibold'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-300',
                          isActive ? clsx(itemTheme.accentText, 'scale-110') : 'text-[#7D7067] scale-100'
                        )}
                      />
                      <span className="truncate max-w-full">
                        {roleItem.key === 'ambulance' ? 'Ambulance' : roleItem.key === 'coordinator' ? 'Coordinator' : 'Admin'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Form Header with Smooth Role Transition */}
              <div key={selectedRole} className="flex items-center gap-3.5 pb-5 border-b border-[#E8E2D9] mb-5 animate-role-glide">
                <div
                  className={clsx(
                    "w-11 h-11 rounded-2xl border flex items-center justify-center shadow-2xs transition-all duration-300 animate-role-pop",
                    currentTheme.accentBg,
                    currentTheme.accentBorder,
                    currentTheme.accentText
                  )}
                >
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-display font-black text-[#2D231C] tracking-tight">
                    {currentTheme.name}
                  </h1>
                  <p className="text-sm font-medium text-[#5C4E45] truncate">
                    {DEMO_ACCOUNTS[selectedRole].subtitle}
                  </p>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-bold flex items-center gap-2 animate-role-glide">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#5C4E45] mb-1.5">
                    Username / Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D7067]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter authorized username or email"
                      className={clsx(
                        "w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] text-sm font-medium text-[#2D231C] placeholder-[#A89F97] focus:outline-none focus:ring-2 transition-all duration-200",
                        currentTheme.focusBorder
                      )}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#5C4E45] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5C4E45]">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter access password"
                      className={clsx(
                        "w-full pl-11 pr-11 py-3 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] text-base font-semibold text-[#2D231C] placeholder-[#8C827A] focus:outline-none focus:ring-2 transition-all duration-200 font-mono",
                        currentTheme.focusBorder
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5C4E45] hover:text-[#2D231C] active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Sign In CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                      "w-full py-3.5 px-4 rounded-xl bg-gradient-to-r text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-300 disabled:opacity-60 cursor-pointer",
                      currentTheme.btnGradient,
                      currentTheme.btnShadow
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Signing in…</span>
                      </span>
                    ) : (
                      <span key={selectedRole} className="inline-flex items-center gap-2 animate-role-glide">
                        <span>Sign In to {currentTheme.name}</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

        {/* Bottom Area: Left-Corner Credentials & Right-Corner Compliance */}
        <footer className="w-full flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pt-4 border-t border-[#E8E2D9] relative z-10">
          {/* Full Left Side Corner at Bottom: Shows ONLY the Selected Role's Credential */}
          <div key={selectedRole} className="text-left font-mono animate-role-glide">
            <div className="text-xs uppercase font-extrabold text-[#5C4E45] tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className={clsx("w-2 h-2 rounded-full transition-colors duration-300", currentTheme.dotBg)} />
              <span>{currentTheme.name} Demo Credentials:</span>
            </div>
            <div
              onClick={handleApplyCredentials}
              className="text-sm font-semibold text-[#2D231C] bg-white border border-[#E8E2D9] px-4 py-2.5 rounded-xl shadow-xs cursor-pointer hover:border-[#E8E2D9] hover:shadow-sm transition-all duration-200 flex items-center gap-3 group"
              title="Click to auto-enter credentials"
            >
              <div>
                <span className="font-bold text-[#5C4E45]">Username:</span>{' '}
                <span className="text-[#2D231C] font-extrabold select-all">{DEMO_ACCOUNTS[selectedRole].username}</span>
              </div>
              <span className="text-[#D8CFBF]">•</span>
              <div>
                <span className="font-bold text-[#5C4E45]">Password:</span>{' '}
                <span className="text-[#2D231C] font-extrabold select-all">{DEMO_ACCOUNTS[selectedRole].password}</span>
              </div>
              {applied ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#52796F] bg-[#EFF6F3] px-2 py-0.5 rounded-md ml-1 border border-[#52796F]/30 animate-role-pop">
                  <Check className="w-3.5 h-3.5" />
                  Applied
                </span>
              ) : (
                <span className="text-xs font-bold text-[#8C827A] group-hover:text-[#2D231C] transition-colors ml-1">
                  (click to enter)
                </span>
              )}
            </div>
          </div>

          {/* Full Right Side Corner at Bottom: DISHA & HIPAA Architecture */}
          <div className="text-left sm:text-right font-sans">
            <div className="font-bold text-sm text-[#2D231C]">DISHA &amp; HIPAA Compliant Network</div>
            <div className="mt-0.5 text-xs font-semibold text-[#5C4E45]">Raahi Emergency Medical Network • 256-bit Encryption</div>
          </div>
        </footer>
    </div>
  </>
);
};



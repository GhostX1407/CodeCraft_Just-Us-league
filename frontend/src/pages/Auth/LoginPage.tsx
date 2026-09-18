import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { DEMO_ACCOUNTS, UserRole } from '../../services/authStore';
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
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'ambulance' | 'hospital' | 'admin'>('ambulance');
  // Inputs start empty - not hardcoded
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const activeRoles: { key: 'ambulance' | 'hospital' | 'admin'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'ambulance', label: 'Ambulance Dispatch', icon: Ambulance },
    { key: 'hospital', label: 'Hospital Reception', icon: Building2 },
    { key: 'admin', label: 'Regional Oversight', icon: Shield },
  ];

  // Role switch handler - changes role and clears inputs for clean entry
  const handleSelectRole = (role: 'ambulance' | 'hospital' | 'admin') => {
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

  const currentRoleMeta = activeRoles.find((r) => r.key === selectedRole) || activeRoles[0];
  const ActiveIcon = currentRoleMeta.icon;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D231C] flex flex-col justify-between p-4 sm:p-6 font-sans select-none relative z-10">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between pb-4 border-b border-[#E8E2D9]">
        <div className="flex items-center gap-3.5">
          <img
            src="/raahi-logo.png"
            alt="Raahi Logo"
            className="w-11 h-11 rounded-2xl object-contain shadow-xs border border-[#E8E2D9] bg-white p-0.5"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-display font-black text-[#2D231C] tracking-tight">
                Raahi
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]">
                EMS Gateway
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-[#7D7067]">
              Capability-Match Emergency Medical Routing Platform
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#52796F] animate-pulse" />
          <span className="text-xs font-mono font-bold text-[#52796F] uppercase tracking-wider">
            Network Operations Online
          </span>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(45,35,28,0.06)]">
          {/* 3 Clean Role Segmented Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4EFE6] rounded-2xl border border-[#E8E2D9] mb-6">
            {activeRoles.map((roleItem) => {
              const Icon = roleItem.icon;
              const isActive = selectedRole === roleItem.key;
              return (
                <button
                  key={roleItem.key}
                  type="button"
                  onClick={() => handleSelectRole(roleItem.key)}
                  className={clsx(
                    'py-2 px-1 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all duration-150 select-none',
                    isActive
                      ? 'bg-white text-[#2D231C] shadow-xs border border-[#E8E2D9]'
                      : 'text-[#7D7067] hover:text-[#2D231C]'
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-[#EA580C]' : 'text-[#7D7067]')} />
                  <span className="text-[10px] truncate max-w-full">
                    {roleItem.key === 'ambulance' ? 'Ambulance' : roleItem.key === 'hospital' ? 'Hospital' : 'Admin'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Form Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#E8E2D9] mb-5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C] shadow-2xs">
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black text-[#2D231C] tracking-tight">
                {DEMO_ACCOUNTS[selectedRole].title} Sign In
              </h1>
              <p className="text-xs font-mono font-semibold text-[#7D7067]">
                {DEMO_ACCOUNTS[selectedRole].subtitle}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-bold flex items-center gap-2">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] text-sm font-medium text-[#2D231C] placeholder-[#A89F97] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/25 focus:border-[#EA580C] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-[#5C4E45] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D7067]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] text-sm font-mono text-[#2D231C] placeholder-[#A89F97] focus:outline-none focus:ring-2 focus:ring-[#EA580C]/25 focus:border-[#EA580C] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7D7067] hover:text-[#2D231C] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#EA580C] hover:brightness-105 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#EA580C]/20 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Signing in…</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In to {DEMO_ACCOUNTS[selectedRole].title} Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Bottom Area: Left-Corner Credentials & Right-Corner Compliance */}
      <footer className="w-full flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 pt-4 border-t border-[#E8E2D9]">
        {/* Full Left Side Corner at Bottom: Shows ONLY the Selected Role's Credential */}
        <div className="text-left font-mono">
          <div className="text-[10px] uppercase font-bold text-[#7D7067] tracking-wider mb-1">
            {selectedRole === 'ambulance' ? 'Ambulance' : selectedRole === 'hospital' ? 'Hospital' : 'Admin'} Demo Credentials:
          </div>
          <div
            onClick={handleApplyCredentials}
            className="text-xs text-[#7D7067] bg-white border border-[#E8E2D9] px-3.5 py-2 rounded-xl shadow-2xs cursor-pointer hover:border-[#EA580C]/40 hover:text-[#2D231C] transition-all flex items-center gap-2.5 group"
            title="Click to auto-enter credentials"
          >
            <div>
              <span className="font-semibold text-[#7D7067]">Username:</span>{' '}
              <span className="text-[#4A3E36] font-medium select-all">{DEMO_ACCOUNTS[selectedRole].username}</span>
            </div>
            <span className="text-[#D8CFBF]">•</span>
            <div>
              <span className="font-semibold text-[#7D7067]">Password:</span>{' '}
              <span className="text-[#4A3E36] font-medium select-all">{DEMO_ACCOUNTS[selectedRole].password}</span>
            </div>
            {applied ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#52796F] bg-[#EFF6F3] px-1.5 py-0.5 rounded-md ml-1">
                <Check className="w-3 h-3" />
                Applied
              </span>
            ) : (
              <span className="text-[10px] text-[#A89F97] group-hover:text-[#EA580C] transition-colors ml-1">
                (click to enter)
              </span>
            )}
          </div>
        </div>

        {/* Full Right Side Corner at Bottom: DISHA & HIPAA Architecture */}
        <div className="text-left sm:text-right text-xs font-mono text-[#7D7067]">
          <div className="font-semibold text-[#5C4E45]">DISHA &amp; HIPAA Compliant Architecture</div>
          <div className="mt-0.5 text-[11px] text-[#A89F97]">Raahi Emergency Medical Network • 256-bit Encryption</div>
        </div>
      </footer>
    </div>
  );
};



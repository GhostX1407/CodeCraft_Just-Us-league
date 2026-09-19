import React, { useState } from 'react';
import { api } from '../../services/api';
import { stateStore } from '../../services/stateStore';
import { playAlertSound } from '../../utils/sound';
import {
  Send,
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  Check,
  Radio,
  Sparkles,
  Building2,
  Ambulance,
  Shield,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

interface NotificationComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: string;
  onSuccess?: () => void;
}

export const NotificationComposerModal: React.FC<NotificationComposerModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'all',
  onSuccess,
}) => {
  const [targetRole, setTargetRole] = useState<string>(defaultRole || 'all');
  const [recipientId, setRecipientId] = useState<string>('all');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'urgent' | 'critical'>('urgent');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const hospitals = stateStore.getHospitals();
  const ambulances = stateStore.getAmbulances();

  if (!isOpen) return null;

  const TEMPLATES = [
    {
      title: 'Emergency Trauma Diversion Advisory',
      role: 'hospital',
      severity: 'warning' as const,
      message: 'Trauma OR Bay 1 temporarily restricted for maintenance. Route critical abdominal trauma to secondary accredited facility.',
    },
    {
      title: 'Priority Code-Blue Route Clearance',
      role: 'ambulance',
      severity: 'critical' as const,
      message: 'Ambulance GJ-05-EM-1081 with cardiac patient in transit. Ring Road express corridor cleared by traffic police.',
    },
    {
      title: 'Regional Mass-Casualty Alert Standby',
      role: 'all',
      severity: 'urgent' as const,
      message: 'Major multi-vehicle incident reported near Surat-Navsari Highway. All EMS units & trauma bays on Tier-2 standby.',
    },
    {
      title: 'ICU Bed Capacity Reallocated',
      role: 'admin',
      severity: 'info' as const,
      message: '3 additional ventilator-equipped ICU beds verified online at Sterling Multispecialty.',
    },
  ];

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setTargetRole(tmpl.role);
    setSeverity(tmpl.severity);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      await api.sendNotification({
        recipientRole: (targetRole as any) || 'all',
        recipientId: recipientId || 'all',
        title: title.trim(),
        message: message.trim(),
        severity,
        type: 'LOCAL_OPERATOR_DISPATCH',
      });

      playAlertSound();
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setTitle('');
        setMessage('');
        setIsSending(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl border border-[#E8E2D9] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8E2D9] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF7ED] border border-[#EA580C]/20 flex items-center justify-center text-[#EA580C]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-black text-[#2D231C] text-base">
                Dispatch Real Local Notification
              </h3>
              <p className="text-xs font-mono text-[#7D7067]">
                Broadcast direct push alert across all active consoles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#7D7067] hover:text-[#2D231C] hover:bg-[#E8E2D9]/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Templates Bar */}
        <div className="px-5 pt-3.5 pb-2 bg-[#FAF8F5]/60 border-b border-[#E8E2D9]">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#7D7067] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>Quick Dispatch Templates:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="shrink-0 px-2.5 py-1 rounded-xl text-xs font-mono border border-[#E8E2D9] bg-white hover:bg-[#FFF7ED] hover:border-[#EA580C]/40 text-[#2D231C] transition-colors shadow-2xs"
              >
                {tmpl.title.split(' ')[0]} {tmpl.title.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-5 space-y-4">
          {/* Target Role Selector */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#2D231C] mb-1.5">
              Target Role Audience
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'all', label: 'All Roles', icon: Radio },
                { id: 'coordinator', label: 'Coordinator', icon: Building2 },
                { id: 'ambulance', label: 'Ambulance', icon: Ambulance },
                { id: 'admin', label: 'Admin', icon: Shield },
                { id: 'family', label: 'Family', icon: Users },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = targetRole === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTargetRole(item.id);
                      setRecipientId('all');
                    }}
                    className={clsx(
                      'p-2 rounded-xl text-center flex flex-col items-center gap-1 text-[11px] font-mono font-bold transition-all border',
                      isSelected
                        ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C] shadow-xs'
                        : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:bg-[#FAF8F5]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Recipient facility (if hospital/coordinator or ambulance selected) */}
          {(targetRole === 'hospital' || targetRole === 'coordinator') && hospitals.length > 0 && (
            <div>
              <label className="block text-xs font-mono font-bold text-[#2D231C] mb-1">
                Target Facility
              </label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full text-xs font-mono rounded-xl border border-[#E8E2D9] bg-white px-3 py-2 text-[#2D231C] focus:outline-hidden focus:ring-2 focus:ring-[#EA580C]/30"
              >
                <option value="all">All Regional Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetRole === 'ambulance' && ambulances.length > 0 && (
            <div>
              <label className="block text-xs font-mono font-bold text-[#2D231C] mb-1">
                Target Ambulance Unit
              </label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full text-xs font-mono rounded-xl border border-[#E8E2D9] bg-white px-3 py-2 text-[#2D231C] focus:outline-hidden focus:ring-2 focus:ring-[#EA580C]/30"
              >
                <option value="all">All Active Ambulances</option>
                {ambulances.map((amb) => (
                  <option key={amb.id} value={amb.id}>
                    {amb.vehicle_number} — {amb.ambulance_type} ({amb.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Severity Level Selector */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#2D231C] mb-1.5">
              Urgency & Severity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'info', label: 'Info', color: 'border-blue-400 bg-blue-50 text-blue-700', icon: Info },
                { id: 'warning', label: 'Warning', color: 'border-amber-400 bg-amber-50 text-amber-700', icon: AlertTriangle },
                { id: 'urgent', label: 'Urgent', color: 'border-orange-400 bg-orange-50 text-orange-700', icon: ShieldAlert },
                { id: 'critical', label: 'Critical', color: 'border-red-500 bg-red-50 text-red-700', icon: ShieldAlert },
              ].map((s) => {
                const Icon = s.icon;
                const isSelected = severity === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id as any)}
                    className={clsx(
                      'py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1 text-xs font-mono font-bold transition-all border',
                      isSelected ? clsx(s.color, 'ring-2 ring-offset-1 ring-[#EA580C]/30 shadow-xs') : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:bg-[#FAF8F5]'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#2D231C] mb-1">
              Alert Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Critical Bed Shortage, Highway Route Diversion..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-[#E8E2D9] px-3 py-2 text-[#2D231C] focus:outline-hidden focus:ring-2 focus:ring-[#EA580C]/30 placeholder:text-[#A89F91]"
            />
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#2D231C] mb-1">
              Alert Message Details *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Enter complete alert body for dispatch..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs font-mono rounded-xl border border-[#E8E2D9] px-3 py-2 text-[#2D231C] focus:outline-hidden focus:ring-2 focus:ring-[#EA580C]/30 placeholder:text-[#A89F91]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8E2D9] text-xs font-mono font-bold text-[#7D7067] hover:bg-[#FAF8F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !title.trim() || !message.trim()}
              className={clsx(
                'px-5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-xs',
                sentSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-[#EA580C] hover:bg-[#C2410C] text-white disabled:opacity-50'
              )}
            >
              {sentSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Notification Sent!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Dispatching...' : 'Send Notification'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

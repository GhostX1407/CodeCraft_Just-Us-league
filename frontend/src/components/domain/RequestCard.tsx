import React, { useState } from 'react';
import clsx from 'clsx';
import { Request, Case, Hospital } from '../../types/domain';
import { Countdown } from './Countdown';
import { NeedProfileChips } from './NeedProfileChips';
import { Button } from '../primitives/Button';
import { SEVERITY_CONFIG, CATEGORY_LABELS } from '../../utils/format';
import { AlertTriangle, Clock, User, HeartPulse, Activity } from 'lucide-react';

interface RequestCardProps {
  request: Request;
  caseData: Case;
  hospital: Hospital;
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string, reason: string) => Promise<void>;
  className?: string;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  caseData,
  hospital,
  onAccept,
  onReject,
  className,
}) => {
  const [submitting, setSubmitting] = useState<'accept' | 'reject' | null>(null);
  const [showRejectReasons, setShowRejectReasons] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState('Capacity full');
  const [showReviewDetails, setShowReviewDetails] = useState(true);

  const severity = SEVERITY_CONFIG[caseData.severity];
  const categoryInfo = CATEGORY_LABELS[caseData.category];

  const handleAcceptClick = async () => {
    setSubmitting('accept');
    try {
      await onAccept(request.id);
    } finally {
      setSubmitting(null);
    }
  };

  const handleRejectConfirm = async () => {
    setSubmitting('reject');
    try {
      await onReject(request.id, selectedRejectReason);
    } finally {
      setSubmitting(null);
      setShowRejectReasons(false);
    }
  };

  return (
    <div
      role="region"
      aria-live="assertive"
      className={clsx(
        'relative border border-[#E8E2D9] rounded-3xl bg-white shadow-macos-window overflow-hidden',
        caseData.severity === 'red' && 'border-[#E11D48] ring-1 ring-[#E11D48]/30',
        className
      )}
    >
      {/* Top Severity Stripe */}
      <div
        className={clsx(
          'h-2.5 w-full',
          caseData.severity === 'red' && 'bg-[#E11D48] animate-pulse',
          caseData.severity === 'yellow' && 'bg-[#D97706]',
          caseData.severity === 'green' && 'bg-[#52796F]'
        )}
      />

      <div className="p-6 md:p-10">
        {/* New Emergency Request Identification Masthead */}
        <div className="pb-4 border-b border-[#E8E2D9] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-display font-black text-[#2D231C] tracking-tight">
                New Emergency Request
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowReviewDetails(!showReviewDetails)}
                className="px-3 py-1.5 rounded-xl border border-[#E8E2D9] bg-[#FAF8F5] hover:bg-white text-xs font-mono font-bold text-[#2D231C] flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>{showReviewDetails ? 'Collapse' : 'Review'}</span>
                <span className="text-[10px] text-[#7D7067]">[Review]</span>
              </button>
            </div>
          </div>

          {/* Core Demo Metadata Strip: Ambulance, Case, Severity */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-mono">
            <div className="bg-[#FFF7ED] text-[#C2410C] border border-[#EA580C]/30 px-3 py-1 rounded-xl font-black flex items-center gap-1.5">
              <span>Ambulance:</span>
              <span className="text-[#2D231C]">Unit AMB-01 (ALS)</span>
            </div>

            <div className="bg-[#FAF8F5] text-[#2D231C] border border-[#E8E2D9] px-3 py-1 rounded-xl font-bold flex items-center gap-1.5">
              <span>Case:</span>
              <span className="font-black text-[#EA580C]">{caseData.id}</span>
            </div>

            <div
              className={clsx(
                'px-3 py-1 rounded-xl border font-black uppercase flex items-center gap-1.5',
                severity.bg,
                severity.text,
                severity.border
              )}
            >
              <span>Severity:</span>
              <span>{severity.label} ({categoryInfo.label})</span>
            </div>

            <div className="ml-auto text-xs font-mono text-[#7D7067] font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Onset: {caseData.onset_time}</span>
            </div>
          </div>
        </div>

        {/* Core Layout: Triage Structured Handoff + Stage Countdown Ring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6 items-center">
          {/* Left 2 Cols: Structured Triage Handoff Data */}
          <div className="lg:col-span-2 space-y-4">
            {/* Patient & Vitals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9]">
                <div className="text-[11px] font-mono text-[#7D7067] font-bold uppercase flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>Patient Demographics</span>
                </div>
                <div className="text-lg font-black text-[#2D231C]">
                  {caseData.patient_basic_info.age} yrs ·{' '}
                  <span className="capitalize">{caseData.patient_basic_info.sex}</span>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9]">
                <div className="text-[11px] font-mono text-[#7D7067] font-bold uppercase flex items-center gap-1.5 mb-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Telemetry Vitals</span>
                </div>
                <div className="text-sm font-mono font-bold text-[#2D231C]">
                  {caseData.vitals_summary}
                </div>
              </div>
            </div>

            {/* Treatment Administered in Field */}
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D9]">
              <div className="text-[11px] font-mono text-[#7D7067] font-bold uppercase flex items-center gap-1.5 mb-1.5">
                <Activity className="w-3.5 h-3.5 text-[#52796F]" />
                <span>Pre-Hospital Treatment Administered</span>
              </div>
              <div className="text-sm text-[#2D231C] font-bold">
                {caseData.treatment_administered}
              </div>
            </div>

            {/* Case Needs Profile */}
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#2D231C] font-bold mb-2.5">
                Mandatory Capabilities Required:
              </div>
              <NeedProfileChips needProfile={caseData.need_profile} hospital={hospital} />
            </div>

            {/* Match Reason */}
            <div className="p-3.5 rounded-2xl bg-[#FFF7ED] border border-[#EA580C]/40 text-xs text-[#2D231C] font-mono font-bold leading-relaxed">
              <b className="text-[#C2410C]">System Route Reasoning:</b> {request.reason_shown_to_dispatcher}
            </div>
          </div>

          {/* Right Col: Stage Sized Countdown Ring (Legible from 3m away) */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#FAF8F5] rounded-3xl border border-[#E8E2D9]">
            <Countdown
              expiresAt={request.expires_at}
              variant="ring"
              size="stage"
              label="Commitment Window"
            />
          </div>
        </div>

        {/* Reject Reason Selector Drawer */}
        {showRejectReasons && (
          <div className="mb-6 p-5 bg-[#FAF8F5] border border-[#E11D48]/30 rounded-2xl animate-fade-in space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#2D231C]">
              <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
              <span>Select Reason for Inability to Accept:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {['Capacity full', 'Specialist unavailable', 'Equipment unavailable', 'ER diversion'].map(
                (r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRejectReason(r)}
                    className={clsx(
                      'p-3 text-xs border rounded-xl transition-all text-left font-bold',
                      selectedRejectReason === r
                        ? 'border-[#E11D48]/50 bg-[#FFE4E6] text-[#BE123C] shadow-xs'
                        : 'border-[#E8E2D9] bg-white text-[#7D7067] hover:bg-[#F4EFE6]'
                    )}
                  >
                    {r}
                  </button>
                )
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectReasons(false)}
                className="px-4 py-2 text-xs font-mono text-[#7D7067] font-bold hover:text-[#2D231C]"
              >
                Cancel
              </button>
              <Button
                variant="reject"
                size="md"
                loading={submitting === 'reject'}
                onClick={handleRejectConfirm}
                className="border-[#E11D48]/40 text-[#E11D48] hover:bg-[#FFE4E6] rounded-xl font-bold"
              >
                Confirm Decline & Auto-Reroute
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons: 72px Tall, Separated by >=24px per G.10 */}
        <div className="pt-6 border-t border-[#E8E2D9] flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
          <Button
            variant="commit"
            size="stage"
            loading={submitting === 'accept'}
            disabled={submitting !== null}
            onClick={handleAcceptClick}
            className="flex-1 text-2xl font-display font-black tracking-wide uppercase btn-tactile shadow-md"
          >
            Accept Patient
          </Button>

          <Button
            variant="reject"
            size="stage"
            disabled={submitting !== null}
            onClick={() => setShowRejectReasons(!showRejectReasons)}
            className="flex-1 text-xl font-display font-bold tracking-wide uppercase rounded-2xl btn-tactile"
          >
            Reject / Cannot Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

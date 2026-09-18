import React, { useState } from 'react';
import clsx from 'clsx';
import { MatchScoreBreakdown } from '../../types/domain';
import { formatScore } from '../../utils/format';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScoreBreakdownProps {
  breakdown: MatchScoreBreakdown;
  className?: string;
  defaultExpanded?: boolean;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  breakdown,
  className,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={clsx('border border-[#E2E8F0] rounded-xl bg-white p-3 text-xs shadow-xs', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between font-mono text-[#475569] hover:text-[#0F172A] transition-colors select-none"
      >
        <span className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold">Rank Arithmetic:</span>
          <span className="font-black text-[#0F172A]">
            Score {formatScore(breakdown.final_score)}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#149B9E] font-bold">
          {expanded ? 'Hide arithmetic' : 'Inspect formula'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] font-mono text-[11px] space-y-1.5 animate-fade-in">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#0F172A] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#149B9E] font-black">
              capability {Math.round(breakdown.capability_match_pct)}%
            </span>
            <span className="text-[#94A3B8]">×</span>
            <span className="font-bold">dist {breakdown.distance_factor.toFixed(2)}</span>
            <span className="text-[#94A3B8]">×</span>
            <span className="font-bold">load {breakdown.load_factor.toFixed(2)}</span>
            <span className="text-[#94A3B8]">×</span>
            <span
              className={clsx(
                breakdown.staleness_factor < 1 ? 'text-[#D97706] font-bold' : 'text-[#0F172A] font-bold'
              )}
            >
              freshness {breakdown.staleness_factor.toFixed(2)}
            </span>
            <span className="text-[#94A3B8]">=</span>
            <span className="font-black text-[#149B9E] text-xs">
              {formatScore(breakdown.final_score)}
            </span>
          </div>

          <p className="text-[10px] font-sans text-[#475569] font-medium leading-relaxed">
            Deterministic formula: <code className="font-mono text-[#0F172A] bg-[#F1F5F9] px-1 py-0.5 rounded font-bold">(capability% / 100) × distance × load × freshness × 100</code>. Verified against current hospital telemetry.
          </p>
        </div>
      )}
    </div>
  );
};

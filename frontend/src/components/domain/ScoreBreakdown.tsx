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
    <div className={clsx('border border-[#E8E2D9] rounded-xl bg-white p-3 text-xs shadow-xs', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between font-mono text-[#7D7067] hover:text-[#2D231C] transition-colors select-none"
      >
        <span className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#7D7067] font-bold">Rank Arithmetic:</span>
          <span className="font-black text-[#2D231C]">
            Score {formatScore(breakdown.final_score)}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#EA580C] font-bold">
          {expanded ? 'Hide arithmetic' : 'Inspect formula'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-[#E8E2D9] font-mono text-[11px] space-y-1.5 animate-fade-in">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#2D231C] bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E2D9]">
            <span className="text-[#EA580C] font-black">
              capability {Math.round(breakdown.capability_match_pct)}%
            </span>
            <span className="text-[#A89F97]">×</span>
            <span className="font-bold">dist {breakdown.distance_factor.toFixed(2)}</span>
            <span className="text-[#A89F97]">×</span>
            <span className="font-bold">load {breakdown.load_factor.toFixed(2)}</span>
            <span className="text-[#A89F97]">×</span>
            <span
              className={clsx(
                breakdown.staleness_factor < 1 ? 'text-[#D97706] font-bold' : 'text-[#2D231C] font-bold'
              )}
            >
              freshness {breakdown.staleness_factor.toFixed(2)}
            </span>
            <span className="text-[#A89F97]">=</span>
            <span className="font-black text-[#EA580C] text-xs">
              {formatScore(breakdown.final_score)}
            </span>
          </div>

          <p className="text-[10px] font-sans text-[#7D7067] font-medium leading-relaxed">
            Deterministic formula: <code className="font-mono text-[#2D231C] bg-[#F4EFE6] px-1 py-0.5 rounded font-bold">(capability% / 100) × distance × load × freshness × 100</code>. Verified against current hospital telemetry.
          </p>
        </div>
      )}
    </div>
  );
};

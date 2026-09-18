import React from 'react';
import clsx from 'clsx';
import { MatchResult, Hospital, RequestStatus } from '../../types/domain';
import { Card } from '../primitives/Card';
import { StatusBadge } from './StatusBadge';
import { FreshnessBadge } from './FreshnessBadge';
import { ScoreBreakdown } from './ScoreBreakdown';
import { formatScore, formatPercent } from '../../utils/format';
import { ShieldAlert, Navigation, Activity } from 'lucide-react';

interface MatchCardProps {
  hospital: Hospital;
  matchResult: MatchResult;
  status?: RequestStatus;
  isPrimary?: boolean;
  className?: string;
  actionNode?: React.ReactNode;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  hospital,
  matchResult,
  status = 'pending',
  isPrimary = true,
  className,
  actionNode,
}) => {
  return (
    <Card
      railStatus={status}
      elevation={status === 'accepted' ? 'lifted' : 'flat'}
      className={clsx(
        'transition-all duration-300',
        status === 'accepted' && 'border-[#0D9488]/50 bg-white',
        className
      )}
    >
      {/* Header with Rank & Score */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[#0D7C7E] bg-[#E6F7F7] px-2.5 py-0.5 rounded-full border border-[#149B9E]/40">
              Rank #{matchResult.rank}
            </span>
            <FreshnessBadge lastUpdatedAt={hospital.last_updated_at} showSentenceOnUnknown={false} />
            <StatusBadge status={status} size="sm" />
          </div>
          <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
            {hospital.name}
          </h3>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono text-[#475569] font-bold uppercase tracking-wider">Score</div>
          <div className="text-2xl font-mono font-extrabold text-[#149B9E] tracking-tight tabular-nums">
            {formatScore(matchResult.final_score)}
          </div>
        </div>
      </div>

      {/* Metrics Row: Capability % · Distance/ETA · ER Load */}
      <div className="grid grid-cols-3 gap-2 py-3 border-b border-[#E2E8F0] text-center font-mono">
        <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
          <div className="text-[10px] text-[#475569] font-bold uppercase">Capability</div>
          <div className="text-sm font-extrabold text-[#0F172A]">
            {formatPercent(matchResult.capability_match_pct)}
          </div>
        </div>
        <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
          <div className="text-[10px] text-[#475569] font-bold uppercase flex items-center justify-center gap-1">
            <Navigation className="w-2.5 h-2.5 text-[#149B9E]" />
            <span>ETA</span>
          </div>
          <div className="text-sm font-extrabold text-[#0F172A]">
            {matchResult.distance_km} km
          </div>
        </div>
        <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
          <div className="text-[10px] text-[#475569] font-bold uppercase flex items-center justify-center gap-1">
            <Activity className="w-2.5 h-2.5 text-[#0D9488]" />
            <span>ER Load</span>
          </div>
          <div className="text-sm font-extrabold text-[#0F172A]">
            {hospital.er_load_score}/5
          </div>
        </div>
      </div>

      {/* Reasoning String */}
      <div className="py-2.5">
        <div className="text-xs font-mono text-[#475569] font-bold uppercase mb-1">Matching Telemetry:</div>
        <div className="text-xs text-[#0F172A] font-semibold leading-relaxed bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
          {matchResult.reasons.join(' · ')}
        </div>
      </div>

      {/* Arithmetic Breakdown */}
      <div className="my-1">
        <ScoreBreakdown
          breakdown={{
            capability_match_pct: matchResult.capability_match_pct,
            distance_km: matchResult.distance_km,
            distance_factor: matchResult.distance_factor,
            load_factor: matchResult.load_factor,
            staleness_factor: matchResult.staleness_factor,
            final_score: matchResult.final_score,
          }}
        />
      </div>

      {/* Mandatory Honesty Line per spec.md §46 */}
      <div className="mt-3 p-2.5 rounded-xl bg-[#FEF3C7] border border-[#D97706]/40 flex items-start gap-2 text-[11px] text-[#0F172A] font-medium leading-snug select-none">
        <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#0F172A]">Recommended — human confirmation required.</span>{' '}
          Hospital staff must explicitly accept this request before routing can be treated as committed.
        </div>
      </div>

      {actionNode && <div className="mt-3">{actionNode}</div>}
    </Card>
  );
};

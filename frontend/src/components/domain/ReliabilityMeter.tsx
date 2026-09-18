import React from 'react';
import clsx from 'clsx';
import { ReliabilityRow } from '../../types/domain';

interface ReliabilityMeterProps {
  score: number; // 0–1
  metrics?: ReliabilityRow['response_metrics'];
  animateOnChange?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const ReliabilityMeter: React.FC<ReliabilityMeterProps> = ({
  score,
  metrics,
  animateOnChange = true,
  className,
  size = 'md',
}) => {
  const percentage = Math.round(score * 100);
  const totalSegments = 10;
  const activeSegments = Math.round((percentage / 100) * totalSegments);

  return (
    <div className={clsx('select-none font-mono', className)}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wider text-[#2D231C] font-bold">
          Commitment Reliability
        </span>
        <span
          className={clsx(
            'font-black tabular-nums',
            size === 'sm' ? 'text-xs' : 'text-sm',
            percentage >= 85 ? 'text-[#52796F]' : percentage >= 70 ? 'text-[#EA580C]' : 'text-[#E11D48]',
            animateOnChange && 'transition-all duration-300'
          )}
        >
          {percentage}%
        </span>
      </div>

      {/* Segmented meter bar */}
      <div className="flex items-center gap-1 w-full">
        {Array.from({ length: totalSegments }).map((_, i) => {
          const isActive = i < activeSegments;
          return (
            <div
              key={i}
              className={clsx(
                'h-2 flex-1 rounded-[2px] transition-all duration-300',
                isActive
                  ? percentage >= 85
                    ? 'bg-[#52796F]'
                    : 'bg-[#EA580C]'
                  : 'bg-[#E8E2D9]'
              )}
            />
          );
        })}
      </div>

      {/* Raw fraction & Definition */}
      <div className="flex items-center justify-between text-[10px] text-[#7D7067] font-bold mt-1">
        {metrics ? (
          <span>
            {metrics.successful_commitment_count}/{metrics.accepted_count} honoured (avg {metrics.average_response_seconds}s)
          </span>
        ) : (
          <span>Accepted & honoured ratio</span>
        )}
        <span className="text-[#7D7067] text-[9px] font-semibold">Honoured ÷ Accepted</span>
      </div>
    </div>
  );
};

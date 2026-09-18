import React from 'react';
import clsx from 'clsx';
import { Timestamp } from '../../types/domain';
import { useServerCountdown } from '../../hooks/useServerCountdown';
import { formatMMSS } from '../../utils/time';

interface CountdownProps {
  expiresAt: Timestamp | null | undefined;
  variant?: 'ring' | 'bar';
  size?: 'sm' | 'lg' | 'stage';
  className?: string;
  label?: string;
}

export const Countdown: React.FC<CountdownProps> = ({
  expiresAt,
  variant = 'bar',
  size = 'lg',
  className,
  label = 'Hospital response window',
}) => {
  const { secondsRemaining, fraction, expiredLocally } = useServerCountdown(expiresAt);
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 10;

  // Ring variant (Hospital Console)
  if (variant === 'ring') {
    const dimensions = {
      sm: { dim: 96, stroke: 6, text: 'text-xl', labelText: 'text-[10px]' },
      lg: { dim: 160, stroke: 9, text: 'text-4xl', labelText: 'text-xs' },
      stage: { dim: 220, stroke: 12, text: 'text-6xl', labelText: 'text-sm' }, // 220px stage size per spec
    }[size];

    const radius = (dimensions.dim - dimensions.stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - fraction);

    return (
      <div className={clsx('flex flex-col items-center justify-center select-none', className)}>
        <div
          className={clsx(
            'relative flex items-center justify-center transition-all duration-300',
            isUrgent && 'animate-pulse'
          )}
          style={{ width: dimensions.dim, height: dimensions.dim }}
        >
          <svg
            className="w-full h-full -rotate-90 transform overflow-visible"
            viewBox={`0 0 ${dimensions.dim} ${dimensions.dim}`}
          >
            <defs>
              <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track */}
            <circle
              cx={dimensions.dim / 2}
              cy={dimensions.dim / 2}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={dimensions.stroke}
              fill="transparent"
              className="opacity-70"
            />

            {/* Active depleting neon ring */}
            <circle
              cx={dimensions.dim / 2}
              cy={dimensions.dim / 2}
              r={radius}
              stroke={isUrgent ? '#E11D48' : '#149B9E'}
              strokeWidth={dimensions.stroke}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              filter="url(#ringGlow)"
              style={{
                transition: 'stroke 300ms ease, stroke-dashoffset 90ms linear',
              }}
            />
          </svg>

          {/* Central Digits (Mono & Tabular) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={clsx(
                'font-mono tabular-nums leading-none tracking-tight transition-colors duration-200 drop-shadow-sm',
                dimensions.text,
                isUrgent ? 'text-[#E11D48] font-black' : 'text-[#0F172A] font-black',
                expiredLocally && 'text-[#94A3B8]'
              )}
            >
              {formatMMSS(secondsRemaining)}
            </span>
          </div>
        </div>

        <span
          className={clsx(
            'mt-4 font-mono uppercase tracking-widest text-center select-none font-bold',
            dimensions.labelText,
            isUrgent ? 'text-[#E11D48] animate-pulse font-black' : 'text-[#475569]',
            expiredLocally && 'text-[#94A3B8]'
          )}
        >
          {expiredLocally
            ? 'Awaiting system confirmation…'
            : isUrgent
            ? 'Critical response deadline'
            : label}
        </span>
      </div>
    );
  }

  // Linear bar variant (Ambulance View)
  return (
    <div className={clsx('w-full select-none', className)}>
      <div className="flex items-center justify-between text-xs font-mono mb-2">
        <span className={clsx(isUrgent ? 'text-[#E11D48] font-black' : 'text-[#475569] font-bold')}>
          {expiredLocally ? 'Awaiting hospital response…' : label}
        </span>
        <span
          className={clsx(
            'tabular-nums font-black tracking-tight text-sm',
            isUrgent ? 'text-[#E11D48] animate-pulse' : 'text-[#0F172A]',
            expiredLocally && 'text-[#94A3B8]'
          )}
        >
          {formatMMSS(secondsRemaining)}
        </span>
      </div>
      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden border border-[#E2E8F0] p-0.5 shadow-inner">
        <div
          className={clsx(
            'h-full transition-all duration-150 ease-linear rounded-full',
            isUrgent ? 'bg-[#E11D48] shadow-[0_0_12px_rgba(225,29,72,0.6)]' : 'bg-[#149B9E] shadow-[0_0_12px_rgba(20,155,158,0.6)]',
            expiredLocally && 'bg-[#94A3B8] shadow-none'
          )}
          style={{ width: `${Math.max(0, Math.min(100, fraction * 100))}%` }}
        />
      </div>
    </div>
  );
};

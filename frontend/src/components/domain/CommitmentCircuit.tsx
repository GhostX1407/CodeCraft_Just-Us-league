import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { RequestStatus, Freshness } from '../../types/domain';

interface NodePoint {
  label: string;
  sub?: string;
}

interface CommitmentCircuitProps {
  from: NodePoint;
  to: NodePoint;
  status: RequestStatus;
  freshness?: Freshness;
  compact?: boolean;
  className?: string;
  attemptNumber?: number;
}

export const CommitmentCircuit: React.FC<CommitmentCircuitProps> = ({
  from,
  to,
  status,
  freshness = 'fresh',
  compact = false,
  className,
  attemptNumber = 1,
}) => {
  const [fracturing, setFracturing] = useState(false);
  const [lockedSweep, setLockedSweep] = useState(false);

  useEffect(() => {
    if (status === 'rejected' || status === 'timed_out') {
      setFracturing(true);
      const timer = setTimeout(() => setFracturing(false), 900);
      return () => clearTimeout(timer);
    } else if (status === 'accepted') {
      setLockedSweep(true);
      const timer = setTimeout(() => setLockedSweep(false), 700);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const height = compact ? 64 : 96;
  const viewBoxWidth = 440;
  const y = height / 2;
  const x1 = 48;
  const x2 = viewBoxWidth - 48;

  return (
    <div className={clsx('w-full select-none overflow-hidden py-2', className)}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${height}`}
        className="w-full h-auto overflow-visible filter drop-shadow-md"
      >
        <defs>
          {/* Signal Laser Glow Filters */}
          <filter id="signalGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="commitGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="fractureGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Traveling Photon Gradient */}
          <linearGradient id="photonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EA580C" stopOpacity="0" />
            <stop offset="70%" stopColor="#EA580C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>

          {/* Locked Commit Gradient (Medical Deep Teal -> Bright Mint) */}
          <linearGradient id="commitFill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#52796F" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>

        {/* Rail Backing Track (Dark Sleek Guide Rail) */}
        <line
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke="var(--line-1)"
          strokeWidth="2.5"
          className="opacity-50"
        />

        {/* 1. PENDING: Dotted Laser Path with Living Traveling Photon */}
        {status === 'pending' && (
          <g>
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="var(--signal)"
              strokeWidth="3.5"
              strokeDasharray="6 6"
              strokeLinecap="round"
              filter="url(#signalGlow)"
              className="animate-[dash_1s_linear_infinite]"
              style={{ strokeDashoffset: 12 }}
            />

            {/* Traveling Photon Pulse Head */}
            <circle cy={y} r="5" fill="#FFFFFF" filter="url(#signalGlow)">
              <animate
                attributeName="cx"
                from={x1}
                to={x2}
                dur="1.3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Photon Aura Halo */}
            <circle cy={y} r="10" fill="var(--signal)" opacity="0.3" filter="url(#signalGlow)">
              <animate
                attributeName="cx"
                from={x1}
                to={x2}
                dur="1.3s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* 2. ACCEPTED: Solid Locked Circuit Rail with Terminal Clamping Caps */}
        {status === 'accepted' && (
          <g className={clsx(lockedSweep && 'animate-scale-settle')}>
            {/* Luminous Core Line */}
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke="url(#commitFill)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#commitGlow)"
            />

            {/* Terminal Left Lock Cap */}
            <rect
              x={x1 - 4}
              y={y - 10}
              width="8"
              height="20"
              rx="2.5"
              fill="#52796F"
              filter="url(#commitGlow)"
            />
            {/* Terminal Right Lock Cap */}
            <rect
              x={x2 - 4}
              y={y - 10}
              width="8"
              height="20"
              rx="2.5"
              fill="#52796F"
              filter="url(#commitGlow)"
            />
          </g>
        )}

        {/* 3. REJECTED / TIMED OUT: Mid-Span Fracture with Drifting Shards */}
        {(status === 'rejected' || status === 'timed_out' || fracturing) && (
          <g filter="url(#fractureGlow)">
            {/* Left Shattered Segment drifting upward */}
            <line
              x1={x1}
              y1={y}
              x2={x1 + 150}
              y2={y - 8}
              stroke="var(--critical)"
              strokeWidth="3"
              strokeDasharray="5 3"
              style={{
                transform: fracturing ? 'translateY(-6px) rotate(-1.5deg)' : 'none',
                opacity: fracturing ? 0.9 : 0.45,
                transition: 'all 240ms ease-out',
              }}
            />

            {/* Broken Center Gap Core */}
            <circle
              cx={(x1 + x2) / 2}
              cy={y}
              r="4"
              fill="var(--critical)"
              opacity={fracturing ? 0.8 : 0.4}
              className="animate-ping"
            />

            {/* Right Shattered Segment drifting downward */}
            <line
              x1={x1 + 185}
              y1={y + 8}
              x2={x2}
              y2={y}
              stroke="var(--critical)"
              strokeWidth="3"
              strokeDasharray="5 3"
              style={{
                transform: fracturing ? 'translateY(6px) rotate(1.5deg)' : 'none',
                opacity: fracturing ? 0.9 : 0.45,
                transition: 'all 240ms ease-out',
              }}
            />
          </g>
        )}

        {/* 4. SUPERSEDED: Dissolving Circuit */}
        {status === 'superseded' && (
          <line
            x1={x1}
            y1={y}
            x2={x2}
            y2={y}
            stroke="var(--caution)"
            strokeWidth="2.5"
            strokeDasharray="3 5"
            className="opacity-40 animate-pulse"
          />
        )}

        {/* FROM NODE: Ambulance Dispatch Origin */}
        <g className="cursor-pointer">
          <circle
            cx={x1}
            cy={y}
            r="16"
            fill="var(--ink-900)"
            stroke={status === 'accepted' ? 'var(--commit)' : 'var(--signal)'}
            strokeWidth="3"
            filter={status === 'accepted' ? 'url(#commitGlow)' : 'url(#signalGlow)'}
          />
          <circle
            cx={x1}
            cy={y}
            r="6"
            fill={status === 'accepted' ? 'var(--commit)' : '#FFFFFF'}
          />
          <text
            x={x1}
            y={y + 30}
            textAnchor="middle"
            className="fill-text-hi text-[11px] font-mono font-bold tracking-tight select-none"
          >
            {from.label}
          </text>
        </g>

        {/* TO NODE: Hospital Facility Target */}
        <g className="cursor-pointer">
          <circle
            cx={x2}
            cy={y}
            r="16"
            fill="var(--ink-900)"
            stroke={
              status === 'accepted'
                ? 'var(--commit)'
                : status === 'rejected' || status === 'timed_out'
                ? 'var(--critical)'
                : 'var(--signal)'
            }
            strokeWidth="3"
            filter={
              status === 'accepted'
                ? 'url(#commitGlow)'
                : status === 'rejected' || status === 'timed_out'
                ? 'url(#fractureGlow)'
                : 'url(#signalGlow)'
            }
            {...(status !== 'accepted' && freshness !== 'fresh' ? { strokeDasharray: '4 3' } : {})}
          />
          <circle
            cx={x2}
            cy={y}
            r="6"
            fill={
              status === 'accepted'
                ? 'var(--commit)'
                : status === 'rejected' || status === 'timed_out'
                ? 'var(--critical)'
                : '#FFFFFF'
            }
          />
          <text
            x={x2}
            y={y + 30}
            textAnchor="middle"
            className="fill-text-hi text-[11px] font-mono font-bold tracking-tight select-none"
          >
            {to.label}
          </text>
        </g>
      </svg>

      <div className="sr-only">
        Commitment circuit status: {status}, attempt {attemptNumber}
      </div>
    </div>
  );
};

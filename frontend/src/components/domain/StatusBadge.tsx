import React from 'react';
import clsx from 'clsx';
import { RequestStatus, Freshness } from '../../types/domain';

type BadgeType = RequestStatus | Freshness;

interface StatusBadgeProps {
  status: BadgeType;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = 'md',
}) => {
  const getConfig = () => {
    switch (status) {
      case 'accepted':
        return {
          label: 'Committed',
          shape: 'rounded-full border-[#52796F]/40 bg-[#EFF6F3] text-[#354F52] font-bold',
          symbol: '●', // Filled circle
        };
      case 'pending':
        return {
          label: 'In Flight',
          shape: 'rounded-md border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C] font-bold',
          symbol: '▲', // Triangle shape
        };
      case 'rejected':
        return {
          label: 'Declined',
          shape: 'rounded-md border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C] font-bold',
          symbol: '✕', // Cross
        };
      case 'timed_out':
        return {
          label: 'Timed Out',
          shape: 'rounded-md border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C] font-bold',
          symbol: '⏱', // Clock
        };
      case 'superseded':
        return {
          label: 'Rerouted (Mid-Transit)',
          shape: 'rounded-md border-[#FDE68A] bg-[#FEF3C7] text-[#B45309] font-bold',
          symbol: '↻', // Reroute cycle
        };
      case 'fresh':
        return {
          label: 'Fresh (<10m)',
          shape: 'rounded-full border-[#52796F]/40 bg-[#EFF6F3] text-[#354F52] font-bold',
          symbol: '◈',
        };
      case 'stale':
        return {
          label: 'Stale (10-30m)',
          shape: 'rounded-md border-[#FDE68A] bg-[#FEF3C7] text-[#B45309] border-dashed font-bold',
          symbol: '◇',
        };
      case 'unknown':
        return {
          label: 'Unknown (>30m)',
          shape: 'rounded-md border-[#D8CFBF] bg-[#F4EFE6] text-[#7D7067] border-dotted font-bold',
          symbol: '?',
        };
      default:
        return {
          label: String(status),
          shape: 'rounded-md border-[#E8E2D9] bg-[#FAF8F5] text-[#7D7067] font-bold',
          symbol: '•',
        };
    }
  };

  const { label, shape, symbol } = getConfig();

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider border select-none',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1',
        shape,
        className
      )}
    >
      <span className="text-[10px] leading-none" aria-hidden="true">
        {symbol}
      </span>
      <span>{label}</span>
    </span>
  );
};

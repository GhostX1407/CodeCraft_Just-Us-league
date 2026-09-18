import React from 'react';
import clsx from 'clsx';
import { Timestamp } from '../../types/domain';
import { getFreshness, timeAgo } from '../../utils/time';

interface FreshnessBadgeProps {
  lastUpdatedAt: Timestamp;
  showSentenceOnUnknown?: boolean;
  className?: string;
}

export const FreshnessBadge: React.FC<FreshnessBadgeProps> = ({
  lastUpdatedAt,
  showSentenceOnUnknown = true,
  className,
}) => {
  const { status } = getFreshness(lastUpdatedAt);
  const formattedTime = timeAgo(lastUpdatedAt);

  const getStyle = () => {
    switch (status) {
      case 'fresh':
        return 'border-solid border-[#52796F]/40 text-[#354F52] bg-[#EFF6F3] font-bold';
      case 'stale':
        return 'border-dashed border-[#D97706]/40 text-[#B45309] bg-[#FEF3C7] font-bold';
      case 'unknown':
        return 'border-dotted border-[#D8CFBF] text-[#7D7067] bg-[#F4EFE6] font-bold';
    }
  };

  return (
    <div className={clsx('inline-flex flex-col gap-1', className)}>
      <div
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono border rounded-full font-bold',
          getStyle()
        )}
      >
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            status === 'fresh' && 'bg-[#52796F]',
            status === 'stale' && 'bg-[#D97706]',
            status === 'unknown' && 'bg-[#7D7067]'
          )}
        />
        <span>Updated {formattedTime}</span>
      </div>
      {status === 'unknown' && showSentenceOnUnknown && (
        <span className="text-[11px] font-sans text-[#7D7067] font-semibold leading-tight">
          Status unknown — de-prioritised in ranking.
        </span>
      )}
    </div>
  );
};

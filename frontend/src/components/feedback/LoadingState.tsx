import React from 'react';

interface LoadingStateProps {
  lines?: number;
  label?: string;
  variant?: 'card' | 'table' | 'circuit';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  lines = 3,
  label = 'Synchronizing…',
  variant = 'card',
}) => {
  return (
    <div className="w-full animate-pulse space-y-3 p-4 border border-[#E8E2D9] bg-white rounded-2xl shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D9]">
        <div className="h-4 bg-[#E8E2D9] rounded-lg w-1/3"></div>
        <span className="text-xs font-mono font-bold text-[#7D7067]">{label}</span>
      </div>
      {variant === 'card' && (
        <div className="space-y-2 pt-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-3 bg-[#F4EFE6] rounded-lg"
              style={{ width: `${85 - i * 15}%` }}
            ></div>
          ))}
        </div>
      )}
      {variant === 'circuit' && (
        <div className="h-16 flex items-center justify-center">
          <div className="w-full h-0.5 border-t border-dashed border-signal/40"></div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  actionText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  actionText = 'Retry',
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center p-6 border border-[#E11D48]/30 bg-[#FFE4E6]/40 rounded-2xl text-center my-4 shadow-xs"
    >
      <div className="w-10 h-10 rounded-full bg-[#FFE4E6] flex items-center justify-center text-[#E11D48] mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <p className="text-sm font-bold text-[#0F172A] mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-mono font-bold tracking-wider uppercase border border-[#E2E8F0] rounded-xl transition-colors shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

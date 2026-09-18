import React from 'react';

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-[#E2E8F0] rounded-2xl bg-white shadow-xs">
      {title && <h4 className="text-base font-black text-[#0F172A] mb-1">{title}</h4>}
      <p className="text-sm text-[#475569] font-medium max-w-sm mb-4 leading-relaxed">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

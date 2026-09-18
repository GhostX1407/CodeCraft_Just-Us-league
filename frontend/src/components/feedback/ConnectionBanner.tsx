import React from 'react';
import { useConnectionState } from '../../hooks/useSubscriptions';
import { WifiOff } from 'lucide-react';

export const ConnectionBanner: React.FC = () => {
  const { status } = useConnectionState();

  if (status !== 'reconnecting') return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 bg-caution/90 text-ink-900 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-md transition-transform"
    >
      <WifiOff className="w-4 h-4" />
      <span>Connection interrupted. Reconnecting…</span>
    </div>
  );
};

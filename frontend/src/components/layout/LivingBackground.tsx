import React from 'react';
import { useActiveRequests } from '../../hooks/useSubscriptions';

export const LivingBackground: React.FC = () => {
  const { data: activeRequests } = useActiveRequests();
  const hasActiveUrgency = activeRequests.length > 0;
  const isCommitted = activeRequests.some((r) => r.status === 'accepted');

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      {/* Warm Silk Porcelain Canvas Ground */}
      <div className="absolute inset-0 bg-[#FAF8F5]" />

      {/* Subtle Warm Coordinate Grid */}
      <div className="absolute inset-0 bg-spatial-grid opacity-50" />

      {/* Radiant Saffron & Sun Amber Ambient Halo (Top Center Glow) */}
      <div
        className={`absolute -top-44 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] rounded-full blur-[140px] transition-all duration-1000 ${
          isCommitted
            ? 'bg-[#52796F]/22 opacity-75 scale-105'
            : hasActiveUrgency
            ? 'bg-[#EA580C]/22 opacity-85 scale-105'
            : 'bg-gradient-to-b from-[#F59E0B]/20 via-[#EA580C]/15 to-transparent opacity-65 animate-subtle-breath'
        }`}
      />

      {/* Flowing Sage Green Meadow Halo (Right Edge) */}
      <div
        className={`absolute -top-20 -right-24 w-[700px] h-[600px] rounded-full blur-[150px] transition-all duration-1000 ${
          isCommitted ? 'bg-[#52796F]/20 opacity-70' : 'bg-[#52796F]/12 opacity-50'
        }`}
      />

      {/* Warm Peach-Amber Silk Halo (Bottom Left) */}
      <div className="absolute -bottom-36 -left-28 w-[700px] h-[550px] rounded-full bg-[#FB923C]/14 blur-[160px] opacity-45" />

      {/* Gentle Healing Sage Glow (Bottom Right) */}
      <div className="absolute -bottom-32 -right-28 w-[600px] h-[500px] rounded-full bg-[#52796F]/12 blur-[150px] opacity-40" />

      {/* Soft Warm Silk Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(232,226,217,0.55)]" />
    </div>
  );
};


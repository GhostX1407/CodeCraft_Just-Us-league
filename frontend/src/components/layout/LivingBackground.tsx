import React from 'react';
import { useActiveRequests } from '../../hooks/useSubscriptions';

export const LivingBackground: React.FC = () => {
  const { data: activeRequests } = useActiveRequests();
  const hasActiveUrgency = activeRequests.length > 0;
  const isCommitted = activeRequests.some((r) => r.status === 'accepted');

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      {/* Clinical Hospital Canvas Ground */}
      <div className="absolute inset-0 bg-[#F8FAFC]" />

      {/* Subtle Spatial Coordinate Grid */}
      <div className="absolute inset-0 bg-spatial-grid opacity-60" />

      {/* Medical Teal & Cyan-Blue Radiance Halo */}
      <div
        className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full blur-[140px] transition-all duration-1000 ${
          isCommitted
            ? 'bg-[#0D9488]/20 opacity-70 scale-105'
            : hasActiveUrgency
            ? 'bg-[#149B9E]/20 opacity-80 scale-105'
            : 'bg-[#149B9E]/10 opacity-55 animate-subtle-breath'
        }`}
      />

      {/* Secondary Bottom Ambient Depth Halos */}
      <div
        className={`absolute -bottom-40 -right-32 w-[650px] h-[500px] rounded-full blur-[150px] transition-all duration-1000 ${
          isCommitted ? 'bg-[#0D9488]/15 opacity-60' : 'bg-[#149B9E]/10 opacity-40'
        }`}
      />
      <div className="absolute -bottom-40 -left-32 w-[650px] h-[500px] rounded-full bg-[#38BDF8]/10 blur-[150px] opacity-35" />

      {/* Soft Clinical Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(226,232,240,0.5)]" />
    </div>
  );
};

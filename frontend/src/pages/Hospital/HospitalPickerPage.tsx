import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHospitals, useActiveRequests } from '../../hooks/useSubscriptions';
import { Card } from '../../components/primitives/Card';
import { StatusBadge } from '../../components/domain/StatusBadge';
import { FreshnessBadge } from '../../components/domain/FreshnessBadge';
import { unlockAudio, isAudioUnlocked, playAlertSound } from '../../utils/sound';
import { Building2, Volume2, VolumeX, ArrowRight, Laptop } from 'lucide-react';
import clsx from 'clsx';

export const HospitalPickerPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: hospitals } = useHospitals();
  const { data: allPending } = useActiveRequests();

  const [soundEnabled, setSoundEnabled] = useState(isAudioUnlocked());

  const handleEnableSound = () => {
    const success = unlockAudio();
    if (success) {
      setSoundEnabled(true);
      playAlertSound();
    }
  };

  return (
    <div className="min-h-screen text-[#2D231C] p-6 md:p-12 font-sans select-none relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-[#E8E2D9] pb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Laptop className="w-5 h-5 text-[#EA580C]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#C2410C] font-black bg-[#FFF7ED] px-2.5 py-1 rounded-full border border-[#EA580C]/30">
                Hospital Reception Console Launcher
              </span>
            </div>
            <h1 className="text-3xl font-display font-black text-[#2D231C] tracking-tight mt-1">
              Select Operating Hospital
            </h1>
            <p className="text-sm text-[#7D7067] font-medium mt-1">
              Choose the facility this projected reception screen represents during the live demo.
            </p>
          </div>

          {/* Sound Unlock Button per H.2.2 */}
          <div>
            <button
              type="button"
              onClick={handleEnableSound}
              className={clsx(
                'px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-xs',
                soundEnabled
                  ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]'
                  : 'border-[#F59E0B] bg-[#FEF3C7] text-[#B45309] hover:bg-[#FDE68A] animate-pulse'
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#EA580C]" /> : <VolumeX className="w-4 h-4 text-[#B45309]" />}
              <span>{soundEnabled ? 'Alert Chime Unlocked' : 'Unlock Alert Sound (Browser Autoplay)'}</span>
            </button>
          </div>
        </div>

        {/* Hospital Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {hospitals.map((hosp) => {
            const pendingForThis = allPending.filter((r) => r.hospital_id === hosp.id);
            const hasPending = pendingForThis.length > 0;

            return (
              <div
                key={hosp.id}
                onClick={() => navigate(`/hospital/${hosp.id}`)}
                className={clsx(
                  'p-6 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm bg-white',
                  hasPending
                    ? 'border-[#EA580C] bg-[#F0FDFA] ring-2 ring-[#EA580C]/20'
                    : 'border-[#E8E2D9] hover:border-[#EA580C] hover:shadow-md'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs text-[#7D7067] font-bold">{hosp.id}</span>
                    <FreshnessBadge lastUpdatedAt={hosp.last_updated_at} showSentenceOnUnknown={false} />
                  </div>

                  <h3 className="text-xl font-display font-black text-[#2D231C] tracking-tight mb-2 group-hover:text-[#EA580C] transition-colors">
                    {hosp.name}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono my-3">
                    <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#E8E2D9] text-center">
                      <span className="text-[10px] text-[#7D7067] uppercase font-bold block">ICU Beds</span>
                      <div className="font-black text-[#2D231C] mt-0.5">{hosp.icu_beds_free} free</div>
                    </div>
                    <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#E8E2D9] text-center">
                      <span className="text-[10px] text-[#7D7067] uppercase font-bold block">Ventilators</span>
                      <div className="font-black text-[#2D231C] mt-0.5">{hosp.ventilators_free} free</div>
                    </div>
                    <div className="bg-[#FAF8F5] p-2 rounded-xl border border-[#E8E2D9] text-center">
                      <span className="text-[10px] text-[#7D7067] uppercase font-bold block">Reliability</span>
                      <div className="font-black text-[#52796F] mt-0.5">
                        {hosp.reliability_score !== null ? `${Math.round(hosp.reliability_score * 100)}%` : 'New'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E2D9] flex items-center justify-between text-xs font-mono">
                  {hasPending ? (
                    <span className="text-[#E11D48] font-black flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                      <span>{pendingForThis.length} Incoming Request Pending</span>
                    </span>
                  ) : (
                    <span className="text-[#7D7067] font-medium">Console Idle • No incoming</span>
                  )}
                  <span className="text-[#EA580C] group-hover:text-[#C2410C] flex items-center gap-1 font-bold">
                    <span>Open Console</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#EA580C]" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

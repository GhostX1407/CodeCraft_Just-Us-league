import React from 'react';
import clsx from 'clsx';
import { NeedProfile, Hospital } from '../../types/domain';

interface NeedProfileChipsProps {
  needProfile: NeedProfile;
  hospital?: Hospital | null; // If provided, marks satisfied chips
  className?: string;
  compact?: boolean;
}

export const NeedProfileChips: React.FC<NeedProfileChipsProps> = ({
  needProfile,
  hospital,
  className,
  compact = false,
}) => {
  const isSpecialistSatisfied = (spec: string) => {
    if (!hospital) return true;
    return hospital.specialists_on_call.some((s) => s.toLowerCase().includes(spec.toLowerCase()));
  };

  const isFlagSatisfied = (flag: string) => {
    if (!hospital) return true;
    if (flag === 'trauma_team') return hospital.trauma_team_on_shift;
    if (flag === 'icu') return hospital.icu_beds_free > 0;
    return true;
  };

  const isBloodSatisfied = (blood: string) => {
    if (!hospital) return true;
    return (hospital.blood_stock[blood as keyof typeof hospital.blood_stock] || 0) > 0;
  };

  const chipBase = compact
    ? 'text-[10px] px-2 py-0.5 rounded-full font-mono'
    : 'text-xs px-3 py-1 rounded-full font-mono';

  return (
    <div className={clsx('flex flex-wrap items-center gap-1.5', className)}>
      {/* Specialists */}
      {needProfile.specialists_needed.map((spec) => {
        const satisfied = isSpecialistSatisfied(spec);
        return (
          <span
            key={spec}
            className={clsx(
              chipBase,
              'border',
              satisfied
                ? 'border-[#149B9E]/40 bg-[#E6F7F7] text-[#0D7C7E] font-bold'
                : 'border-[#E2E8F0] text-[#94A3B8] line-through bg-[#F8FAFC]'
            )}
            title={satisfied ? 'Specialist verified on duty' : 'Specialist unavailable'}
          >
            {spec.replace('_', ' ')}
          </span>
        );
      })}

      {/* Capability Flags */}
      {needProfile.capability_flags.map((flag) => {
        const satisfied = isFlagSatisfied(flag);
        return (
          <span
            key={flag}
            className={clsx(
              chipBase,
              'border',
              satisfied
                ? 'border-[#0D9488]/40 bg-[#CCFBF1] text-[#0F766E] font-bold'
                : 'border-[#E2E8F0] text-[#94A3B8] bg-[#F8FAFC]'
            )}
          >
            {flag.replace('_', ' ')}
          </span>
        );
      })}

      {/* Blood stock */}
      {needProfile.blood_type_needed && (
        <span
          className={clsx(
            chipBase,
            'border',
            isBloodSatisfied(needProfile.blood_type_needed)
              ? 'border-[#E11D48]/30 bg-[#FFE4E6] text-[#BE123C] font-bold'
              : 'border-[#E2E8F0] text-[#94A3B8] line-through bg-[#F8FAFC]'
          )}
        >
          Blood: {needProfile.blood_type_needed}
        </span>
      )}
    </div>
  );
};

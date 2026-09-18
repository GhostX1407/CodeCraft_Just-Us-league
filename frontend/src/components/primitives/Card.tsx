import React from 'react';
import clsx from 'clsx';
import { RequestStatus } from '../../types/domain';
import { Card3D } from './Card3D';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  railStatus?: RequestStatus;
  elevation?: 'flat' | 'lifted' | 'sunken';
  interactive?: boolean;
  noPadding?: boolean;
  tilt?: boolean;
  borderBeam?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  railStatus,
  elevation = 'flat',
  interactive = false,
  noPadding = false,
  tilt = false,
  borderBeam = false,
  className,
  ...props
}) => {
  if (tilt) {
    return (
      <Card3D
        railStatus={railStatus}
        elevation={elevation}
        interactive={interactive}
        noPadding={noPadding}
        borderBeam={borderBeam}
        className={className}
        {...props}
      >
        {children}
      </Card3D>
    );
  }

  const getRailColor = () => {
    switch (railStatus) {
      case 'accepted':
        return 'before:bg-[#52796F] before:shadow-[0_0_12px_rgba(82,121,111,0.4)]';
      case 'pending':
        return 'before:bg-[#EA580C] before:shadow-[0_0_12px_rgba(234,88,12,0.4)]';
      case 'rejected':
      case 'timed_out':
        return 'before:bg-[#DC2626] before:shadow-[0_0_12px_rgba(220,38,38,0.4)]';
      case 'superseded':
        return 'before:bg-[#D97706] before:shadow-[0_0_12px_rgba(217,119,6,0.4)]';
      default:
        return 'before:bg-[#E8E2D9]';
    }
  };

  const getElevation = () => {
    switch (elevation) {
      case 'lifted':
        return 'shadow-[0_18px_35px_-8px_rgba(45,35,28,0.08),0_0_0_1px_rgba(232,226,217,0.8)] bg-white border-[#E8E2D9]';
      case 'sunken':
        return 'opacity-90 border-[#E8E2D9] bg-[#FAF8F5]';
      case 'flat':
      default:
        return 'border-[#E8E2D9] bg-white shadow-[0_4px_14px_rgba(45,35,28,0.04),0_1px_3px_rgba(45,35,28,0.02)]';
    }
  };

  return (
    <div
      className={clsx(
        'relative rounded-2xl border transition-all duration-200 select-none overflow-hidden text-[#2D231C]',
        railStatus && 'pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3.5px] before:rounded-l',
        railStatus && getRailColor(),
        interactive &&
          'hover:-translate-y-0.5 hover:border-[#EA580C]/50 hover:shadow-[0_16px_36px_-8px_rgba(45,35,28,0.10)] cursor-pointer active:scale-[0.99]',
        getElevation(),
        !noPadding && 'p-5 sm:p-6',
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};

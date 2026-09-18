import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { RequestStatus } from '../../types/domain';

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  railStatus?: RequestStatus;
  elevation?: 'flat' | 'lifted' | 'sunken';
  interactive?: boolean;
  noPadding?: boolean;
  maxTilt?: number;
  glare?: boolean;
  borderBeam?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  railStatus,
  elevation = 'flat',
  interactive = true,
  noPadding = false,
  maxTilt = 6,
  glare = true,
  borderBeam = false,
  className,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [glareStyle, setGlareStyle] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const normX = (x - centerX) / centerX;
      const normY = (y - centerY) / centerY;

      const rotateX = -normY * maxTilt;
      const rotateY = normX * maxTilt;

      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.012, 1.012, 1.012)`
      );

      setGlareStyle({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
        opacity: 0.12,
      });
    },
    [interactive, maxTilt]
  );

  const handleMouseEnter = () => {
    if (!interactive) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setIsHovered(false);
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlareStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  const getRailColor = () => {
    switch (railStatus) {
      case 'accepted':
        return 'before:bg-[#0D9488] before:shadow-[0_0_12px_rgba(13,148,136,0.4)]';
      case 'pending':
        return 'before:bg-[#149B9E] before:shadow-[0_0_12px_rgba(20,155,158,0.4)]';
      case 'rejected':
      case 'timed_out':
        return 'before:bg-[#E11D48] before:shadow-[0_0_12px_rgba(225,29,72,0.4)]';
      case 'superseded':
        return 'before:bg-[#D97706] before:shadow-[0_0_12px_rgba(217,119,6,0.4)]';
      default:
        return 'before:bg-[#E2E8F0]';
    }
  };

  const getElevation = () => {
    switch (elevation) {
      case 'lifted':
        return 'shadow-[0_18px_35px_-8px_rgba(15,23,42,0.08),0_0_0_1px_rgba(226,232,240,0.8)] bg-white border-[#E2E8F0]';
      case 'sunken':
        return 'opacity-90 border-[#E2E8F0] bg-[#F8FAFC]';
      case 'flat':
      default:
        return 'border-[#E2E8F0] bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.02)]';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: isHovered
          ? 'transform 80ms ease-out, box-shadow 220ms ease, border-color 220ms ease'
          : 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 450ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={clsx(
        'relative rounded-2xl border select-none overflow-hidden transform-3d will-change-transform text-[#0F172A]',
        railStatus && 'pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3.5px] before:rounded-l',
        railStatus && getRailColor(),
        interactive && 'cursor-pointer hover:border-[#149B9E]/50 hover:shadow-[0_20px_45px_-10px_rgba(15,23,42,0.10)]',
        getElevation(),
        !noPadding && 'p-6',
        className
      )}
      {...props}
    >
      {/* Specular Glare Layer */}
      {glare && interactive && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-20"
          style={{
            background: `radial-gradient(400px circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255,255,255,${glareStyle.opacity}), transparent 60%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Interactive 3D Content Container */}
      <div
        className="relative z-10 transition-transform duration-200"
        style={{ transform: isHovered && interactive ? 'translateZ(10px)' : 'translateZ(0px)' }}
      >
        {children}
      </div>
    </div>
  );
};

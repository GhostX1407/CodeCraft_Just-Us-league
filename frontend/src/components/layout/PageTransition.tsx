import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Reset scroll smoothly on page switch
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="relative w-full min-h-[calc(100vh-5rem)]">
      {/* 1. Nano-Horizon Progress Indicator (Signature Saffron -> Warm Amber -> Healing Sage) */}
      {isNavigating && (
        <div
          aria-hidden="true"
          className="fixed top-0 inset-x-0 h-[2.5px] z-[100] pointer-events-none"
        >
          <div className="h-full w-full bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#52796F] shadow-[0_0_12px_rgba(234,88,12,0.5),0_0_20px_rgba(245,158,11,0.3)] animate-nano-horizon" />
        </div>
      )}

      {/* 2. Main Page Content with Smooth Simple Transition */}
      <div
        key={location.pathname}
        className="animate-page-smooth w-full relative"
      >
        {children}
      </div>
    </div>
  );
};

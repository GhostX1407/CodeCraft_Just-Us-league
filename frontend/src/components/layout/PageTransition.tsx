import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [transitionKey, setTransitionKey] = useState(location.pathname);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Reset scroll smoothly on page switch
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    setTransitionKey(location.pathname);
    setIsNavigating(true);

    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 550);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="relative w-full min-h-[calc(100vh-5rem)]">
      {/* 1. Nano-Horizon Progress Indicator (Signature Orange -> Warm Yellow -> Soft Sage) */}
      {isNavigating && (
        <div
          aria-hidden="true"
          className="fixed top-0 inset-x-0 h-[2.5px] z-[100] pointer-events-none"
        >
          <div className="h-full w-full bg-gradient-to-r from-[#F28A16] via-[#F4C400] to-[#B7C48A] shadow-[0_0_12px_rgba(242,138,22,0.6),0_0_20px_rgba(244,196,0,0.4)] animate-nano-horizon" />
        </div>
      )}

      {/* 2. Main Spatial Content with Camera Lens De-focus to Crystal Focus Transition */}
      <div
        key={transitionKey}
        className="animate-spatial-emerge w-full relative"
      >
        {/* Subtle Ambient Light Sheen Wave on page switch */}
        {isNavigating && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
          >
            <div className="w-[60%] h-[300%] -top-[100%] absolute bg-gradient-to-r from-transparent via-white/35 to-transparent animate-ambient-sheen" />
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

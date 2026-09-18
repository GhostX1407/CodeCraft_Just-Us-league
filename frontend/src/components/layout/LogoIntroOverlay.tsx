import React, { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

export const INTRO_STORAGE_KEY = 'raahi_intro_seen';

interface LogoIntroOverlayProps {
  onComplete: () => void;
}

export const LogoIntroOverlay: React.FC<LogoIntroOverlayProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const completedRef = useRef(false);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Mark storage flag so intro is not repeated
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage access errors if private mode
    }

    // Begin gentle fade-out transition
    setFadingOut(true);

    setTimeout(() => {
      onComplete();
    }, 650);
  }, [onComplete]);

  // Reduced motion preference check
  useEffect(() => {
    try {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        finishIntro();
        return;
      }
    } catch {
      // Fall through
    }
  }, [finishIntro]);

  // Fallback safety timeout (12s max) to guarantee user never gets stuck
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!completedRef.current) {
        finishIntro();
      }
    }, 12000);

    return () => clearTimeout(safetyTimer);
  }, [finishIntro]);

  // Video event handlers
  const handleVideoEnded = () => {
    // Brief visual hold (~300ms) after animation completes before fade
    setTimeout(() => {
      finishIntro();
    }, 300);
  };

  const handleVideoError = () => {
    // Graceful error fallback
    finishIntro();
  };

  const handleCanPlay = () => {
    setVideoReady(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback - finish smoothly
        finishIntro();
      });
    }
  };

  // Ensure playback starts on mount even if video is already cached
  useEffect(() => {
    if (videoRef.current) {
      if (videoRef.current.readyState >= 2) {
        setVideoReady(true);
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handled or ignored if browser pauses
        });
      }
    }
  }, []);

  // Keyboard skip listener (Escape or Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishIntro]);

  return (
    <div
      role="region"
      aria-label="Raahi Brand Intro"
      onClick={finishIntro}
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden cursor-pointer transition-opacity duration-700 ease-out',
        'bg-[#FAF8F5]', // Matches the exact porcelain silk white palette
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Ambient Silk Radiance Halos behind the video */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Warm Saffron-Amber Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-r from-[#F59E0B]/20 via-[#EA580C]/15 to-[#52796F]/15 blur-[120px] pointer-events-none" />
        {/* Soft Silk Vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(232,226,217,0.5)] pointer-events-none" />
      </div>

      {/* Video Presentation Container */}
      <div
        className={clsx(
          'relative z-10 w-full max-w-2xl max-h-[80vh] px-4 flex items-center justify-center transition-opacity duration-500 ease-out',
          videoReady ? 'opacity-100 scale-100' : 'opacity-90 scale-[0.99]'
        )}
      >
        <video
          ref={videoRef}
          src="/raahi-intro.mp4"
          muted
          playsInline
          autoPlay
          preload="auto"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
          onCanPlay={handleCanPlay}
          className="w-full h-auto max-h-[75vh] object-contain rounded-2xl shadow-[0_20px_50px_rgba(45,35,28,0.06)]"
        />
      </div>
    </div>
  );
};

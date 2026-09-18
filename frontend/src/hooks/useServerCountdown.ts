import { useState, useEffect, useRef } from 'react';
import { Timestamp } from '../types/domain';
import { toMillis } from '../utils/time';

const TOTAL_COUNTDOWN_SECONDS = 30;

export function useServerCountdown(expiresAt: Timestamp | null | undefined): {
  secondsRemaining: number;
  fraction: number;
  expiredLocally: boolean;
} {
  const targetMs = toMillis(expiresAt);
  const totalMs = TOTAL_COUNTDOWN_SECONDS * 1000;

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!expiresAt) return 0;
    const diff = targetMs - Date.now();
    return Math.max(0, Math.ceil(diff / 1000));
  });

  const [fraction, setFraction] = useState<number>(() => {
    if (!expiresAt) return 0;
    const diff = targetMs - Date.now();
    return Math.min(1, Math.max(0, diff / totalMs));
  });

  const animRef = useRef<number>();

  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(0);
      setFraction(0);
      return;
    }

    // Interval for tabular second digits
    const interval = setInterval(() => {
      const remainingMs = targetMs - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(secs);
    }, 250);

    // High-performance requestAnimationFrame loop for fluid 120Hz ring/bar transitions
    const updateFrame = () => {
      const remainingMs = targetMs - Date.now();
      const frac = Math.min(1, Math.max(0, remainingMs / totalMs));
      setFraction(frac);

      if (remainingMs > -2000) {
        animRef.current = requestAnimationFrame(updateFrame);
      }
    };

    animRef.current = requestAnimationFrame(updateFrame);

    return () => {
      clearInterval(interval);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [expiresAt, targetMs, totalMs]);

  return {
    secondsRemaining,
    fraction,
    expiredLocally: secondsRemaining === 0,
  };
}

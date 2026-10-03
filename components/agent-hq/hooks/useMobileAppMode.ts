'use client';

import { useEffect, useState } from 'react';

/**
 * Phone-only signal. Requires a mobile user-agent — resized desktop windows never match.
 */
export function detectPhoneBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const phoneUa = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (!phoneUa) return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

export function useIsPhoneBrowser(): boolean {
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const refresh = () => setPhone(detectPhoneBrowser());
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
    };
  }, []);

  return phone;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

/** User opted into full desktop chrome while on a phone. */
export const FORCE_DESKTOP_UI_KEY = 'agentHQ_forceDesktopUi';

/**
 * Phone-only signal. Requires a mobile user-agent — resized desktop windows never match.
 * iPad / "Request Desktop Website" will get desktop UI (safe default).
 */
export function detectPhoneBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const phoneUa = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (!phoneUa) return false;
  // Extra guard: ignore odd desktop spoofs with huge viewports
  return window.matchMedia('(max-width: 900px)').matches;
}

export function useMobileAppMode() {
  const [forceDesktop, setForceDesktop] = useLocalStorage<boolean>(FORCE_DESKTOP_UI_KEY, false);
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

  const useLimitedMobileUi = phone && !forceDesktop;

  const showDesktopUi = useCallback(() => {
    setForceDesktop(true);
  }, [setForceDesktop]);

  const showMobileUi = useCallback(() => {
    setForceDesktop(false);
  }, [setForceDesktop]);

  return {
    /** True only on real phone browsers when user hasn't forced desktop. */
    useLimitedMobileUi,
    /** Phone UA detected (even if showing desktop UI). */
    isPhoneBrowser: phone,
    forceDesktop,
    showDesktopUi,
    showMobileUi,
  };
}

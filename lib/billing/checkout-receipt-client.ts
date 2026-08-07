'use client';

import {
  CHECKOUT_SESSION_COOKIE,
  CHECKOUT_SESSION_MAX_AGE_SEC,
  CHECKOUT_SESSION_STORAGE_KEY,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function persistCheckoutSessionId(sessionId: string): void {
  if (!isCheckoutSessionId(sessionId) || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, sessionId);
  } catch {
    /* private mode */
  }
  document.cookie = `${CHECKOUT_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${CHECKOUT_SESSION_MAX_AGE_SEC}; SameSite=Lax`;
}

export function readPersistedCheckoutSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
    if (isCheckoutSessionId(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  const fromCookie = readCookie(CHECKOUT_SESSION_COOKIE);
  return isCheckoutSessionId(fromCookie) ? fromCookie : null;
}

/** Prefer URL param, then storage/cookie. */
export function resolveCheckoutSessionId(fromUrl?: string | null): string | null {
  if (isCheckoutSessionId(fromUrl)) {
    persistCheckoutSessionId(fromUrl);
    return fromUrl;
  }
  return readPersistedCheckoutSessionId();
}

export function clearCheckoutSessionId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  document.cookie = `${CHECKOUT_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

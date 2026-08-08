'use client';

import {
  CHECKOUT_SESSION_STORAGE_KEY,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';

/** Client-only memory of session id for request bodies. Entitlement cookies are HttpOnly (server-set). */
export function persistCheckoutSessionId(sessionId: string): void {
  if (!isCheckoutSessionId(sessionId) || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, sessionId);
  } catch {
    /* private mode */
  }
}

export function readPersistedCheckoutSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
    if (isCheckoutSessionId(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  return null;
}

/** Prefer URL param, then sessionStorage. */
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
}

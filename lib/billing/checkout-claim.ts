import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  CHECKOUT_SESSION_COOKIE,
  CHECKOUT_SESSION_MAX_AGE_SEC,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';

/** HMAC proof that this browser completed the Stripe return URL for a session. */
export const CHECKOUT_CLAIM_COOKIE = 'dw_checkout_claim';

function claimSecret(): string {
  return (
    process.env.CHECKOUT_CLAIM_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    ''
  );
}

function signPayload(payload: string): string {
  const secret = claimSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Compact token: sessionId.exp.sig */
export function signCheckoutClaim(
  sessionId: string,
  maxAgeSec = CHECKOUT_SESSION_MAX_AGE_SEC
): string | null {
  if (!isCheckoutSessionId(sessionId) || !claimSecret()) return null;
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${sessionId}.${exp}`;
  const sig = signPayload(payload);
  if (!sig) return null;
  return `${payload}.${sig}`;
}

export function verifyCheckoutClaimToken(
  token: string | null | undefined,
  sessionId: string
): boolean {
  if (!token || !isCheckoutSessionId(sessionId) || !claimSecret()) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenSession, expRaw, sig] = parts;
  if (tokenSession !== sessionId) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${tokenSession}.${expRaw}`;
  const expected = signPayload(payload);
  if (!expected || !sig) return false;
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function hasValidCheckoutClaim(sessionId: string | null | undefined): boolean {
  if (!isCheckoutSessionId(sessionId)) return false;
  const token = cookies().get(CHECKOUT_CLAIM_COOKIE)?.value;
  return verifyCheckoutClaimToken(token, sessionId);
}

/**
 * Session-based entitlement claim is allowed when:
 * - browser has Stripe-return claim cookie for this session, or
 * - the account email is already confirmed (inbox proof).
 */
export function canClaimCheckoutSession(
  sessionId: string | null | undefined,
  emailConfirmed: boolean
): boolean {
  if (!isCheckoutSessionId(sessionId)) return false;
  if (emailConfirmed) return true;
  return hasValidCheckoutClaim(sessionId);
}

export function applyCheckoutClaimCookies(res: NextResponse, sessionId: string): boolean {
  const token = signCheckoutClaim(sessionId);
  if (!token) return false;
  const secure = process.env.NODE_ENV === 'production';
  const common = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: CHECKOUT_SESSION_MAX_AGE_SEC,
  };
  res.cookies.set(CHECKOUT_SESSION_COOKIE, sessionId, common);
  res.cookies.set(CHECKOUT_CLAIM_COOKIE, token, common);
  return true;
}

export function clearCheckoutClaimCookies(res: NextResponse) {
  res.cookies.set(CHECKOUT_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(CHECKOUT_CLAIM_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

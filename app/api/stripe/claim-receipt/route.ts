import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  CHECKOUT_NONCE_COOKIE,
  applyCheckoutClaimCookies,
  assertCheckoutNonceMatchesSession,
  verifyCheckoutNonceCookie,
} from '@/lib/billing/checkout-claim';
import { isCheckoutSessionId } from '@/lib/billing/checkout-receipt';
import { isDemoCheckoutSessionId } from '@/lib/billing/demo';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { getAppOrigin, isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';

/**
 * Stripe success_url lands here first.
 * Requires the pre-checkout nonce cookie (set when Checkout was created) so a leaked
 * session_id alone cannot mint claim cookies / prefill email / steal the sub.
 */
export async function GET(request: Request) {
  const origin = getAppOrigin();
  const loginSignup = `${origin}/login?mode=signup&next=/app`;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id')?.trim() || '';

  const ip = clientIpFromRequest(request);
  if (!rateLimitAllow(`claim-receipt:${ip}`, 30, 60_000)) {
    return NextResponse.redirect(loginSignup);
  }

  if (!isCheckoutSessionId(sessionId)) {
    return NextResponse.redirect(loginSignup);
  }

  const nonceCookie = cookies().get(CHECKOUT_NONCE_COOKIE)?.value;

  if (isBillingDemoFlow() && isDemoCheckoutSessionId(sessionId)) {
    if (!verifyCheckoutNonceCookie(nonceCookie, sessionId)) {
      return NextResponse.redirect(loginSignup);
    }
    const res = NextResponse.redirect(loginSignup);
    applyCheckoutClaimCookies(res, sessionId);
    return res;
  }

  if (!isBillingEnabled()) {
    return NextResponse.redirect(loginSignup);
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return NextResponse.redirect(loginSignup);
    }

    const metadataNonce = session.metadata?.claim_nonce?.trim() || null;
    if (!assertCheckoutNonceMatchesSession(nonceCookie, sessionId, metadataNonce)) {
      console.warn('[stripe/claim-receipt] nonce mismatch or missing');
      return NextResponse.redirect(loginSignup);
    }

    const res = NextResponse.redirect(loginSignup);
    if (!applyCheckoutClaimCookies(res, sessionId)) {
      console.error('[stripe/claim-receipt] missing claim signing secret');
    }
    return res;
  } catch (error) {
    console.error('[stripe/claim-receipt]', error);
    return NextResponse.redirect(loginSignup);
  }
}

import { NextResponse } from 'next/server';
import { applyCheckoutClaimCookies } from '@/lib/billing/checkout-claim';
import { isCheckoutSessionId } from '@/lib/billing/checkout-receipt';
import { isDemoCheckoutSessionId } from '@/lib/billing/demo';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { getAppOrigin, isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';

/**
 * Stripe success_url lands here first.
 * Sets HttpOnly claim cookies, then redirects to signup — so a leaked session_id
 * alone cannot prefill email or auto-confirm / claim the subscription.
 */
export async function GET(request: Request) {
  const origin = getAppOrigin();
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id')?.trim() || '';
  const next = `/login?mode=signup&next=/app&session_id=${encodeURIComponent(sessionId)}`;

  const ip = clientIpFromRequest(request);
  if (!rateLimitAllow(`claim-receipt:${ip}`, 30, 60_000)) {
    return NextResponse.redirect(`${origin}/login?mode=signup&next=/app`);
  }

  if (!isCheckoutSessionId(sessionId)) {
    return NextResponse.redirect(`${origin}/login?mode=signup&next=/app`);
  }

  if (isBillingDemoFlow() && isDemoCheckoutSessionId(sessionId)) {
    const res = NextResponse.redirect(`${origin}${next}`);
    applyCheckoutClaimCookies(res, sessionId);
    return res;
  }

  if (!isBillingEnabled()) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (session.status !== 'complete' && session.payment_status !== 'paid') {
      return NextResponse.redirect(`${origin}/login?mode=signup&next=/app`);
    }
    const res = NextResponse.redirect(`${origin}${next}`);
    if (!applyCheckoutClaimCookies(res, sessionId)) {
      console.error('[stripe/claim-receipt] missing claim signing secret');
    }
    return res;
  } catch (error) {
    console.error('[stripe/claim-receipt]', error);
    return NextResponse.redirect(`${origin}/login?mode=signup&next=/app`);
  }
}

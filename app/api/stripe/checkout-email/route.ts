import { NextResponse } from 'next/server';
import { checkoutSessionEmail, maskEmail } from '@/lib/billing/checkout-email';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { getStripeClient } from '@/lib/stripe/client';
import { isBillingEnabled } from '@/lib/stripe/config';

export const dynamic = 'force-dynamic';

/** Prefill hint only — never return the full checkout email to anonymous callers. */
export async function GET(req: Request) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const ip = clientIpFromRequest(req);
  if (!rateLimitAllow(`checkout-email:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const sessionId = new URL(req.url).searchParams.get('session_id')?.trim() || '';
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = checkoutSessionEmail(session);

    if (!email) {
      return NextResponse.json({ error: 'No email on checkout session' }, { status: 404 });
    }

    return NextResponse.json({ emailMasked: maskEmail(email), hintDomain: email.split('@')[1] || null });
  } catch (err) {
    console.error('[checkout-email]', err);
    return NextResponse.json({ error: 'Could not load checkout email' }, { status: 500 });
  }
}

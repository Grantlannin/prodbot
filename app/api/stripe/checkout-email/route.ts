import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { isBillingEnabled } from '@/lib/stripe/config';

export const dynamic = 'force-dynamic';

/** Return the checkout email for a Stripe session so signup can be prefilled. */
export async function GET(req: Request) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const sessionId = new URL(req.url).searchParams.get('session_id')?.trim() || '';
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email =
      session.customer_details?.email?.trim().toLowerCase() ||
      session.customer_email?.trim().toLowerCase() ||
      null;

    if (!email) {
      return NextResponse.json({ error: 'No email on checkout session' }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (err) {
    console.error('[checkout-email]', err);
    return NextResponse.json({ error: 'Could not load checkout email' }, { status: 500 });
  }
}

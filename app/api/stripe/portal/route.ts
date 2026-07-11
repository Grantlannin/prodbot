import { NextResponse } from 'next/server';
import { fetchBillingForUser } from '@/lib/billing/profile';
import { getAppOrigin, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const billing = await fetchBillingForUser(supabase, user.id);
    if (!billing?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account yet' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const origin = getAppOrigin();
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/portal]', error);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}

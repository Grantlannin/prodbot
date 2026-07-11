import { NextResponse } from 'next/server';
import { fetchBillingForUser, upsertBillingForUser } from '@/lib/billing/profile';
import { getAppOrigin, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { resolveMonthlyPriceId } from '@/lib/stripe/resolve-price';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
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

    if (!user?.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const billing = await fetchBillingForUser(supabase, user.id);
    const stripe = getStripeClient();
    const priceId = await resolveMonthlyPriceId(stripe);
    let customerId = billing?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await upsertBillingForUser(createAdminSupabaseClient(), user.id, {
        stripe_customer_id: customerId,
      });
    }

    const origin = getAppOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscribe/success`,
      cancel_url: `${origin}/subscribe?canceled=1`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/checkout]', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}

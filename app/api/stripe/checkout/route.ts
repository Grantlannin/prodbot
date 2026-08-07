import { NextResponse } from 'next/server';
import { DEMO_CHECKOUT_SESSION_ID } from '@/lib/billing/demo';
import { getAppOrigin, isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { resolveMonthlyPriceId } from '@/lib/stripe/resolve-price';
import { fetchBillingForUser, upsertBillingForUser } from '@/lib/billing/profile';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SUCCESS_URL = (origin: string) =>
  `${origin}/login?mode=signup&next=/app&session_id={CHECKOUT_SESSION_ID}`;

export async function POST() {
  const origin = getAppOrigin();

  // Fake purchase path for ripping through purchase → OTO → onboard.
  if (isBillingDemoFlow()) {
    return NextResponse.json({
      url: `${origin}/subscribe/success?session_id=${DEMO_CHECKOUT_SESSION_ID}`,
      demo: true,
    });
  }

  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  try {
    const stripe = getStripeClient();
    const priceId = await resolveMonthlyPriceId(stripe);

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const billing = await fetchBillingForUser(supabase, user.id);
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

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: SUCCESS_URL(origin),
        cancel_url: `${origin}/?canceled=1`,
        allow_promotion_codes: true,
        payment_method_collection: 'always',
      });

      if (!session.url) {
        return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
      }

      return NextResponse.json({ url: session.url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: SUCCESS_URL(origin),
      cancel_url: `${origin}/?canceled=1`,
      allow_promotion_codes: true,
      payment_method_collection: 'always',
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

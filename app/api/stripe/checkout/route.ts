import { NextResponse } from 'next/server';
import {
  applyCheckoutNonceCookie,
  generateCheckoutNonce,
} from '@/lib/billing/checkout-claim';
import { DEMO_CHECKOUT_SESSION_ID } from '@/lib/billing/demo';
import { STARTER_TRIAL_DAYS } from '@/lib/billing/price';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { getAppOrigin, getStripeStarterPriceId, isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { resolveMonthlyPriceId } from '@/lib/stripe/resolve-price';
import { fetchBillingForUser, upsertBillingForUser } from '@/lib/billing/profile';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

const SUCCESS_URL = (origin: string) =>
  `${origin}/api/stripe/claim-receipt?session_id={CHECKOUT_SESSION_ID}`;

/** $1 quickstart + 7-day trial — off unless explicitly enabled. */
function resolveStarterPriceId(): string | undefined {
  if (process.env.STRIPE_STARTER_OFFER?.trim() !== 'true') return undefined;
  return getStripeStarterPriceId();
}

function jsonWithNonce(body: Record<string, unknown>, sessionId: string, nonce: string) {
  const res = NextResponse.json(body);
  if (!applyCheckoutNonceCookie(res, sessionId, nonce)) {
    console.error('[stripe/checkout] missing claim signing secret for nonce cookie');
  }
  return res;
}

function buildSubscriptionCheckoutParams(args: {
  priceId: string;
  starterPriceId: string | undefined;
  nonce: string;
  customerId?: string;
  clientReferenceId?: string;
  origin: string;
}): Stripe.Checkout.SessionCreateParams {
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: args.priceId, quantity: 1 },
  ];
  if (args.starterPriceId) {
    line_items.push({ price: args.starterPriceId, quantity: 1 });
  }

  return {
    mode: 'subscription',
    ...(args.customerId ? { customer: args.customerId } : {}),
    ...(args.clientReferenceId ? { client_reference_id: args.clientReferenceId } : {}),
    line_items,
    success_url: SUCCESS_URL(args.origin),
    cancel_url: `${args.origin}/?canceled=1`,
    allow_promotion_codes: true,
    payment_method_collection: 'always',
    metadata: { claim_nonce: args.nonce },
    subscription_data: {
      metadata: { claim_nonce: args.nonce },
      ...(args.starterPriceId ? { trial_period_days: STARTER_TRIAL_DAYS } : {}),
    },
  };
}

export async function POST(request: Request) {
  const origin = getAppOrigin();
  const ip = clientIpFromRequest(request);
  if (!rateLimitAllow(`stripe-checkout:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: 'Too many checkout attempts. Try again shortly.' }, { status: 429 });
  }

  // Fake purchase path for ripping through purchase → OTO → onboard.
  if (isBillingDemoFlow()) {
    const nonce = generateCheckoutNonce();
    return jsonWithNonce(
      {
        url: `${origin}/api/stripe/claim-receipt?session_id=${DEMO_CHECKOUT_SESSION_ID}`,
        demo: true,
      },
      DEMO_CHECKOUT_SESSION_ID,
      nonce
    );
  }

  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  try {
    const stripe = getStripeClient();
    const priceId = await resolveMonthlyPriceId(stripe);
    const starterPriceId = resolveStarterPriceId();
    const nonce = generateCheckoutNonce();

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

      const session = await stripe.checkout.sessions.create(
        buildSubscriptionCheckoutParams({
          priceId,
          starterPriceId,
          nonce,
          customerId,
          clientReferenceId: user.id,
          origin,
        })
      );

      if (!session.url || !session.id) {
        return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
      }

      return jsonWithNonce({ url: session.url }, session.id, nonce);
    }

    const session = await stripe.checkout.sessions.create(
      buildSubscriptionCheckoutParams({
        priceId,
        starterPriceId,
        nonce,
        origin,
      })
    );

    if (!session.url || !session.id) {
      return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
    }

    return jsonWithNonce({ url: session.url }, session.id, nonce);
  } catch (error) {
    console.error('[stripe/checkout]', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 });
  }
}

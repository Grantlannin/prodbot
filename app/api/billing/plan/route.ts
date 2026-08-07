import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { MONTHLY_PRICE_LABEL } from '@/lib/billing/price';
import { fetchBillingForUser, upsertBillingForUser } from '@/lib/billing/profile';
import { isActiveSubscription, mapStripeSubscriptionStatus } from '@/lib/billing/subscription';
import { getStripeClient } from '@/lib/stripe/client';
import { isBillingEnabled } from '@/lib/stripe/config';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const periodEnd =
    subscription.items.data[0]?.current_period_end ??
    (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

async function findCustomerSubscription(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  return (
    subscriptions.data.find(
      s => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'
    ) ??
    subscriptions.data[0] ??
    null
  );
}

/** Current plan details for the simple billing page. */
export async function GET() {
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
    const active = isActiveSubscription(billing);

    if (!billing?.stripe_customer_id) {
      return NextResponse.json({
        active,
        status: billing?.subscription_status ?? 'none',
        planName: 'Daywinner',
        priceLabel: `${MONTHLY_PRICE_LABEL}/month`,
        endsAt: billing?.subscription_ends_at ?? null,
        cancelAtPeriodEnd: false,
      });
    }

    const stripe = getStripeClient();
    const subscription = await findCustomerSubscription(stripe, billing.stripe_customer_id);
    const endsAt = subscription ? periodEndIso(subscription) : billing.subscription_ends_at;

    return NextResponse.json({
      active: active || Boolean(subscription && ['active', 'trialing', 'past_due'].includes(subscription.status)),
      status: subscription
        ? mapStripeSubscriptionStatus(subscription.status)
        : (billing.subscription_status ?? 'none'),
      planName: 'Daywinner',
      priceLabel: `${MONTHLY_PRICE_LABEL}/month`,
      endsAt,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    });
  } catch (error) {
    console.error('[billing/plan]', error);
    return NextResponse.json({ error: 'Could not load plan' }, { status: 500 });
  }
}

/** Cancel at period end — access continues until endsAt. */
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
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const subscription = await findCustomerSubscription(stripe, billing.stripe_customer_id);
    if (!subscription || !['active', 'trialing', 'past_due'].includes(subscription.status)) {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({
        ok: true,
        cancelAtPeriodEnd: true,
        endsAt: periodEndIso(subscription),
      });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    await upsertBillingForUser(createAdminSupabaseClient(), user.id, {
      subscription_status: mapStripeSubscriptionStatus(updated.status),
      subscription_ends_at: periodEndIso(updated),
    });

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: true,
      endsAt: periodEndIso(updated),
    });
  } catch (error) {
    console.error('[billing/plan] cancel', error);
    return NextResponse.json({ error: 'Could not cancel subscription' }, { status: 500 });
  }
}

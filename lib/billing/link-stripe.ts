import type Stripe from 'stripe';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { mapStripeSubscriptionStatus } from '@/lib/billing/subscription';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd =
    subscription.items.data[0]?.current_period_end ??
    (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

function isLinkableSubscription(subscription: Stripe.Subscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due';
}

/** Attach an existing Stripe subscription (matched by checkout email) to a Supabase user. */
export async function linkStripeCustomerToUser(userId: string, email: string): Promise<boolean> {
  const stripe = getStripeClient();
  const admin = createAdminSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  const customers = await stripe.customers.list({ email: normalizedEmail, limit: 100 });

  for (const customer of customers.data) {
    if (customer.deleted) continue;

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customer.id)
      .maybeSingle();

    if (existingProfile && existingProfile.id !== userId) continue;

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });

    const subscription = subscriptions.data.find(isLinkableSubscription);
    if (!subscription) continue;

    await stripe.customers.update(customer.id, {
      metadata: { supabase_user_id: userId },
    });

    await upsertBillingForUser(admin, userId, {
      stripe_customer_id: customer.id,
      subscription_status: mapStripeSubscriptionStatus(subscription.status),
      subscription_ends_at: subscriptionPeriodEnd(subscription),
    });

    return true;
  }

  return false;
}

import type Stripe from 'stripe';
import {
  customerHasCoursePurchase,
  grantCourseAccess,
} from '@/lib/billing/course';
import { checkoutSessionEmail } from '@/lib/billing/checkout-email';
import { isCheckoutSessionId } from '@/lib/billing/checkout-receipt';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { mapStripeSubscriptionStatus } from '@/lib/billing/subscription';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export type LinkReason =
  | 'linked'
  | 'no_subscription'
  | 'already_claimed'
  | 'not_found'
  | 'invalid_session'
  | 'email_mismatch';

export interface LinkResult {
  linked: boolean;
  reason: LinkReason;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd =
    subscription.items.data[0]?.current_period_end ??
    (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

function isLinkableSubscription(subscription: Stripe.Subscription): boolean {
  return (
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'past_due'
  );
}

async function attachSubscriptionToUser(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription
): Promise<LinkResult> {
  const stripe = getStripeClient();
  const admin = createAdminSupabaseClient();

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (existingProfile && existingProfile.id !== userId) {
    return { linked: false, reason: 'already_claimed' };
  }

  await stripe.customers.update(customerId, {
    metadata: { supabase_user_id: userId },
  });

  await upsertBillingForUser(admin, userId, {
    stripe_customer_id: customerId,
    subscription_status: mapStripeSubscriptionStatus(subscription.status),
    subscription_ends_at: subscriptionPeriodEnd(subscription),
  });

  if (await customerHasCoursePurchase(stripe, customerId)) {
    await grantCourseAccess(userId);
  }

  return { linked: true, reason: 'linked' };
}

async function findLinkableSubscription(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  return subscriptions.data.find(isLinkableSubscription) ?? null;
}

/**
 * Claim a pay-first Checkout session onto this user.
 * Requires the account email to match the Checkout customer email.
 */
export async function linkCheckoutSessionToUser(
  userId: string,
  sessionId: string,
  userEmail: string
): Promise<LinkResult> {
  if (!isCheckoutSessionId(sessionId)) {
    return { linked: false, reason: 'invalid_session' };
  }

  const normalizedUserEmail = userEmail.trim().toLowerCase();
  if (!normalizedUserEmail) {
    return { linked: false, reason: 'email_mismatch' };
  }

  const stripe = getStripeClient();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });
  } catch {
    return { linked: false, reason: 'not_found' };
  }

  const paid =
    session.payment_status === 'paid' ||
    session.payment_status === 'no_payment_required' ||
    session.status === 'complete';
  if (!paid) {
    return { linked: false, reason: 'invalid_session' };
  }

  const sessionEmail = checkoutSessionEmail(session);
  if (!sessionEmail || sessionEmail !== normalizedUserEmail) {
    return { linked: false, reason: 'email_mismatch' };
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && !session.customer.deleted
        ? session.customer.id
        : null;

  if (!customerId) {
    return { linked: false, reason: 'no_subscription' };
  }

  let subscription: Stripe.Subscription | null = null;
  if (typeof session.subscription === 'string') {
    try {
      subscription = await stripe.subscriptions.retrieve(session.subscription);
    } catch {
      subscription = null;
    }
  } else if (session.subscription && typeof session.subscription === 'object') {
    subscription = session.subscription as Stripe.Subscription;
  }

  if (!subscription || !isLinkableSubscription(subscription)) {
    subscription = await findLinkableSubscription(stripe, customerId);
  }

  if (!subscription) {
    return { linked: false, reason: 'no_subscription' };
  }

  return attachSubscriptionToUser(userId, customerId, subscription);
}

/** Attach an existing Stripe subscription (matched by checkout email) to a Supabase user. */
export async function linkStripeCustomerToUser(
  userId: string,
  email: string
): Promise<LinkResult> {
  const stripe = getStripeClient();
  const admin = createAdminSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { linked: false, reason: 'no_subscription' };
  }

  const customers = await stripe.customers.list({ email: normalizedEmail, limit: 100 });
  let sawClaimed = false;
  let sawCustomer = false;

  for (const customer of customers.data) {
    if (customer.deleted) continue;
    sawCustomer = true;

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customer.id)
      .maybeSingle();

    if (existingProfile && existingProfile.id !== userId) {
      sawClaimed = true;
      continue;
    }

    const subscription = await findLinkableSubscription(stripe, customer.id);
    if (!subscription) continue;

    return attachSubscriptionToUser(userId, customer.id, subscription);
  }

  if (sawClaimed) return { linked: false, reason: 'already_claimed' };
  if (!sawCustomer) return { linked: false, reason: 'not_found' };
  return { linked: false, reason: 'no_subscription' };
}

/**
 * Prefer session claim (pay-first receipt + email match), then email match
 * only for confirmed accounts (password / magic-link owners).
 */
export async function reconcileBillingForUser(
  userId: string,
  email: string,
  sessionId?: string | null,
  opts?: { emailConfirmed?: boolean }
): Promise<LinkResult> {
  if (isCheckoutSessionId(sessionId)) {
    const bySession = await linkCheckoutSessionToUser(userId, sessionId, email);
    if (bySession.linked || bySession.reason === 'already_claimed' || bySession.reason === 'email_mismatch') {
      return bySession;
    }
  }

  // Unverified signups must not attach someone else's Stripe customer by email alone.
  if (opts?.emailConfirmed === false) {
    return { linked: false, reason: 'not_found' };
  }

  return linkStripeCustomerToUser(userId, email);
}

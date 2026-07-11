export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface BillingProfile {
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
}

export function normalizeSubscriptionStatus(value: string | null | undefined): SubscriptionStatus {
  switch (value) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
      return value;
    default:
      return 'none';
  }
}

export function isActiveSubscription(billing: BillingProfile | null | undefined): boolean {
  if (!billing) return false;

  const status = normalizeSubscriptionStatus(billing.subscription_status);
  if (status === 'active' || status === 'trialing') return true;

  if (billing.subscription_ends_at) {
    return new Date(billing.subscription_ends_at).getTime() > Date.now();
  }

  return false;
}

export function mapStripeSubscriptionStatus(
  stripeStatus: string | null | undefined
): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
      return stripeStatus;
    default:
      return 'none';
  }
}

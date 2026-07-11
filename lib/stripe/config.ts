import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getAppOrigin } from '@/lib/app-origin';

export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

export function getStripePriceId(): string | undefined {
  return process.env.STRIPE_PRICE_ID?.trim() || undefined;
}

export function getStripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || undefined;
}

/** Paywall is on when Stripe + Supabase are configured and not explicitly disabled. */
export function isBillingEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DISABLE_PAYWALL !== 'false') return false;
  return !!(getStripeSecretKey() && isSupabaseConfigured());
}

export { getAppOrigin };

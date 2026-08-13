import { isResendConfigured, getResendFromEmail } from '@/lib/email/resend';
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

/** One-time $1 quickstart fee charged at checkout before the monthly trial ends. */
export function getStripeStarterPriceId(): string | undefined {
  return process.env.STRIPE_STARTER_PRICE_ID?.trim() || undefined;
}

export function getStripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || undefined;
}

/** True on the live Vercel production deployment (or NODE_ENV production fallback). */
export function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV === 'production') return true;
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') return false;
  return process.env.NODE_ENV === 'production';
}

function envFlagTrue(...names: string[]): boolean {
  return names.some(name => process.env[name]?.trim() === 'true');
}

function isPaywallExplicitlyDisabled(): boolean {
  const requested = envFlagTrue('DISABLE_PAYWALL', 'NEXT_PUBLIC_DISABLE_PAYWALL');
  if (requested && isProductionRuntime()) {
    console.error('[billing] DISABLE_PAYWALL ignored in production');
    return false;
  }
  return requested;
}

/** True when paywall is temporarily off for end-to-end testing. */
export function isPaywallDisabled(): boolean {
  return isPaywallExplicitlyDisabled();
}

/**
 * Fake purchase flow: subscribe → OTO → account, with no Stripe charges.
 * Enable with BILLING_DEMO_FLOW=true or NEXT_PUBLIC_BILLING_DEMO_FLOW=true.
 * Never active in production.
 */
export function isBillingDemoFlow(): boolean {
  const requested = envFlagTrue('BILLING_DEMO_FLOW', 'NEXT_PUBLIC_BILLING_DEMO_FLOW');
  if (requested && isProductionRuntime()) {
    console.error('[billing] BILLING_DEMO_FLOW ignored in production');
    return false;
  }
  return requested;
}

/** Paywall is on when Stripe + Supabase are configured and not explicitly disabled. */
export function isBillingEnabled(): boolean {
  if (isPaywallExplicitlyDisabled()) return false;
  return !!(getStripeSecretKey() && isSupabaseConfigured());
}

/** Safe diagnostics for /api/billing/health — no secret values. */
export function getBillingConfigChecks() {
  const stripeSecret = getStripeSecretKey() ?? '';
  const stripeKeyMode = stripeSecret.startsWith('sk_live')
    ? 'live'
    : stripeSecret.startsWith('sk_test')
      ? 'test'
      : stripeSecret
        ? 'unknown'
        : 'missing';

  const demoRequested = envFlagTrue('BILLING_DEMO_FLOW', 'NEXT_PUBLIC_BILLING_DEMO_FLOW');
  const paywallDisableRequested = envFlagTrue('DISABLE_PAYWALL', 'NEXT_PUBLIC_DISABLE_PAYWALL');

  return {
    productionRuntime: isProductionRuntime(),
    paywallDisabled: isPaywallDisabled(),
    paywallDisableRequested,
    demoFlow: isBillingDemoFlow(),
    demoFlowRequested: demoRequested,
    hasStripeSecret: !!stripeSecret,
    stripeKeyMode,
    hasMonthlyPriceId: !!getStripePriceId(),
    hasStarterPriceId: !!getStripeStarterPriceId(),
    appUrl: getAppOrigin(''),
    supabaseConfigured: isSupabaseConfigured(),
    billingEnabled: isBillingEnabled(),
    resendConfigured: isResendConfigured(),
    resendFrom: isResendConfigured() ? getResendFromEmail() : null,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
  };
}

export { getAppOrigin };

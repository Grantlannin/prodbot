/** Checkout session id is the pay-first entitlement receipt until claimed onto a user. */

export const CHECKOUT_SESSION_COOKIE = 'dw_checkout_session';
export const CHECKOUT_SESSION_STORAGE_KEY = 'dw_checkout_session';
/** Keep long enough to cover “paid, closed tab, came back days later.” */
export const CHECKOUT_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 14;

export function isCheckoutSessionId(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('cs_') && value.length > 3;
}

export function linkReasonMessage(reason: string | null | undefined): string {
  switch (reason) {
    case 'linked':
      return 'Subscription linked.';
    case 'already_claimed':
      return 'This purchase is already linked to another Daywinner account. Sign in with that email, or contact support.';
    case 'no_subscription':
      return 'No active subscription found for this checkout. Use the email from your Stripe receipt, or buy again.';
    case 'not_found':
      return 'Checkout session not found. Open the link from your payment confirmation, or try again.';
    case 'invalid_session':
      return 'That checkout session is invalid or incomplete.';
    default:
      return 'Could not link your purchase yet. Try again in a moment.';
  }
}

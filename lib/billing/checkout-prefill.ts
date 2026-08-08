import { cookies } from 'next/headers';
import { checkoutSessionEmail } from '@/lib/billing/checkout-email';
import {
  CHECKOUT_SESSION_COOKIE,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';
import { getStripeClient } from '@/lib/stripe/client';
import { isBillingEnabled } from '@/lib/stripe/config';

/**
 * Server-only: resolve checkout email for signup prefill.
 * Uses Stripe secret — never expose via a public API.
 */
export async function getCheckoutEmailForPrefill(
  sessionIdFromUrl?: string | null
): Promise<string | null> {
  if (!isBillingEnabled()) return null;

  let sessionId = sessionIdFromUrl?.trim() || '';
  if (!isCheckoutSessionId(sessionId)) {
    sessionId = cookies().get(CHECKOUT_SESSION_COOKIE)?.value?.trim() || '';
  }
  if (!isCheckoutSessionId(sessionId)) return null;

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    return checkoutSessionEmail(session);
  } catch (error) {
    console.error('[checkout-prefill]', error);
    return null;
  }
}

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { grantCourseAccess } from '@/lib/billing/course';
import { mapStripeSubscriptionStatus } from '@/lib/billing/subscription';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { getStripeWebhookSecret, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function syncSubscription(
  userId: string,
  subscription: Stripe.Subscription | null | undefined
): Promise<void> {
  const admin = createAdminSupabaseClient();

  if (!subscription) {
    await upsertBillingForUser(admin, userId, {
      subscription_status: 'none',
      subscription_ends_at: null,
    });
    return;
  }

  const periodEnd =
    subscription.items.data[0]?.current_period_end ??
    (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const endsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  await upsertBillingForUser(admin, userId, {
    subscription_status: mapStripeSubscriptionStatus(subscription.status),
    subscription_ends_at: endsAt,
  });
}

/**
 * Resolve Supabase user for a Stripe event.
 * Prefer DB lookup by customer id (cheap under webhook flood) before Stripe Customer retrieve.
 */
async function resolveUserId(
  stripe: Stripe,
  opts: {
    userId?: string | null;
    customerId?: string | null;
    subscription?: Stripe.Subscription | null;
  }
): Promise<string | null> {
  if (opts.userId) return opts.userId;

  const customerId =
    opts.customerId ??
    (typeof opts.subscription?.customer === 'string'
      ? opts.subscription.customer
      : opts.subscription?.customer?.id);

  if (!customerId) return null;

  const admin = createAdminSupabaseClient();
  const { data: byCustomer } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (byCustomer?.id) return byCustomer.id;

  // Pay-first checkouts often have no profile yet — avoid hard fail; signup claims session_id.
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return customer.metadata?.supabase_user_id ?? null;
  } catch (error) {
    console.error('[stripe/webhook] customer retrieve', customerId, error);
    return null;
  }
}

function isCourseCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return (
    session.mode === 'payment' &&
    (session.metadata?.oto === 'course' || session.metadata?.daywinner_course === '1')
  );
}

function isCoursePaymentIntent(pi: Stripe.PaymentIntent): boolean {
  return pi.metadata?.oto === 'course' || pi.metadata?.daywinner_course === '1';
}

export async function POST(req: Request) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
  }

  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 503 });
  }

  const stripe = getStripeClient();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe/webhook] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const userId = await resolveUserId(stripe, {
          userId: session.client_reference_id,
          customerId,
        });

        if (isCourseCheckoutSession(session)) {
          if (customerId) {
            await stripe.customers.update(customerId, {
              metadata: { daywinner_course: '1' },
            });
          }
          if (userId) await grantCourseAccess(userId);
          // No user yet (pay-first): signup / confirm will grant via reconcile.
          break;
        }

        // Pay-first: no account yet — ACK 200. Signup claims session_id for access.
        if (!userId) {
          console.info('[stripe/webhook] checkout without user (pay-first ok)', event.id);
          break;
        }

        const admin = createAdminSupabaseClient();
        if (customerId) {
          await upsertBillingForUser(admin, userId, {
            stripe_customer_id: customerId,
            subscription_status: 'active',
          });
        }

        if (typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(userId, subscription);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (!isCoursePaymentIntent(pi)) break;
        const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null;
        if (customerId) {
          await stripe.customers.update(customerId, {
            metadata: { daywinner_course: '1' },
          });
        }
        const userId = await resolveUserId(stripe, { customerId });
        if (userId) await grantCourseAccess(userId);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(stripe, { subscription });
        if (!userId) {
          // Not linked yet — do not 500 (Stripe would retry forever). Signup reconciles.
          console.info('[stripe/webhook] subscription event without user', event.id, event.type);
          break;
        }
        await syncSubscription(
          userId,
          event.type === 'customer.subscription.deleted' ? null : subscription
        );
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('[stripe/webhook]', event.id, event.type, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, id: event.id });
}

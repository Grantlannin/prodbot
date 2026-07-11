import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { mapStripeSubscriptionStatus } from '@/lib/billing/subscription';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { getStripeWebhookSecret, isBillingEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

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

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  const fromMetadata = customer.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  return data?.id ?? null;
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
        const userId = await resolveUserId(stripe, {
          userId: session.client_reference_id,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        });
        if (!userId) break;

        const admin = createAdminSupabaseClient();
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

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
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(stripe, { subscription });
        if (!userId) break;
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
    console.error('[stripe/webhook]', event.type, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

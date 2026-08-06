import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { COURSE_PRICE_CENTS, COURSE_PRODUCT_NAME } from '@/lib/billing/price';
import { DEMO_COURSE_COOKIE, isDemoCheckoutSessionId } from '@/lib/billing/demo';
import { isBillingDemoFlow, isBillingEnabled, getAppOrigin } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { resolveCoursePriceId } from '@/lib/stripe/resolve-price';

function paymentMethodId(value: string | Stripe.PaymentMethod | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

async function resolvePaymentMethodId(
  stripe: Stripe,
  customerId: string,
  subscriptionId: string | null
): Promise<string | null> {
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const fromSub = paymentMethodId(subscription.default_payment_method);
    if (fromSub) return fromSub;
  }

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted) {
    const fromCustomer = paymentMethodId(customer.invoice_settings?.default_payment_method);
    if (fromCustomer) return fromCustomer;
  }

  const cards = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return cards.data[0]?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!sessionId.startsWith('cs_')) {
      return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
    }

    if (isBillingDemoFlow() && isDemoCheckoutSessionId(sessionId)) {
      const res = NextResponse.json({ ok: true, demo: true });
      res.cookies.set(DEMO_COURSE_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60,
      });
      return res;
    }

    if (!isBillingEnabled()) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
    }

    const stripe = getStripeClient();
    const origin = getAppOrigin();

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.status !== 'complete') {
      return NextResponse.json({ error: 'Subscription checkout is not complete' }, { status: 400 });
    }

    const customerId =
      typeof checkoutSession.customer === 'string'
        ? checkoutSession.customer
        : checkoutSession.customer?.id;
    if (!customerId) {
      return NextResponse.json({ error: 'No customer on checkout session' }, { status: 400 });
    }

    // Idempotency: don't double-charge if they already bought the course from this session.
    const existing = await stripe.paymentIntents.list({ customer: customerId, limit: 20 });
    const alreadyPaid = existing.data.find(
      pi =>
        pi.status === 'succeeded' &&
        pi.metadata?.oto === 'course' &&
        pi.metadata?.checkout_session_id === sessionId
    );
    if (alreadyPaid) {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    const subscriptionId =
      typeof checkoutSession.subscription === 'string'
        ? checkoutSession.subscription
        : checkoutSession.subscription?.id ?? null;

    const pmId = await resolvePaymentMethodId(stripe, customerId, subscriptionId);
    if (!pmId) {
      // Fallback: hosted one-time checkout if we can't find a saved card.
      const coursePriceId = await resolveCoursePriceId(stripe);
      const fallback = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: coursePriceId, quantity: 1 }],
        success_url: `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}&course=1`,
        cancel_url: `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}`,
        metadata: { oto: 'course', checkout_session_id: sessionId },
      });
      if (!fallback.url) {
        return NextResponse.json({ error: 'Could not start course checkout' }, { status: 500 });
      }
      return NextResponse.json({ url: fallback.url });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: COURSE_PRICE_CENTS,
          currency: 'usd',
          customer: customerId,
          payment_method: pmId,
          off_session: true,
          confirm: true,
          description: COURSE_PRODUCT_NAME,
          metadata: {
            oto: 'course',
            checkout_session_id: sessionId,
          },
        },
        {
          idempotencyKey: `oto-course:${sessionId}`,
        }
      );

      if (paymentIntent.status === 'succeeded') {
        return NextResponse.json({ ok: true });
      }

      // Needs customer action (3DS) — fall back to Checkout.
      const coursePriceId = await resolveCoursePriceId(stripe);
      const fallback = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: coursePriceId, quantity: 1 }],
        success_url: `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}&course=1`,
        cancel_url: `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}`,
        metadata: { oto: 'course', checkout_session_id: sessionId },
      });
      if (!fallback.url) {
        return NextResponse.json({ error: 'Authentication required for this card' }, { status: 402 });
      }
      return NextResponse.json({ url: fallback.url });
    } catch (err) {
      const stripeErr = err as Stripe.errors.StripeError;
      if (
        stripeErr?.code === 'authentication_required' ||
        stripeErr?.rawType === 'card_error' ||
        stripeErr?.type === 'card_error'
      ) {
        const coursePriceId = await resolveCoursePriceId(stripe);
        const fallback = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer: customerId,
          line_items: [{ price: coursePriceId, quantity: 1 }],
          success_url: `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}&course=1`,
          cancel_url: `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}`,
          metadata: { oto: 'course', checkout_session_id: sessionId },
        });
        if (fallback.url) {
          return NextResponse.json({ url: fallback.url });
        }
      }
      throw err;
    }
  } catch (error) {
    console.error('[stripe/oto-course]', error);
    return NextResponse.json({ error: 'Could not complete course purchase' }, { status: 500 });
  }
}

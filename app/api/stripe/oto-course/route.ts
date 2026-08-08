import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { COURSE_PRICE_CENTS, COURSE_PRODUCT_NAME } from '@/lib/billing/price';
import { checkoutSessionEmail } from '@/lib/billing/checkout-email';
import {
  grantCourseAccess,
  markStripeCustomerCoursePurchased,
} from '@/lib/billing/course';
import { DEMO_COURSE_COOKIE, isDemoCheckoutSessionId } from '@/lib/billing/demo';
import { fetchBillingForUser } from '@/lib/billing/profile';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { isBillingDemoFlow, isBillingEnabled, getAppOrigin } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/client';
import { resolveCoursePriceId } from '@/lib/stripe/resolve-price';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

function coursePaidCookie(res: NextResponse) {
  res.cookies.set(DEMO_COURSE_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function grantIfLoggedIn(userId: string | undefined) {
  if (!userId) return;
  await grantCourseAccess(userId);
}

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    if (!rateLimitAllow(`oto-course:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Demo: fake purchase → grant course on account if logged in, else cookie for signup.
    if (isBillingDemoFlow() && (isDemoCheckoutSessionId(sessionId) || !sessionId)) {
      if (user) {
        await grantCourseAccess(user.id);
        return NextResponse.json({ ok: true, demo: true, courseAccess: true });
      }
      const res = NextResponse.json({ ok: true, demo: true });
      coursePaidCookie(res);
      return res;
    }

    if (!isBillingEnabled()) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
    }

    const stripe = getStripeClient();
    const origin = getAppOrigin();

    let customerId: string | null = null;
    let subscriptionId: string | null = null;
    let idempotencyKey: string;
    let sessionEmail: string | null = null;

    if (sessionId.startsWith('cs_')) {
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (checkoutSession.status !== 'complete') {
        return NextResponse.json({ error: 'Subscription checkout is not complete' }, { status: 400 });
      }
      sessionEmail = checkoutSessionEmail(checkoutSession);
      customerId =
        typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : checkoutSession.customer?.id ?? null;
      subscriptionId =
        typeof checkoutSession.subscription === 'string'
          ? checkoutSession.subscription
          : checkoutSession.subscription?.id ?? null;
      idempotencyKey = `oto-course:${sessionId}`;

      // Logged-in buyer must own this checkout (same email). Never charge A / grant B.
      if (user?.email) {
        const userEmail = user.email.trim().toLowerCase();
        if (!sessionEmail || sessionEmail !== userEmail) {
          return NextResponse.json(
            { error: 'Sign in with the same email you used at checkout to buy the course.' },
            { status: 403 }
          );
        }
      }
    } else if (user) {
      const billing = await fetchBillingForUser(supabase, user.id);
      customerId = billing?.stripe_customer_id ?? null;
      if (!customerId) {
        return NextResponse.json({ error: 'No Stripe customer on this account' }, { status: 400 });
      }
      if (billing?.course_access) {
        return NextResponse.json({ ok: true, alreadyPaid: true, courseAccess: true });
      }
      idempotencyKey = `oto-course:user:${user.id}`;
    } else {
      return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No customer on checkout session' }, { status: 400 });
    }

    const existing = await stripe.paymentIntents.list({ customer: customerId, limit: 20 });
    const alreadyPaid = existing.data.find(
      pi => pi.status === 'succeeded' && pi.metadata?.oto === 'course'
    );
    if (alreadyPaid) {
      await markStripeCustomerCoursePurchased(stripe, customerId);
      // Only grant DB access to the matching logged-in user; else cookie for later signup.
      if (user) {
        await grantIfLoggedIn(user.id);
      }
      const res = NextResponse.json({ ok: true, alreadyPaid: true, courseAccess: Boolean(user) });
      if (!user) coursePaidCookie(res);
      return res;
    }

    const successPath = user
      ? `${origin}/course?purchased=1`
      : `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}&course=1`;
    const cancelPath = user
      ? `${origin}/course`
      : `${origin}/subscribe/success?session_id=${encodeURIComponent(sessionId)}`;

    // Never off-session charge without a logged-in owner — prevents cs_ theft charging a card.
    const pmId = user ? await resolvePaymentMethodId(stripe, customerId, subscriptionId) : null;
    if (!pmId) {
      const coursePriceId = await resolveCoursePriceId(stripe);
      const fallback = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        client_reference_id: user?.id,
        line_items: [{ price: coursePriceId, quantity: 1 }],
        success_url: successPath,
        cancel_url: cancelPath,
        metadata: { oto: 'course', checkout_session_id: sessionId || user?.id || '' },
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
            checkout_session_id: sessionId || '',
            supabase_user_id: user?.id || '',
          },
        },
        { idempotencyKey }
      );

      if (paymentIntent.status === 'succeeded') {
        await markStripeCustomerCoursePurchased(stripe, customerId);
        if (user) {
          await grantIfLoggedIn(user.id);
        }
        const res = NextResponse.json({ ok: true, courseAccess: Boolean(user) });
        if (!user) coursePaidCookie(res);
        return res;
      }

      const coursePriceId = await resolveCoursePriceId(stripe);
      const fallback = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        client_reference_id: user?.id,
        line_items: [{ price: coursePriceId, quantity: 1 }],
        success_url: successPath,
        cancel_url: cancelPath,
        metadata: { oto: 'course', checkout_session_id: sessionId || user?.id || '' },
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
          client_reference_id: user?.id,
          line_items: [{ price: coursePriceId, quantity: 1 }],
          success_url: successPath,
          cancel_url: cancelPath,
          metadata: { oto: 'course', checkout_session_id: sessionId || user?.id || '' },
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

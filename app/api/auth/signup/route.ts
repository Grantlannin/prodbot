import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { canClaimCheckoutSession } from '@/lib/billing/checkout-claim';
import { checkoutSessionEmail } from '@/lib/billing/checkout-email';
import {
  CHECKOUT_SESSION_COOKIE,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';
import {
  DEMO_COURSE_COOKIE,
  DEMO_PAID_COOKIE,
  isDemoCheckoutSessionId,
} from '@/lib/billing/demo';
import { attachDemoEntitlements } from '@/lib/billing/demo-entitlements';
import { reconcileBillingForUser } from '@/lib/billing/link-stripe';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { getStripeClient } from '@/lib/stripe/client';
import { isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolveSessionId(bodySessionId: string | undefined): string | null {
  if (isCheckoutSessionId(bodySessionId)) return bodySessionId;
  const fromCookie = cookies().get(CHECKOUT_SESSION_COOKIE)?.value?.trim() || '';
  return isCheckoutSessionId(fromCookie) ? fromCookie : null;
}

async function assertSessionEmailMatches(sessionId: string, email: string): Promise<string | null> {
  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    const sessionEmail = checkoutSessionEmail(session);
    if (!sessionEmail) return 'Checkout is missing an email. Contact support.';
    if (sessionEmail !== email) {
      return 'Use the same email you paid with at checkout.';
    }
    return null;
  } catch {
    return 'Could not verify checkout session.';
  }
}

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    if (!rateLimitAllow(`signup:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many signup attempts. Try again shortly.' }, { status: 429 });
    }

    const body = (await req.json()) as {
      email?: string;
      password?: string;
      session_id?: string;
    };
    const email = body.email ? normalizeEmail(body.email) : '';
    const password = body.password ?? '';
    const sessionId = resolveSessionId(body.session_id?.trim());

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (sessionId && !(isBillingDemoFlow() && isDemoCheckoutSessionId(sessionId))) {
      const mismatch = await assertSessionEmailMatches(sessionId, email);
      if (mismatch) {
        return NextResponse.json({ error: mismatch }, { status: 400 });
      }
    }

    let admin: ReturnType<typeof createAdminSupabaseClient> | null = null;
    try {
      admin = createAdminSupabaseClient();
    } catch (configError) {
      if (!isBillingDemoFlow()) {
        console.error('[auth/signup] admin client', configError);
        return NextResponse.json(
          { error: 'Account create is not configured (missing service role key).' },
          { status: 503 }
        );
      }
    }

    // Auto-confirm + session claim only with Stripe-return claim cookie (or demo).
    const claimAuthorized =
      isBillingDemoFlow() || (Boolean(sessionId) && canClaimCheckoutSession(sessionId, false));

    let userId: string | null = null;
    if (admin) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: claimAuthorized,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        const alreadyExists =
          msg.includes('already') || msg.includes('registered') || msg.includes('exists');
        if (alreadyExists) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Sign in instead.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      userId = data.user.id;
    } else {
      const { createServerSupabaseClient } = await import('@/lib/supabase/server');
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        const alreadyExists =
          msg.includes('already') || msg.includes('registered') || msg.includes('exists');
        if (alreadyExists) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Sign in instead.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      userId = data.user?.id ?? null;
      if (!userId) {
        return NextResponse.json({ error: 'Could not create account.' }, { status: 400 });
      }
    }

    let link: { linked: boolean; reason: string } | null = null;
    if (isBillingDemoFlow()) {
      try {
        const cookieStore = cookies();
        const paid =
          cookieStore.get(DEMO_PAID_COOKIE)?.value === '1' || isDemoCheckoutSessionId(sessionId);
        const course = cookieStore.get(DEMO_COURSE_COOKIE)?.value === '1';
        if (paid) {
          await attachDemoEntitlements(userId, { course });
          link = { linked: true, reason: 'linked' };
        }
      } catch (demoError) {
        console.error('[auth/signup] demo billing', demoError);
        link = { linked: true, reason: 'linked' };
      }
    } else if (isBillingEnabled() && userId) {
      try {
        const claimSessionId = claimAuthorized ? sessionId : null;
        link = await reconcileBillingForUser(userId, email, claimSessionId, {
          emailConfirmed: claimAuthorized,
        });
        // Demo course cookie must never grant access outside demo mode.
      } catch (linkError) {
        console.error('[auth/signup] link stripe', linkError);
      }
    }

    return NextResponse.json({ ok: true, userId, link });
  } catch (error) {
    console.error('[auth/signup]', error);
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}

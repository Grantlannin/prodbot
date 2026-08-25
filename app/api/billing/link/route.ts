import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
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
import { isBillingDemoFlow, isBillingEnabled } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  if (!isBillingEnabled() && !isBillingDemoFlow()) {
    return NextResponse.json({ linked: false, reason: 'no_subscription' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    let sessionId = '';
    try {
      const body = (await req.json()) as { session_id?: string };
      sessionId = body.session_id?.trim() || '';
    } catch {
      /* empty / non-JSON body */
    }

    if (!isCheckoutSessionId(sessionId)) {
      const fromCookie = cookies().get(CHECKOUT_SESSION_COOKIE)?.value?.trim() || '';
      if (isCheckoutSessionId(fromCookie)) sessionId = fromCookie;
    }

    if (isBillingDemoFlow()) {
      const paid =
        cookies().get(DEMO_PAID_COOKIE)?.value === '1' || isDemoCheckoutSessionId(sessionId);
      const course = cookies().get(DEMO_COURSE_COOKIE)?.value === '1';
      if (paid) {
        try {
          await attachDemoEntitlements(user.id, { course });
        } catch (demoError) {
          console.error('[billing/link] demo', demoError);
        }
        return NextResponse.json({ linked: true, reason: 'linked' });
      }
    }

    const result = await reconcileBillingForUser(user.id, user.email, sessionId || null, {
      emailConfirmed: Boolean(user.email_confirmed_at),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[billing/link]', error);
    return NextResponse.json({ error: 'Could not link subscription' }, { status: 500 });
  }
}

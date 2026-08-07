import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  CHECKOUT_SESSION_COOKIE,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';
import { reconcileBillingForUser } from '@/lib/billing/link-stripe';
import { isBillingEnabled } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  if (!isBillingEnabled()) {
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

    const result = await reconcileBillingForUser(user.id, user.email, sessionId || null);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[billing/link]', error);
    return NextResponse.json({ error: 'Could not link subscription' }, { status: 500 });
  }
}

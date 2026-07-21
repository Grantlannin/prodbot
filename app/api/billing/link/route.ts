import { NextResponse } from 'next/server';
import { linkStripeCustomerToUser } from '@/lib/billing/link-stripe';
import { isBillingEnabled } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  if (!isBillingEnabled()) {
    return NextResponse.json({ linked: false });
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const linked = await linkStripeCustomerToUser(user.id, user.email);
    return NextResponse.json({ linked });
  } catch (error) {
    console.error('[billing/link]', error);
    return NextResponse.json({ error: 'Could not link subscription' }, { status: 500 });
  }
}

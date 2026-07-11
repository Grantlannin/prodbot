import { NextResponse } from 'next/server';
import { isActiveSubscription } from '@/lib/billing/subscription';
import { fetchBillingForUser } from '@/lib/billing/profile';
import { isBillingEnabled } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isBillingEnabled()) {
    return NextResponse.json({
      billingEnabled: false,
      active: true,
      status: 'none',
      endsAt: null,
    });
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const billing = await fetchBillingForUser(supabase, user.id);
    const active = isActiveSubscription(billing);

    return NextResponse.json({
      billingEnabled: true,
      active,
      status: billing?.subscription_status ?? 'none',
      endsAt: billing?.subscription_ends_at ?? null,
    });
  } catch (error) {
    console.error('[billing/status]', error);
    return NextResponse.json({ error: 'Could not load billing status' }, { status: 500 });
  }
}

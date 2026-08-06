import { NextResponse } from 'next/server';
import { hasCourseAccess, isActiveSubscription } from '@/lib/billing/subscription';
import { fetchBillingForUser } from '@/lib/billing/profile';
import { getBillingConfigChecks, isBillingEnabled } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = getBillingConfigChecks();

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!isBillingEnabled()) {
      let courseAccess = false;
      if (user) {
        const billing = await fetchBillingForUser(supabase, user.id);
        courseAccess = hasCourseAccess(billing);
      }
      return NextResponse.json({
        billingEnabled: false,
        active: true,
        courseAccess,
        status: 'none',
        endsAt: null,
        checks,
      });
    }

    if (!user) {
      return NextResponse.json({
        billingEnabled: true,
        active: false,
        courseAccess: false,
        status: 'none',
        endsAt: null,
        checks,
      });
    }

    const billing = await fetchBillingForUser(supabase, user.id);

    return NextResponse.json({
      billingEnabled: true,
      active: isActiveSubscription(billing),
      courseAccess: hasCourseAccess(billing),
      status: billing?.subscription_status ?? 'none',
      endsAt: billing?.subscription_ends_at ?? null,
      checks,
    });
  } catch (error) {
    console.error('[billing/status]', error);
    return NextResponse.json({ error: 'Could not load billing status' }, { status: 500 });
  }
}

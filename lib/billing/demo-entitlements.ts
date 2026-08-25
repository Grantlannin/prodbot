import { NextResponse } from 'next/server';
import { CHECKOUT_SESSION_MAX_AGE_SEC } from '@/lib/billing/checkout-receipt';
import { grantCourseAccess } from '@/lib/billing/course';
import { DEMO_PAID_COOKIE } from '@/lib/billing/demo';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CHECKOUT_SESSION_MAX_AGE_SEC,
  };
}

export function applyDemoPaidCookie(res: NextResponse): void {
  res.cookies.set(DEMO_PAID_COOKIE, '1', demoCookieOptions());
}

/** Mark this user as paid in demo mode (no Stripe). */
export async function attachDemoEntitlements(userId: string, opts?: { course?: boolean }): Promise<void> {
  await upsertBillingForUser(createAdminSupabaseClient(), userId, {
    stripe_customer_id: `cus_demo_${userId.slice(0, 8)}`,
    subscription_status: 'active',
    subscription_ends_at: null,
  });
  if (opts?.course) {
    await grantCourseAccess(userId);
  }
}

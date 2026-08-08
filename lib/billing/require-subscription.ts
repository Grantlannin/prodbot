import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { isActiveSubscription } from '@/lib/billing/subscription';
import { fetchBillingForUser } from '@/lib/billing/profile';
import { isBillingEnabled } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Always requires a signed-in user.
 * When billing/paywall is enabled, also requires an active subscription.
 */
export async function requireActiveSubscription(): Promise<{
  user: User | null;
  denied: NextResponse | null;
}> {
  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch {
    return {
      user: null,
      denied: NextResponse.json({ error: 'Auth not configured' }, { status: 503 }),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      denied: NextResponse.json({ error: 'Sign in required' }, { status: 401 }),
    };
  }

  if (!isBillingEnabled()) {
    return { user, denied: null };
  }

  const billing = await fetchBillingForUser(supabase, user.id);
  if (!isActiveSubscription(billing)) {
    return {
      user,
      denied: NextResponse.json({ error: 'Subscription required' }, { status: 402 }),
    };
  }

  return { user, denied: null };
}

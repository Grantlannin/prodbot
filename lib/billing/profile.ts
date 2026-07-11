import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type BillingProfile,
  normalizeSubscriptionStatus,
} from '@/lib/billing/subscription';

export interface ProfileBillingRow extends BillingProfile {
  id: string;
  display_name?: string;
}

export function parseBillingRow(row: Record<string, unknown> | null): BillingProfile | null {
  if (!row) return null;
  return {
    stripe_customer_id: typeof row.stripe_customer_id === 'string' ? row.stripe_customer_id : null,
    subscription_status: normalizeSubscriptionStatus(
      typeof row.subscription_status === 'string' ? row.subscription_status : undefined
    ),
    subscription_ends_at:
      typeof row.subscription_ends_at === 'string' ? row.subscription_ends_at : null,
  };
}

export async function fetchBillingForUser(
  client: SupabaseClient,
  userId: string
): Promise<BillingProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('stripe_customer_id, subscription_status, subscription_ends_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) return null;
  return parseBillingRow(data);
}

export async function upsertBillingForUser(
  client: SupabaseClient,
  userId: string,
  patch: Partial<BillingProfile> & { display_name?: string }
): Promise<void> {
  await client.from('profiles').upsert({
    id: userId,
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

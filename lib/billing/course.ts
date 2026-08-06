import type Stripe from 'stripe';
import { upsertBillingForUser } from '@/lib/billing/profile';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function grantCourseAccess(userId: string): Promise<void> {
  await upsertBillingForUser(createAdminSupabaseClient(), userId, {
    course_access: true,
    course_purchased_at: new Date().toISOString(),
  });
}

export async function customerHasCoursePurchase(
  stripe: Stripe,
  customerId: string
): Promise<boolean> {
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && customer.metadata?.daywinner_course === '1') {
    return true;
  }

  const intents = await stripe.paymentIntents.list({ customer: customerId, limit: 30 });
  return intents.data.some(
    pi => pi.status === 'succeeded' && pi.metadata?.oto === 'course'
  );
}

export async function markStripeCustomerCoursePurchased(
  stripe: Stripe,
  customerId: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    metadata: { daywinner_course: '1' },
  });
}

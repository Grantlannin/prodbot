import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getBillingConfigChecks } from '@/lib/stripe/config';

export interface OpsDayCount {
  date: string;
  signups: number;
}

export interface OpsMetrics {
  generatedAt: string;
  totals: {
    profiles: number;
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    none: number;
    withStripeCustomer: number;
    courseAccess: number;
    /** Active/trialing with a future subscription_ends_at (likely cancel-at-period-end). */
    endingSoon: number;
  };
  windows: {
    signupsToday: number;
    signups7d: number;
    signups30d: number;
  };
  signupsByDay: OpsDayCount[];
  emailOutbox: {
    pending: number;
    sending: number;
    sent: number;
    failed: number;
  };
  infra: ReturnType<typeof getBillingConfigChecks> & {
    adminAllowlistConfigured: boolean;
    notes: string[];
  };
}

async function countProfiles(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  filter?: { column: string; value: string | boolean | null; op?: 'eq' | 'not' }
): Promise<number> {
  let q = admin.from('profiles').select('id', { count: 'exact', head: true });
  if (filter) {
    if (filter.op === 'not') {
      q = q.not(filter.column, 'is', filter.value);
    } else if (filter.value === null) {
      q = q.is(filter.column, null);
    } else {
      q = q.eq(filter.column, filter.value);
    }
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function countOutbox(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  status: string
): Promise<number> {
  const { count, error } = await admin
    .from('email_outbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  if (error) {
    // Table missing until migrations run
    console.error('[ops/metrics] outbox', error.message);
    return 0;
  }
  return count ?? 0;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getOpsMetrics(): Promise<OpsMetrics> {
  const admin = createAdminSupabaseClient();
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const d7 = new Date(todayStart);
  d7.setUTCDate(d7.getUTCDate() - 6);
  const d30 = new Date(todayStart);
  d30.setUTCDate(d30.getUTCDate() - 29);

  const [
    profiles,
    active,
    trialing,
    pastDue,
    canceled,
    none,
    withStripeCustomer,
    courseAccess,
    pending,
    sending,
    sent,
    failed,
  ] = await Promise.all([
    countProfiles(admin),
    countProfiles(admin, { column: 'subscription_status', value: 'active' }),
    countProfiles(admin, { column: 'subscription_status', value: 'trialing' }),
    countProfiles(admin, { column: 'subscription_status', value: 'past_due' }),
    countProfiles(admin, { column: 'subscription_status', value: 'canceled' }),
    countProfiles(admin, { column: 'subscription_status', value: 'none' }),
    countProfiles(admin, { column: 'stripe_customer_id', value: null, op: 'not' }),
    countProfiles(admin, { column: 'course_access', value: true }),
    countOutbox(admin, 'pending'),
    countOutbox(admin, 'sending'),
    countOutbox(admin, 'sent'),
    countOutbox(admin, 'failed'),
  ]);

  const { count: endingSoon, error: endingErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('subscription_status', ['active', 'trialing', 'past_due'])
    .not('subscription_ends_at', 'is', null)
    .gt('subscription_ends_at', now.toISOString());
  if (endingErr) throw endingErr;

  const { data: recentRows, error: recentErr } = await admin
    .from('profiles')
    .select('created_at')
    .gte('created_at', d30.toISOString())
    .order('created_at', { ascending: true });
  if (recentErr) throw recentErr;

  const byDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const day = new Date(d30);
    day.setUTCDate(d30.getUTCDate() + i);
    byDay.set(isoDay(day), 0);
  }
  let signupsToday = 0;
  let signups7d = 0;
  let signups30d = 0;
  for (const row of recentRows ?? []) {
    const created = new Date(row.created_at);
    const key = isoDay(created);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    signups30d += 1;
    if (created >= d7) signups7d += 1;
    if (created >= todayStart) signupsToday += 1;
  }

  const checks = getBillingConfigChecks();
  const notes: string[] = [
    'Resend / Supabase / Vercel plan quotas live in their billing dashboards (linked on /ops).',
    '“Ending soon” ≈ active subs with a future subscription_ends_at (cancel-at-period-end).',
  ];
  if (!checks.resendConfigured) notes.push('RESEND_API_KEY missing on this deployment.');
  if (!checks.cronSecretConfigured) notes.push('CRON_SECRET missing — outbox cron will not run.');

  return {
    generatedAt: now.toISOString(),
    totals: {
      profiles,
      active,
      trialing,
      pastDue,
      canceled,
      none,
      withStripeCustomer,
      courseAccess,
      endingSoon: endingSoon ?? 0,
    },
    windows: { signupsToday, signups7d, signups30d },
    signupsByDay: [...byDay.entries()].map(([date, signups]) => ({ date, signups })),
    emailOutbox: { pending, sending, sent, failed },
    infra: {
      ...checks,
      adminAllowlistConfigured: Boolean(process.env.ADMIN_EMAILS?.trim()),
      notes,
    },
  };
}

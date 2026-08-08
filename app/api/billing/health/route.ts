import { NextResponse } from 'next/server';
import { isOpsAdminEmail } from '@/lib/ops/admin';
import { getBillingConfigChecks } from '@/lib/stripe/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Ops-only billing config probe — no secrets. */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email || !isOpsAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(getBillingConfigChecks());
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

import { NextResponse } from 'next/server';
import { isOpsAdminEmail } from '@/lib/ops/admin';
import { getOpsMetrics } from '@/lib/ops/metrics';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    if (!isOpsAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const metrics = await getOpsMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[ops/metrics]', error);
    return NextResponse.json({ error: 'Could not load ops metrics' }, { status: 500 });
  }
}

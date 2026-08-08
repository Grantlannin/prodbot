import { NextResponse } from 'next/server';
import { isOpsAdminEmail } from '@/lib/ops/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  return NextResponse.json({ admin: isOpsAdminEmail(user.email), email: user.email });
}

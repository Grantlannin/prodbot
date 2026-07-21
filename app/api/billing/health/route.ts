import { NextResponse } from 'next/server';
import { getBillingConfigChecks } from '@/lib/stripe/config';

export const dynamic = 'force-dynamic';

/** Safe billing config probe — no secrets. Use after changing Vercel env vars + redeploying. */
export async function GET() {
  return NextResponse.json(getBillingConfigChecks());
}

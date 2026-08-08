import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Removed: returning checkout email by session_id was an unauthenticated PII leak.
 * Prefill is done server-side on /login via getCheckoutEmailForPrefill.
 */
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

import { NextResponse } from 'next/server';
import { clearCheckoutClaimCookies } from '@/lib/billing/checkout-claim';
import { DEMO_COURSE_COOKIE, DEMO_PAID_COOKIE } from '@/lib/billing/demo';

/** Drop leftover checkout claim cookies so a tester can sign in with a different account. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearCheckoutClaimCookies(res);
  res.cookies.set(DEMO_PAID_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookies.set(DEMO_COURSE_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

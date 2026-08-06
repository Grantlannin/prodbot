import { NextResponse } from 'next/server';
import { DEMO_PAID_COOKIE, isDemoCheckoutSessionId } from '@/lib/billing/demo';
import { isBillingDemoFlow } from '@/lib/stripe/config';

/** Marks the browser as having completed the demo subscription checkout. */
export async function POST(request: Request) {
  if (!isBillingDemoFlow()) {
    return NextResponse.json({ error: 'Demo flow is off' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!isDemoCheckoutSessionId(sessionId)) {
      return NextResponse.json({ error: 'Invalid demo session' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(DEMO_PAID_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60,
    });
    return res;
  } catch (error) {
    console.error('[billing/demo/arm]', error);
    return NextResponse.json({ error: 'Could not arm demo checkout' }, { status: 500 });
  }
}

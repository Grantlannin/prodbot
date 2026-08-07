import { NextResponse } from 'next/server';
import { flushEmailOutbox } from '@/lib/email/continue-desktop';
import { isResendConfigured } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Vercel cron: drain transactional email outbox. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'resend_not_configured' });
  }

  try {
    const result = await flushEmailOutbox(50);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/email-outbox]', error);
    return NextResponse.json({ error: 'Outbox flush failed' }, { status: 500 });
  }
}

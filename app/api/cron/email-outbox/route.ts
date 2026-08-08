import { NextResponse } from 'next/server';
import { flushEmailOutbox } from '@/lib/email/continue-desktop';
import { isResendConfigured } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FLUSH_PER_ROUND = 500;
const MAX_ROUNDS = 8;
/** Leave headroom before Vercel kills the function. */
const TIME_BUDGET_MS = 50_000;

/** Vercel cron: drain transactional email outbox in Resend batches. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'resend_not_configured' });
  }

  const started = Date.now();
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let requeuedStale = 0;
  let rounds = 0;

  try {
    while (rounds < MAX_ROUNDS && Date.now() - started < TIME_BUDGET_MS) {
      const result = await flushEmailOutbox(FLUSH_PER_ROUND);
      rounds += 1;
      processed += result.processed;
      sent += result.sent;
      failed += result.failed;
      requeuedStale += result.requeuedStale;
      if (result.processed === 0) break;
    }

    return NextResponse.json({
      ok: true,
      rounds,
      processed,
      sent,
      failed,
      requeuedStale,
      elapsedMs: Date.now() - started,
    });
  } catch (error) {
    console.error('[cron/email-outbox]', error);
    return NextResponse.json({ error: 'Outbox flush failed' }, { status: 500 });
  }
}

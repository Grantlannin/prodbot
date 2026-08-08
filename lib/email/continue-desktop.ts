import { getAppOrigin } from '@/lib/app-origin';
import { INTRO_CHROME_RESUME_PATH } from '@/lib/intro';
import { sendBatchWithRetry, sendEmailWithRetry } from '@/lib/email/resend';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const MAX_SEND_ATTEMPTS_BEFORE_FAIL = 8;
const BATCH_SIZE = 100;
/** Rows claimed per cron tick (multiple Resend batch calls). */
const DEFAULT_FLUSH_LIMIT = 500;
const STALE_SENDING_MS = 5 * 60 * 1000;

export function buildContinueConfirmUrl(hashedToken: string): string {
  const origin = getAppOrigin('https://www.daywinner.bot');
  const next = encodeURIComponent(INTRO_CHROME_RESUME_PATH);
  return `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink&next=${next}`;
}

export function buildContinueDesktopEmailHtml(opts: {
  confirmUrl: string;
  loginFallbackUrl: string;
}): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#0f172a;">
    <h2 style="margin:0 0 12px;font-size:20px;">Continue Daywinner on your computer</h2>
    <p style="margin:0 0 16px;color:#475569;">
      Open this on your <strong>laptop or desktop</strong> (not your phone) to finish Chrome + extension setup.
    </p>
    <p style="margin:0 0 20px;">
      <a href="${opts.confirmUrl}"
         style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
        Continue on your computer
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
      Button not working? Paste this link into Chrome on your computer:
    </p>
    <p style="margin:0 0 16px;font-size:12px;word-break:break-all;color:#334155;">
      ${opts.confirmUrl}
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Or sign in with your password:
      <a href="${opts.loginFallbackUrl}" style="color:#334155;">${opts.loginFallbackUrl}</a>
    </p>
  </div>`;
}

export async function enqueueOutboxEmail(input: {
  to: string;
  subject: string;
  html: string;
  lastError?: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from('email_outbox').insert({
    to_email: input.to,
    subject: input.subject,
    html: input.html,
    status: 'pending',
    attempts: 0,
    last_error: input.lastError ?? null,
  });
  if (error) throw error;
}

/** Generate a cross-device magic link and email it via Resend (with outbox fallback). */
export async function sendContinueDesktopEmail(email: string): Promise<{
  sent: boolean;
  queued: boolean;
  error?: string;
}> {
  const admin = createAdminSupabaseClient();
  const origin = getAppOrigin('https://www.daywinner.bot');
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(INTRO_CHROME_RESUME_PATH)}`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.hashed_token) {
    return {
      sent: false,
      queued: false,
      error: error?.message || 'Could not create continue link',
    };
  }

  const confirmUrl = buildContinueConfirmUrl(data.properties.hashed_token);
  const loginFallbackUrl = `${origin}/login?next=${encodeURIComponent(INTRO_CHROME_RESUME_PATH)}`;
  const subject = 'Continue Daywinner on your computer';
  const html = buildContinueDesktopEmailHtml({ confirmUrl, loginFallbackUrl });

  // Few attempts then queue — under spike, fail fast into outbox/batch drain.
  const result = await sendEmailWithRetry({ to: email, subject, html }, { maxAttempts: 2 });
  if (result.ok) {
    return { sent: true, queued: false };
  }

  try {
    await enqueueOutboxEmail({
      to: email,
      subject,
      html,
      lastError: result.error,
    });
    return {
      sent: false,
      queued: true,
      error: result.error,
    };
  } catch (outboxError) {
    console.error('[continue-desktop] outbox', outboxError);
    return {
      sent: false,
      queued: false,
      error: result.error || 'Could not send or queue email',
    };
  }
}

async function requeueStaleSending(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_SENDING_MS).toISOString();
  const { data, error } = await admin
    .from('email_outbox')
    .update({
      status: 'pending',
      last_error: 'requeued after stale sending claim',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'sending')
    .lt('updated_at', cutoff)
    .select('id');

  if (error) {
    console.error('[email-outbox] requeue stale', error);
    return 0;
  }
  return data?.length ?? 0;
}

async function claimPendingRows(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  limit: number
): Promise<
  Array<{ id: string; to_email: string; subject: string; html: string; attempts: number | null }>
> {
  const { data: candidates, error } = await admin
    .from('email_outbox')
    .select('id, to_email, subject, html, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!candidates?.length) return [];

  const ids = candidates.map(r => r.id);
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from('email_outbox')
    .update({ status: 'sending', updated_at: now })
    .in('id', ids)
    .eq('status', 'pending')
    .select('id, to_email, subject, html, attempts');

  if (claimError) throw claimError;
  return claimed ?? [];
}

/** Drain pending outbox via Resend batch API (up to 100 emails per request). */
export async function flushEmailOutbox(
  limit = DEFAULT_FLUSH_LIMIT
): Promise<{ processed: number; sent: number; failed: number; requeuedStale: number }> {
  const admin = createAdminSupabaseClient();
  const requeuedStale = await requeueStaleSending(admin);
  const rows = await claimPendingRows(admin, limit);

  if (!rows.length) {
    return { processed: 0, sent: 0, failed: 0, requeuedStale };
  }

  let sent = 0;
  let failed = 0;
  const now = () => new Date().toISOString();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = await sendBatchWithRetry(
      chunk.map(row => ({
        key: row.id,
        to: row.to_email,
        subject: row.subject,
        html: row.html,
      })),
      { maxAttempts: 3 }
    );

    for (const item of batch.items) {
      const row = chunk.find(r => r.id === item.key);
      if (!row) continue;
      const attempts = (row.attempts ?? 0) + 1;

      if (item.ok) {
        sent += 1;
        await admin
          .from('email_outbox')
          .update({
            status: 'sent',
            attempts,
            sent_at: now(),
            last_error: null,
            updated_at: now(),
          })
          .eq('id', row.id);
        continue;
      }

      if (attempts >= MAX_SEND_ATTEMPTS_BEFORE_FAIL) {
        failed += 1;
        await admin
          .from('email_outbox')
          .update({
            status: 'failed',
            attempts,
            last_error: item.error ?? batch.error ?? 'failed',
            updated_at: now(),
          })
          .eq('id', row.id);
      } else {
        await admin
          .from('email_outbox')
          .update({
            status: 'pending',
            attempts,
            last_error: item.error ?? batch.error ?? 'retry',
            updated_at: now(),
          })
          .eq('id', row.id);
      }
    }
  }

  return { processed: rows.length, sent, failed, requeuedStale };
}

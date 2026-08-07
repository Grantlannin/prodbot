import { getAppOrigin } from '@/lib/app-origin';
import { INTRO_CHROME_RESUME_PATH } from '@/lib/intro';
import { sendEmailWithRetry } from '@/lib/email/resend';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

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
  await admin.from('email_outbox').insert({
    to_email: input.to,
    subject: input.subject,
    html: input.html,
    status: 'pending',
    attempts: 0,
    last_error: input.lastError ?? null,
  });
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

  const result = await sendEmailWithRetry({ to: email, subject, html });
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

export async function flushEmailOutbox(limit = 40): Promise<{ processed: number; sent: number; failed: number }> {
  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from('email_outbox')
    .select('id, to_email, subject, html, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!rows?.length) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const result = await sendEmailWithRetry(
      { to: row.to_email, subject: row.subject, html: row.html },
      { maxAttempts: 3 }
    );
    const attempts = (row.attempts ?? 0) + 1;

    if (result.ok) {
      sent += 1;
      await admin
        .from('email_outbox')
        .update({
          status: 'sent',
          attempts,
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    } else if (attempts >= 8) {
      failed += 1;
      await admin
        .from('email_outbox')
        .update({
          status: 'failed',
          attempts,
          last_error: result.error ?? 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    } else {
      await admin
        .from('email_outbox')
        .update({
          attempts,
          last_error: result.error ?? 'retry',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
    }
  }

  return { processed: rows.length, sent, failed };
}

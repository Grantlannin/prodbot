import { Resend } from 'resend';

export function getResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

export function getResendFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Daywinner <onboarding@daywinner.bot>'
  );
}

export function isResendConfigured(): boolean {
  return Boolean(getResendApiKey());
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  statusCode?: number;
}

/** Send via Resend with backoff on 429 / transient failures. */
export async function sendEmailWithRetry(
  input: SendEmailInput,
  opts?: { maxAttempts?: number }
): Promise<SendEmailResult> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured' };
  }

  const resend = new Resend(apiKey);
  const maxAttempts = opts?.maxAttempts ?? 5;
  let lastError = 'Unknown email error';
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: getResendFromEmail(),
        to: input.to,
        subject: input.subject,
        html: input.html,
      });

      if (!error && data?.id) {
        return { ok: true, id: data.id };
      }

      lastError = error?.message || 'Resend send failed';
      // Resend SDK errors sometimes include statusCode
      lastStatus = (error as { statusCode?: number } | null)?.statusCode;

      const retryable =
        lastStatus === 429 ||
        lastStatus === 500 ||
        lastStatus === 502 ||
        lastStatus === 503 ||
        /rate limit/i.test(lastError);

      if (!retryable || attempt === maxAttempts) {
        return { ok: false, error: lastError, statusCode: lastStatus };
      }

      const backoffMs = Math.min(8000, 400 * 2 ** (attempt - 1));
      await sleep(backoffMs);
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Resend send failed';
      if (attempt === maxAttempts) {
        return { ok: false, error: lastError };
      }
      await sleep(Math.min(8000, 400 * 2 ** (attempt - 1)));
    }
  }

  return { ok: false, error: lastError, statusCode: lastStatus };
}

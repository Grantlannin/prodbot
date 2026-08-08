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

function isRetryableError(message: string, statusCode?: number): boolean {
  return (
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    /rate limit/i.test(message)
  );
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

export interface BatchEmailItem extends SendEmailInput {
  /** Caller-defined id (e.g. outbox row id) for correlating results. */
  key: string;
}

export interface BatchSendResult {
  /** Whole batch request failed (e.g. 429) — caller should requeue all. */
  ok: boolean;
  error?: string;
  statusCode?: number;
  /** Per-item outcomes when the batch API accepted the request. */
  items: Array<{ key: string; ok: boolean; id?: string; error?: string }>;
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
      lastStatus = (error as { statusCode?: number } | null)?.statusCode;

      if (!isRetryableError(lastError, lastStatus) || attempt === maxAttempts) {
        return { ok: false, error: lastError, statusCode: lastStatus };
      }

      await sleep(Math.min(8000, 400 * 2 ** (attempt - 1)));
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

/**
 * Send up to 100 emails in one Resend request (counts as 1 against rate limit).
 * On 429/5xx, retries the whole batch with backoff.
 */
export async function sendBatchWithRetry(
  items: BatchEmailItem[],
  opts?: { maxAttempts?: number }
): Promise<BatchSendResult> {
  if (!items.length) {
    return { ok: true, items: [] };
  }
  if (items.length > 100) {
    return {
      ok: false,
      error: 'Batch size exceeds Resend limit of 100',
      items: items.map(i => ({ key: i.key, ok: false, error: 'batch too large' })),
    };
  }

  const apiKey = getResendApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: 'RESEND_API_KEY is not configured',
      items: items.map(i => ({ key: i.key, ok: false, error: 'not configured' })),
    };
  }

  const resend = new Resend(apiKey);
  const from = getResendFromEmail();
  const maxAttempts = opts?.maxAttempts ?? 4;
  let lastError = 'Unknown batch email error';
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await resend.batch.send(
        items.map(item => ({
          from,
          to: [item.to],
          subject: item.subject,
          html: item.html,
        }))
      );

      if (error) {
        lastError = error.message || 'Resend batch failed';
        lastStatus = (error as { statusCode?: number } | null)?.statusCode;
        if (!isRetryableError(lastError, lastStatus) || attempt === maxAttempts) {
          return {
            ok: false,
            error: lastError,
            statusCode: lastStatus,
            items: items.map(i => ({ key: i.key, ok: false, error: lastError })),
          };
        }
        await sleep(Math.min(8000, 400 * 2 ** (attempt - 1)));
        continue;
      }

      const rows = data?.data ?? [];
      return {
        ok: true,
        items: items.map((item, index) => {
          const id = rows[index]?.id;
          if (id) return { key: item.key, ok: true, id };
          return {
            key: item.key,
            ok: false,
            error: 'Missing id in batch response',
          };
        }),
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Resend batch failed';
      if (attempt === maxAttempts) {
        return {
          ok: false,
          error: lastError,
          items: items.map(i => ({ key: i.key, ok: false, error: lastError })),
        };
      }
      await sleep(Math.min(8000, 400 * 2 ** (attempt - 1)));
    }
  }

  return {
    ok: false,
    error: lastError,
    statusCode: lastStatus,
    items: items.map(i => ({ key: i.key, ok: false, error: lastError })),
  };
}

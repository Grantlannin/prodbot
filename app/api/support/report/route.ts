import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUPPORT_EMAIL } from '@/lib/site';
import { isResendConfigured, sendEmailWithRetry } from '@/lib/email/resend';

export const runtime = 'nodejs';

const MAX_MESSAGE = 4000;
const MAX_SUBJECT = 120;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Support email is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const messageRaw =
    typeof body === 'object' && body && 'message' in body ? String((body as { message?: unknown }).message ?? '') : '';
  const subjectRaw =
    typeof body === 'object' && body && 'subject' in body ? String((body as { subject?: unknown }).subject ?? '') : '';

  const message = messageRaw.trim().slice(0, MAX_MESSAGE);
  const subjectLine = (subjectRaw.trim() || 'App issue').slice(0, MAX_SUBJECT);

  if (message.length < 10) {
    return NextResponse.json({ error: 'Please describe the issue (at least a sentence).' }, { status: 400 });
  }

  let fromUser = 'signed-out user';
  let userId = 'n/a';
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    fromUser = user?.email?.trim() || fromUser;
    userId = user?.id || userId;
  } catch {
    /* allow reports without auth configured */
  }
  const ua = req.headers.get('user-agent')?.slice(0, 300) || 'unknown';

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
      <p><strong>Daywinner in-app issue report</strong></p>
      <p><strong>From:</strong> ${escapeHtml(fromUser)}<br/>
      <strong>User id:</strong> ${escapeHtml(userId)}<br/>
      <strong>Subject:</strong> ${escapeHtml(subjectLine)}</p>
      <p style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc">${escapeHtml(message)}</p>
      <p style="color:#64748b;font-size:12px"><strong>User-Agent:</strong> ${escapeHtml(ua)}</p>
    </div>
  `;

  const result = await sendEmailWithRetry(
    {
      to: SUPPORT_EMAIL,
      subject: `[Daywinner issue] ${subjectLine}`,
      html,
    },
    { maxAttempts: 2 }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not send report.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

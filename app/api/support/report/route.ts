import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUPPORT_EMAIL } from '@/lib/site';
import { isResendConfigured, sendEmailWithRetry } from '@/lib/email/resend';

export const runtime = 'nodejs';

const MAX_MESSAGE = 4000;
const MAX_SUBJECT = 120;
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extForType(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export async function POST(req: Request) {
  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Support email is not configured.' }, { status: 503 });
  }

  let messageRaw = '';
  let subjectRaw = '';
  let screenshot: File | null = null;

  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      messageRaw = String(form.get('message') ?? '');
      subjectRaw = String(form.get('subject') ?? '');
      const file = form.get('screenshot');
      if (file instanceof File && file.size > 0) screenshot = file;
    } else {
      const body = (await req.json()) as { message?: unknown; subject?: unknown };
      messageRaw = String(body.message ?? '');
      subjectRaw = String(body.subject ?? '');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const message = messageRaw.trim().slice(0, MAX_MESSAGE);
  const subjectLine = (subjectRaw.trim() || 'App issue').slice(0, MAX_SUBJECT);

  if (message.length < 10) {
    return NextResponse.json({ error: 'Please describe the issue (at least a sentence).' }, { status: 400 });
  }

  if (screenshot) {
    if (!ALLOWED_TYPES.has(screenshot.type)) {
      return NextResponse.json({ error: 'Screenshot must be a PNG, JPG, WEBP, or GIF.' }, { status: 400 });
    }
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ error: 'Screenshot must be under 4MB.' }, { status: 400 });
    }
  }

  let fromUser = 'signed-out user';
  let userId = 'n/a';
  let replyTo: string | undefined;
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    fromUser = user?.email?.trim() || fromUser;
    userId = user?.id || userId;
    if (user?.email?.trim()) replyTo = user.email.trim();
  } catch {
    /* allow reports without auth configured */
  }
  const ua = req.headers.get('user-agent')?.slice(0, 300) || 'unknown';

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
      <p><strong>Daywinner in-app issue report</strong></p>
      <p><strong>From:</strong> ${escapeHtml(fromUser)}<br/>
      <strong>User id:</strong> ${escapeHtml(userId)}<br/>
      <strong>Subject:</strong> ${escapeHtml(subjectLine)}<br/>
      <strong>Screenshot:</strong> ${screenshot ? 'attached' : 'none'}</p>
      <p style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc">${escapeHtml(message)}</p>
      <p style="color:#64748b;font-size:12px"><strong>User-Agent:</strong> ${escapeHtml(ua)}</p>
    </div>
  `;

  const attachments = screenshot
    ? [
        {
          filename: `screenshot.${extForType(screenshot.type)}`,
          content: Buffer.from(await screenshot.arrayBuffer()),
          contentType: screenshot.type,
        },
      ]
    : undefined;

  const result = await sendEmailWithRetry(
    {
      to: SUPPORT_EMAIL,
      subject: `[Daywinner issue] ${subjectLine}`,
      html,
      attachments,
      replyTo,
    },
    { maxAttempts: 2 }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not send report.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

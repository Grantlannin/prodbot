import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SUPPORT_EMAIL } from '@/lib/site';
import { isResendConfigured, sendEmailWithRetry } from '@/lib/email/resend';
import {
  createSupportTicket,
  uploadSupportScreenshot,
} from '@/lib/support/tickets';
import {
  formatTicketId,
  type SupportDebugSnapshot,
  type SupportSurface,
} from '@/lib/support/types';

export const runtime = 'nodejs';

const MAX_MESSAGE = 4000;
const MAX_SUBJECT = 120;
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const SURFACES = new Set<SupportSurface>(['app', 'extension', 'unknown']);

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

function parseDebug(raw: unknown): SupportDebugSnapshot {
  if (!raw || typeof raw !== 'object') return {};
  return raw as SupportDebugSnapshot;
}

function parseSurface(raw: unknown): SupportSurface {
  const value = String(raw || 'unknown') as SupportSurface;
  return SURFACES.has(value) ? value : 'unknown';
}

export async function POST(req: Request) {
  if (!isResendConfigured()) {
    return NextResponse.json({ error: 'Support email is not configured.' }, { status: 503 });
  }

  let messageRaw = '';
  let subjectRaw = '';
  let surfaceRaw: unknown = 'unknown';
  let debugRaw: unknown = {};
  let screenshot: File | null = null;

  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      messageRaw = String(form.get('message') ?? '');
      subjectRaw = String(form.get('subject') ?? '');
      surfaceRaw = form.get('surface') ?? 'unknown';
      const debugField = form.get('debug');
      if (typeof debugField === 'string' && debugField.trim()) {
        try {
          debugRaw = JSON.parse(debugField);
        } catch {
          debugRaw = {};
        }
      }
      const file = form.get('screenshot');
      if (file instanceof File && file.size > 0) screenshot = file;
    } else {
      const body = (await req.json()) as {
        message?: unknown;
        subject?: unknown;
        surface?: unknown;
        debug?: unknown;
      };
      messageRaw = String(body.message ?? '');
      subjectRaw = String(body.subject ?? '');
      surfaceRaw = body.surface ?? 'unknown';
      debugRaw = body.debug ?? {};
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const message = messageRaw.trim().slice(0, MAX_MESSAGE);
  const subjectLine = (subjectRaw.trim() || 'App issue').slice(0, MAX_SUBJECT);
  const surface = parseSurface(surfaceRaw);
  const debug = parseDebug(debugRaw);

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
  let userId: string | null = null;
  let replyTo: string | undefined;
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    fromUser = user?.email?.trim() || fromUser;
    userId = user?.id || null;
    if (user?.email?.trim()) replyTo = user.email.trim();
  } catch {
    /* allow reports without auth configured */
  }

  const ua = req.headers.get('user-agent')?.slice(0, 300) || 'unknown';
  const enrichedDebug: SupportDebugSnapshot = {
    ...debug,
    userAgent: debug.userAgent || ua,
    appUrl: debug.appUrl || undefined,
  };

  let ticketDisplayId: string | null = null;
  let fingerprint: string | null = null;
  let isDuplicate = false;
  let requiresStoreUpload = false;
  let screenshotPath: string | null = null;

  try {
    const tempKey = userId || `anon-${Date.now()}`;
    if (screenshot) {
      screenshotPath = await uploadSupportScreenshot(tempKey, screenshot);
    }

    const created = await createSupportTicket({
      userId,
      userEmail: replyTo || null,
      subject: subjectLine,
      message,
      surface,
      debug: enrichedDebug,
      screenshotPath,
    });
    ticketDisplayId = formatTicketId(created.ticket.ticket_number);
    fingerprint = created.fingerprint;
    isDuplicate = created.isDuplicate;
    requiresStoreUpload = created.uniqueBug.requires_store_upload;
  } catch (err) {
    console.error('[support/report] ticket create failed — still emailing', err);
  }

  const debugLines = [
    `Surface: ${surface}`,
    `Lock: ${enrichedDebug.lockMode ?? 'n/a'}`,
    `Session active: ${String(enrichedDebug.sessionActive ?? 'n/a')}`,
    `Extension: ${
      enrichedDebug.extensionInstalled
        ? enrichedDebug.extensionVersion || 'installed (version unknown)'
        : 'not detected'
    }`,
    `Blocklist: ${enrichedDebug.blocklistCount ?? 0} domains`,
    `Browser / OS: ${enrichedDebug.browser || 'n/a'} / ${enrichedDebug.os || 'n/a'}`,
    `App URL: ${enrichedDebug.appUrl || 'n/a'}`,
    fingerprint ? `Fingerprint: ${fingerprint}` : null,
    isDuplicate ? 'Duplicate of existing unique bug' : null,
    requiresStoreUpload
      ? 'Extension bug — best-shot unpacked gate required before Chrome Web Store upload'
      : null,
  ]
    .filter(Boolean)
    .join('<br/>');

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
      <p><strong>Daywinner support ticket</strong>${
        ticketDisplayId ? ` · <code>${escapeHtml(ticketDisplayId)}</code>` : ''
      }</p>
      <p><strong>From:</strong> ${escapeHtml(fromUser)}<br/>
      <strong>User id:</strong> ${escapeHtml(userId || 'n/a')}<br/>
      <strong>Subject:</strong> ${escapeHtml(subjectLine)}<br/>
      <strong>Screenshot:</strong> ${screenshot ? (screenshotPath ? 'stored + attached' : 'attached') : 'none'}</p>
      <p style="white-space:pre-wrap;border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#f8fafc">${escapeHtml(message)}</p>
      <p style="font-size:13px;color:#334155"><strong>Auto debug</strong><br/>${debugLines}</p>
      <p style="color:#64748b;font-size:12px"><strong>User-Agent:</strong> ${escapeHtml(ua)}</p>
      <p style="font-size:12px"><a href="https://www.daywinner.bot/ops">Open /ops → Tickets</a></p>
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
      subject: ticketDisplayId
        ? `[${ticketDisplayId}] ${subjectLine}`
        : `[Daywinner issue] ${subjectLine}`,
      html,
      attachments,
      replyTo,
    },
    { maxAttempts: 2 }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Could not send report.' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    ticketId: ticketDisplayId,
    fingerprint,
    isDuplicate,
  });
}

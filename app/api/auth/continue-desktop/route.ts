import { NextResponse } from 'next/server';
import { isResendConfigured } from '@/lib/email/resend';
import { sendContinueDesktopEmail } from '@/lib/email/continue-desktop';
import { clientIpFromRequest, rateLimitAllow } from '@/lib/security/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Email a laptop continue link (Resend + Supabase generateLink). */
export async function POST(req: Request) {
  try {
    if (!isResendConfigured()) {
      return NextResponse.json(
        {
          error:
            'Email sending is not configured yet (RESEND_API_KEY). Use the copy login link for now, or add Resend on Vercel.',
        },
        { status: 503 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();

    const ip = clientIpFromRequest(req);
    if (!rateLimitAllow(`continue-desktop:${user.id}:${ip}`, 5, 60_000)) {
      return NextResponse.json(
        { error: 'Too many email requests. Wait a minute, or use the copy login link.' },
        { status: 429 }
      );
    }

    const result = await sendContinueDesktopEmail(email);

    if (result.sent) {
      return NextResponse.json({ ok: true, sent: true, email });
    }

    if (result.queued) {
      return NextResponse.json({
        ok: true,
        sent: false,
        queued: true,
        email,
        message:
          'Email is queued and will go out shortly. You can also use the copy login link on your computer.',
      });
    }

    return NextResponse.json(
      { error: result.error || 'Could not send email' },
      { status: 502 }
    );
  } catch (error) {
    console.error('[continue-desktop]', error);
    return NextResponse.json({ error: 'Could not send continue email' }, { status: 500 });
  }
}

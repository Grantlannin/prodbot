import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  CHECKOUT_SESSION_COOKIE,
  isCheckoutSessionId,
} from '@/lib/billing/checkout-receipt';
import { reconcileBillingForUser } from '@/lib/billing/link-stripe';
import {
  CHROME_INTRO_COMPLETE_COOKIE,
  EXTENSION_INTRO_COMPLETE_COOKIE,
  SETUP_REQUIRED_COOKIE,
} from '@/lib/intro';
import { isBillingEnabled } from '@/lib/stripe/config';
import { getAppOrigin } from '@/lib/app-origin';
import { getSupabaseConfig } from '@/lib/supabase/config';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Cross-device magic links (phone → laptop) must use token_hash + verifyOtp.
 * PKCE `code` exchange only works on the device that requested the email.
 *
 * Supabase Magic Link template should point here, e.g.:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = (searchParams.get('type') || 'email') as EmailOtpType;
  let next = searchParams.get('next') ?? '/intro/chrome?resume_setup=1';

  // RedirectTo from Supabase may be an absolute URL — normalize to a path.
  if (next.startsWith('http://') || next.startsWith('https://')) {
    try {
      const u = new URL(next);
      next = `${u.pathname}${u.search}` || '/';
    } catch {
      next = '/intro/chrome?resume_setup=1';
    }
  }
  if (!next.startsWith('/')) next = '/';

  const appOrigin = getAppOrigin(request.nextUrl.origin);
  const resumeSetup = next.includes('resume_setup=1');

  if (!tokenHash) {
    return NextResponse.redirect(`${appOrigin}/login?error=otp_expired`);
  }

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }

  const response = NextResponse.redirect(`${appOrigin}${next}`);

  if (resumeSetup) {
    const cookieOpts = { path: '/', sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 365 * 10 };
    response.cookies.set(SETUP_REQUIRED_COOKIE, '1', cookieOpts);
    response.cookies.set(CHROME_INTRO_COMPLETE_COOKIE, '', { path: '/', maxAge: 0 });
    response.cookies.set(EXTENSION_INTRO_COMPLETE_COOKIE, '', { path: '/', maxAge: 0 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error('[auth/confirm]', error.message);
    const code = error.message.toLowerCase().includes('expired') ? 'otp_expired' : 'auth';
    return NextResponse.redirect(`${appOrigin}/login?error=${code}`);
  }

  if (isBillingEnabled()) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      try {
        const cookieSession = request.cookies.get(CHECKOUT_SESSION_COOKIE)?.value?.trim() || '';
        const sessionId = isCheckoutSessionId(cookieSession) ? cookieSession : null;
        await reconcileBillingForUser(user.id, user.email, sessionId);
      } catch (linkError) {
        console.error('[auth/confirm] link stripe', linkError);
      }
    }
  }

  return response;
}

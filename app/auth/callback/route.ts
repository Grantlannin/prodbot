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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) next = '/';

  const appOrigin = getAppOrigin(request.nextUrl.origin);
  const resumeSetup = next.includes('resume_setup=1');

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }

  const response = NextResponse.redirect(`${appOrigin}${next}`);

  // Phone → laptop magic link: re-arm setup cookies on this device.
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback]', error.message);
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
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
        console.error('[auth/callback] link stripe', linkError);
      }
    }
  }

  return response;
}

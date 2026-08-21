import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isActiveSubscription } from '@/lib/billing/subscription';
import { parseBillingRow } from '@/lib/billing/profile';
import {
  CHROME_INTRO_COMPLETE_COOKIE,
  EXTENSION_INTRO_COMPLETE_COOKIE,
  INTRO_CHROME_PATH,
  INTRO_EXTENSION_PATH,
  SETUP_REQUIRED_COOKIE,
} from '@/lib/intro';
import { isBillingEnabled, isPaywallDisabled } from '@/lib/stripe/config';
import { getSupabaseConfig, isAuthRequired } from '@/lib/supabase/config';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/auth/confirm', '/subscribe', '/privacy', '/terms', '/worksheet'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

function isIntroPath(pathname: string): boolean {
  return pathname === '/intro' || pathname.startsWith('/intro/');
}

function hasIntroCookie(request: NextRequest, name: string): boolean {
  return request.cookies.get(name)?.value === '1';
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  // Supabase Site URL fallbacks often land on /?code=... — finish auth there.
  const authCode = request.nextUrl.searchParams.get('code');
  if (authCode && pathname !== '/auth/callback') {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = '/auth/callback';
    if (!callbackUrl.searchParams.get('next')) {
      callbackUrl.searchParams.set('next', '/login?reset=1');
    }
    return NextResponse.redirect(callbackUrl);
  }

  // Cross-device magic links use token_hash (works on laptop; PKCE code does not).
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  if (tokenHash && pathname !== '/auth/confirm') {
    const confirmUrl = request.nextUrl.clone();
    confirmUrl.pathname = '/auth/confirm';
    if (!confirmUrl.searchParams.get('next')) {
      confirmUrl.searchParams.set('next', '/intro/chrome?resume_setup=1');
    }
    return NextResponse.redirect(confirmUrl);
  }

  const { url, anonKey, configured } = getSupabaseConfig();
  const billingEnabled = isBillingEnabled();
  const paywallOff = isPaywallDisabled();
  // Paywall-off test mode still requires login.
  const requireAuth = isAuthRequired() || billingEnabled || paywallOff;
  const gatedPath =
    isAppPath(pathname) ||
    isIntroPath(pathname) ||
    pathname === '/ops' ||
    pathname.startsWith('/ops/') ||
    (requireAuth && !isPublicPath(pathname));

  // Fail closed: never expose the app shell when auth isn't configured.
  if (!configured || !url || !anonKey) {
    if (gatedPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Chrome + extension onboarding (post-purchase). Video tutorial is in-app.
    if (isIntroPath(pathname)) {
      if (pathname === '/intro/video' || pathname.startsWith('/intro/video/')) {
        return NextResponse.redirect(new URL('/app', request.url));
      }
      if (!user && requireAuth) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (user && billingEnabled) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id, subscription_status, subscription_ends_at')
          .eq('id', user.id)
          .maybeSingle();
        if (!isActiveSubscription(parseBillingRow(profile))) {
          return NextResponse.redirect(new URL('/subscribe', request.url));
        }
      }
      return supabaseResponse;
    }

    if (requireAuth && !user && !isPublicPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      if (isAppPath(pathname) || pathname === '/ops' || pathname.startsWith('/ops/')) {
        loginUrl.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    if (user && (billingEnabled || paywallOff)) {
      let active = true;
      if (billingEnabled) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id, subscription_status, subscription_ends_at')
          .eq('id', user.id)
          .maybeSingle();
        active = isActiveSubscription(parseBillingRow(profile));
      }

      // Keep marketing landing public even when logged in.
      // Allow /login?reset=1 so password-reset links can finish after the email callback.
      if (active && pathname === '/subscribe') {
        return NextResponse.redirect(new URL('/app', request.url));
      }

      if (active && pathname === '/login' && request.nextUrl.searchParams.get('reset') !== '1') {
        return NextResponse.redirect(new URL('/app', request.url));
      }

      if (!active && isAppPath(pathname)) {
        const subscribeUrl = request.nextUrl.clone();
        subscribeUrl.pathname = '/subscribe';
        subscribeUrl.search = '';
        return NextResponse.redirect(subscribeUrl);
      }

      // Post-purchase setup only (dw_setup_required) — Chrome → extension, then /app.
      if (active && isAppPath(pathname) && hasIntroCookie(request, SETUP_REQUIRED_COOKIE)) {
        if (!hasIntroCookie(request, CHROME_INTRO_COMPLETE_COOKIE)) {
          return NextResponse.redirect(new URL(INTRO_CHROME_PATH, request.url));
        }
        if (!hasIntroCookie(request, EXTENSION_INTRO_COMPLETE_COOKIE)) {
          return NextResponse.redirect(new URL(INTRO_EXTENSION_PATH, request.url));
        }
      }
    } else if (requireAuth && user && pathname === '/login') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  } catch {
    // Fail closed on auth/billing errors — don't skip the paywall gate.
    if (gatedPath) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|zip|txt|xml|mp4|webm|mov)$).*)',
  ],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isActiveSubscription } from '@/lib/billing/subscription';
import { parseBillingRow } from '@/lib/billing/profile';
import { isBillingEnabled, isPaywallDisabled } from '@/lib/stripe/config';
import { getSupabaseConfig, isAuthRequired } from '@/lib/supabase/config';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/subscribe', '/privacy', '/terms'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

function isIntroPath(pathname: string): boolean {
  return pathname === '/intro' || pathname.startsWith('/intro/');
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured || !url || !anonKey) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const billingEnabled = isBillingEnabled();
  const paywallOff = isPaywallDisabled();
  // Paywall-off test mode still requires login.
  const requireAuth = isAuthRequired() || billingEnabled || paywallOff;

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

    // Old onboarding pages → app (or login). Tutorial video lives in-app now.
    if (isIntroPath(pathname)) {
      if (user) {
        return NextResponse.redirect(new URL('/app', request.url));
      }
      if (requireAuth) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('next', '/app');
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.redirect(new URL('/app', request.url));
    }

    if (requireAuth && !user && !isPublicPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      if (isAppPath(pathname)) {
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

      if (active && (pathname === '/login' || pathname === '/subscribe' || pathname === '/')) {
        return NextResponse.redirect(new URL('/app', request.url));
      }

      if (!active && pathname !== '/subscribe' && !pathname.startsWith('/subscribe/')) {
        if (pathname === '/' || isAppPath(pathname)) {
          const subscribeUrl = request.nextUrl.clone();
          subscribeUrl.pathname = '/subscribe';
          subscribeUrl.search = '';
          return NextResponse.redirect(subscribeUrl);
        }
      }
    } else if (requireAuth && user && pathname === '/login') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  } catch {
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|zip|txt|xml|mp4|webm|mov)$).*)',
  ],
};

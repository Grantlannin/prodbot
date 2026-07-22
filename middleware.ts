import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isActiveSubscription } from '@/lib/billing/subscription';
import { parseBillingRow } from '@/lib/billing/profile';
import { isBillingEnabled } from '@/lib/stripe/config';
import { INTRO_COMPLETE_COOKIE } from '@/lib/intro';
import { getSupabaseConfig, isAuthRequired } from '@/lib/supabase/config';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/subscribe', '/privacy', '/terms'];
const INTRO_PATH = '/intro';

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function isAppPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/');
}

function isIntroPath(pathname: string): boolean {
  return pathname === INTRO_PATH;
}

function hasIntroComplete(request: NextRequest): boolean {
  return request.cookies.get(INTRO_COMPLETE_COOKIE)?.value === '1';
}

function postSubscribeDestination(introComplete: boolean): string {
  return introComplete ? '/app' : INTRO_PATH;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured || !url || !anonKey) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const billingEnabled = isBillingEnabled();
  const requireAuth = isAuthRequired() || billingEnabled;

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

    if (requireAuth && !user && !isPublicPath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      if (isAppPath(pathname) || isIntroPath(pathname)) {
        loginUrl.searchParams.set('next', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    if (billingEnabled && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id, subscription_status, subscription_ends_at')
        .eq('id', user.id)
        .maybeSingle();

      const active = isActiveSubscription(parseBillingRow(profile));
      const introComplete = hasIntroComplete(request);

      if (active && (pathname === '/login' || pathname === '/subscribe' || pathname === '/')) {
        return NextResponse.redirect(new URL(postSubscribeDestination(introComplete), request.url));
      }

      if (active && !introComplete && isAppPath(pathname)) {
        return NextResponse.redirect(new URL(INTRO_PATH, request.url));
      }

      if (active && introComplete && isIntroPath(pathname)) {
        return NextResponse.redirect(new URL('/app', request.url));
      }

      if (active && !introComplete && isIntroPath(pathname)) {
        return supabaseResponse;
      }

      if (!active && isIntroPath(pathname)) {
        const subscribeUrl = request.nextUrl.clone();
        subscribeUrl.pathname = '/subscribe';
        subscribeUrl.search = '';
        return NextResponse.redirect(subscribeUrl);
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getAppOrigin } from '@/lib/app-origin';
import { getSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/';
  if (!next.startsWith('/')) next = '/';

  const appOrigin = getAppOrigin(request.nextUrl.origin);

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return NextResponse.redirect(`${appOrigin}/login?error=auth`);
  }

  const response = NextResponse.redirect(`${appOrigin}${next}`);

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

  return response;
}

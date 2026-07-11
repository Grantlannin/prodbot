import { normalizeSupabaseUrl } from './url';

export function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return {
    url,
    anonKey,
    configured: !!(url && anonKey),
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().configured;
}

/** When true, unauthenticated users are redirected to /login. Default: off. */
export function isAuthRequired(): boolean {
  return process.env.NEXT_PUBLIC_REQUIRE_AUTH === 'true';
}

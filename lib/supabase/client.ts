import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from '@/lib/supabase/config';

/**
 * Browser Supabase client — use only inside Client Components (`'use client'`).
 */
export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (use https://…ref….supabase.co only)'
    );
  }
  return createBrowserClient(url, anonKey);
}

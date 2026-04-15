import { createBrowserClient } from '@supabase/ssr';
import { normalizeSupabaseUrl } from '@/lib/supabase/url';

/**
 * Browser Supabase client — use only inside Client Components (`'use client'`).
 */
export function createBrowserSupabaseClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing or invalid NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (use https://…ref….supabase.co only)');
  }
  return createBrowserClient(url, key);
}

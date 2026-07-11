import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from './client';
import { isSupabaseConfigured } from './config';

export interface ProfileRow {
  id: string;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

export async function fetchProfileDisplayName(client?: SupabaseClient): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = client ?? createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data?.display_name) return null;
  const name = data.display_name.trim();
  return name || null;
}

export async function saveProfileDisplayName(displayName: string, client?: SupabaseClient): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = client ?? createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const trimmed = displayName.trim();
  if (!trimmed) return;

  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: trimmed,
    updated_at: new Date().toISOString(),
  });
}

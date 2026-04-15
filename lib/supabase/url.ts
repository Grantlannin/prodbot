/**
 * Supabase clients expect the **project URL only** (origin), e.g.
 *   https://abcdefghij.supabase.co
 * If env includes a path (`/rest/v1`, `/auth/v1`, trailing slash issues), Kong can respond with:
 *   {"error":"requested path is invalid"}
 */
export function normalizeSupabaseUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Normalize a post-auth `next` path. Rejects open redirects (//evil, schemes, etc.).
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  let next = raw.trim();
  if (!next) return fallback;

  if (next.startsWith('http://') || next.startsWith('https://')) {
    try {
      const u = new URL(next);
      next = `${u.pathname}${u.search}` || fallback;
    } catch {
      return fallback;
    }
  }

  // Relative path only; block scheme-relative //host and backslashes.
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }
  if (/^\/[^/]*:/i.test(next)) {
    return fallback;
  }

  return next;
}

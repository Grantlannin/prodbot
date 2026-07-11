export function normalizeContextUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidContextUrl(url: string): boolean {
  const normalized = normalizeContextUrl(url);
  if (!normalized) return false;
  try {
    const u = new URL(normalized);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function openContextLink(url: string) {
  const normalized = normalizeContextUrl(url);
  if (!isValidContextUrl(normalized)) return false;
  window.open(normalized, '_blank', 'noopener,noreferrer');
  return true;
}

/** True when the browser will open the link in a background tab (native behavior). */
export function isBackgroundTabClick(e: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'button'>) {
  return e.metaKey || e.ctrlKey || e.button === 1;
}

/** Hint for Google Docs paste placeholder — storage accepts any https link. */
export function isGoogleDocUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    if (u.hostname === 'docs.google.com' && u.pathname.includes('/document/')) return true;
    if (u.hostname === 'drive.google.com') return true;
    return false;
  } catch {
    return false;
  }
}

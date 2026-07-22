export const INTRO_COMPLETE_KEY = 'agentHQ_introComplete';
export const INTRO_COMPLETE_COOKIE = 'dw_intro_complete';

export const EXTENSION_INTRO_COMPLETE_KEY = 'agentHQ_extensionIntroComplete';
export const EXTENSION_INTRO_COMPLETE_COOKIE = 'dw_extension_intro_complete';

export const INTRO_VIDEO_PATH = '/intro';
export const INTRO_EXTENSION_PATH = '/intro/extension';

/** Convert a Loom share or embed URL to an embed iframe URL. */
export function getLoomEmbedUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const shareMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (shareMatch) return `https://www.loom.com/embed/${shareMatch[1]}`;

  const embedMatch = trimmed.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
  if (embedMatch) return `https://www.loom.com/embed/${embedMatch[1]}`;

  return trimmed.startsWith('https://www.loom.com/embed/') ? trimmed : null;
}

export function getChromeExtensionStoreUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL?.trim();
  return url || null;
}

function setClientCookie(name: string): void {
  const maxAge = 60 * 60 * 24 * 365 * 10;
  document.cookie = `${name}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function markIntroCompleteClient(): void {
  localStorage.setItem(INTRO_COMPLETE_KEY, '1');
  setClientCookie(INTRO_COMPLETE_COOKIE);
}

export function markExtensionIntroCompleteClient(): void {
  localStorage.setItem(EXTENSION_INTRO_COMPLETE_KEY, '1');
  setClientCookie(EXTENSION_INTRO_COMPLETE_COOKIE);
}

export function isIntroCompleteClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(INTRO_COMPLETE_KEY) === '1') return true;
  return document.cookie.split(';').some(part => part.trim() === `${INTRO_COMPLETE_COOKIE}=1`);
}

export function isExtensionIntroCompleteClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(EXTENSION_INTRO_COMPLETE_KEY) === '1') return true;
  return document.cookie.split(';').some(part => part.trim() === `${EXTENSION_INTRO_COMPLETE_COOKIE}=1`);
}

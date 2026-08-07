export const INTRO_COMPLETE_KEY = 'agentHQ_introComplete';
export const INTRO_COMPLETE_COOKIE = 'dw_intro_complete';

export const EXTENSION_INTRO_COMPLETE_KEY = 'agentHQ_extensionIntroComplete';
export const EXTENSION_INTRO_COMPLETE_COOKIE = 'dw_extension_intro_complete';

export const CHROME_INTRO_COMPLETE_KEY = 'agentHQ_chromeIntroComplete';
export const CHROME_INTRO_COMPLETE_COOKIE = 'dw_chrome_intro_complete';

/** Set after purchase/signup so middleware can require Chrome → extension before /app. */
export const SETUP_REQUIRED_COOKIE = 'dw_setup_required';

export const CHROME_DOWNLOAD_URL = 'https://www.google.com/chrome/';

/** Step 1 — use Google Chrome */
export const INTRO_CHROME_PATH = '/intro/chrome';
/** Step 2 — install focus extension */
export const INTRO_EXTENSION_PATH = '/intro';
/** Step 3 — how-to video */
export const INTRO_VIDEO_PATH = '/intro/video';

/** Chrome → extension (video lives in-app via How to start / full bot tutorial). */
export const ONBOARDING_STEP_COUNT = 2;

/** Convert a Loom or YouTube share/embed URL to an iframe embed URL. */
export function getVideoEmbedUrl(url: string | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    const id = ytMatch[1];
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      iv_load_policy: '3',
      controls: '1',
      fs: '1',
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  }

  const shareMatch = trimmed.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (shareMatch) return `https://www.loom.com/embed/${shareMatch[1]}`;

  const embedMatch = trimmed.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
  if (embedMatch) return `https://www.loom.com/embed/${embedMatch[1]}`;

  return trimmed.startsWith('https://www.loom.com/embed/') ? trimmed : null;
}

/** @deprecated use getVideoEmbedUrl */
export function getLoomEmbedUrl(url: string | undefined): string | null {
  return getVideoEmbedUrl(url);
}

export function getChromeExtensionStoreUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL?.trim();
  return url || null;
}

export function isChromeBrowserClient(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Chrome/.test(navigator.userAgent) && !/Edg|OPR|Brave/i.test(navigator.userAgent);
}

/** Phone / tablet — buy on mobile, finish setup on desktop Chrome. */
export function isMobileBrowserClient(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  // iPadOS reports as Mac but has touch
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  if (/iPad/i.test(ua)) return true;
  return false;
}

/** Path used after magic-link handoff from phone → laptop. */
export const INTRO_CHROME_RESUME_PATH = `${INTRO_CHROME_PATH}?resume_setup=1`;

function setClientCookie(name: string): void {
  const maxAge = 60 * 60 * 24 * 365 * 10;
  document.cookie = `${name}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearClientCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** Re-arm Chrome → extension setup on a new device (laptop continue link). */
export function armSetupRequiredClient(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CHROME_INTRO_COMPLETE_KEY);
  localStorage.removeItem(EXTENSION_INTRO_COMPLETE_KEY);
  clearClientCookie(CHROME_INTRO_COMPLETE_COOKIE);
  clearClientCookie(EXTENSION_INTRO_COMPLETE_COOKIE);
  setClientCookie(SETUP_REQUIRED_COOKIE);
}

export function markChromeIntroCompleteClient(): void {
  localStorage.setItem(CHROME_INTRO_COMPLETE_KEY, '1');
  setClientCookie(CHROME_INTRO_COMPLETE_COOKIE);
}

export function markIntroCompleteClient(): void {
  localStorage.setItem(INTRO_COMPLETE_KEY, '1');
  setClientCookie(INTRO_COMPLETE_COOKIE);
}

export function markExtensionIntroCompleteClient(): void {
  localStorage.setItem(EXTENSION_INTRO_COMPLETE_KEY, '1');
  setClientCookie(EXTENSION_INTRO_COMPLETE_COOKIE);
  clearClientCookie(SETUP_REQUIRED_COOKIE);
}

/** First-visit “how to start” video on the dashboard (same clip as full bot tutorial). */
export const HOW_TO_START_DISMISSED_KEY = 'agentHQ_howToStartDismissed';

export function isHowToStartDismissedClient(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(HOW_TO_START_DISMISSED_KEY) === '1';
}

export function markHowToStartDismissedClient(): void {
  localStorage.setItem(HOW_TO_START_DISMISSED_KEY, '1');
}

export function clearHowToStartDismissedClient(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HOW_TO_START_DISMISSED_KEY);
}

/** Shared tutorial video URL for first-watch + full bot tutorial (YouTube or Loom). */
const DEFAULT_FULL_BOT_TUTORIAL_URL = 'https://www.youtube.com/watch?v=gjFPQ1Gy9Xw';

export function getFullBotTutorialLoomUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_LOOM_FULL_BOT_TUTORIAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_LOOM_HOW_TO_START_URL?.trim() ||
    process.env.NEXT_PUBLIC_LOOM_INTRO_URL?.trim() ||
    DEFAULT_FULL_BOT_TUTORIAL_URL
  );
}

export function getHowToStartLoomUrl(): string | null {
  return getFullBotTutorialLoomUrl();
}

/** Wipe browser intro flags so a new account always starts fresh. */
export function clearIntroProgressClient(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CHROME_INTRO_COMPLETE_KEY);
  localStorage.removeItem(EXTENSION_INTRO_COMPLETE_KEY);
  localStorage.removeItem(INTRO_COMPLETE_KEY);
  clearClientCookie(CHROME_INTRO_COMPLETE_COOKIE);
  clearClientCookie(EXTENSION_INTRO_COMPLETE_COOKIE);
  clearClientCookie(INTRO_COMPLETE_COOKIE);
  setClientCookie(SETUP_REQUIRED_COOKIE);
  clearHowToStartDismissedClient();
}

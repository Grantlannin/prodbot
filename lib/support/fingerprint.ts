import type { SupportDebugSnapshot, SupportSurface } from './types';

const KEYWORD_BUCKETS: Array<{ key: string; tokens: string[] }> = [
  { key: 'x-block', tokens: ['x.com', 'twitter', 'x not', 'new tab', 'open tab'] },
  { key: 'memory', tokens: ['memory', 'ram', 'slow', 'gb', 'chrome lag'] },
  { key: 'cloud-wipe', tokens: ['not now', 'wipe', 'empty', 'backup', 'cloud', 'restore'] },
  { key: 'hard-lock', tokens: ['hard lock', 'hard mode', 'unlock'] },
  { key: 'soft-lock', tokens: ['soft lock', 'soft mode', 'blocking'] },
  { key: 'extension-install', tokens: ['install', 'extension missing', 'not installed', 'chrome store'] },
  { key: 'sync', tokens: ['sync', 'fingerprint', 'not syncing'] },
  { key: 'timer', tokens: ['timer', 'pomodoro', 'session end'] },
  { key: 'billing', tokens: ['billing', 'subscribe', 'payment', 'stripe'] },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lockBucket(debug: SupportDebugSnapshot): string {
  const mode = String(debug.lockMode || '').toLowerCase();
  if (mode === 'soft') return 'soft';
  if (mode === 'hard') return 'hard';
  if (mode === 'none' || mode === '') {
    return debug.sessionActive ? 'session' : 'off';
  }
  return mode.slice(0, 12) || 'unknown';
}

function keywordBucket(subject: string, message: string): string {
  const hay = normalizeText(`${subject} ${message}`);
  for (const bucket of KEYWORD_BUCKETS) {
    if (bucket.tokens.some(token => hay.includes(token))) return bucket.key;
  }
  const words = hay
    .split(' ')
    .filter(w => w.length >= 4)
    .slice(0, 4);
  return words.length ? words.join('-').slice(0, 48) : 'general';
}

export function buildSupportFingerprint(input: {
  surface: SupportSurface;
  subject: string;
  message: string;
  debug: SupportDebugSnapshot;
}): string {
  const surface = input.surface || 'unknown';
  const lock = lockBucket(input.debug);
  const ext =
    input.debug.extensionVersion?.trim() ||
    (input.debug.extensionInstalled ? 'installed' : 'none');
  const keywords = keywordBucket(input.subject, input.message);
  return `${surface}|${lock}|${ext}|${keywords}`;
}

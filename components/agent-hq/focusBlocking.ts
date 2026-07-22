import type { FocusLockMode, WorkSession, WorkStatus } from './types';

export const FOCUS_BLOCKLIST_KEY = 'agentHQ_focusBlocklist';

export const SOFT_LOCK_COOLDOWN_MS = 120_000;

export const FOCUS_LOCK_MODE_COPY: Record<FocusLockMode, { label: string; hint: string }> = {
  none: {
    label: 'No lock',
    hint: 'End anytime',
  },
  soft: {
    label: 'Soft',
    hint: '2-min wait to end early',
  },
  hard: {
    label: 'Hard',
    hint: 'No early end until timer ends',
  },
};

export const FOCUS_LOCK_MODES: FocusLockMode[] = ['none', 'soft', 'hard'];

export const SOCIAL_BUNDLE_SITES = [
  { key: 'twitter', label: 'X / Twitter', domains: ['twitter.com', 'x.com'] },
  { key: 'reddit', label: 'Reddit', domains: ['reddit.com'] },
  { key: 'youtube', label: 'YouTube', domains: ['youtube.com'] },
  { key: 'instagram', label: 'Instagram', domains: ['instagram.com'] },
  { key: 'tiktok', label: 'TikTok', domains: ['tiktok.com'] },
  { key: 'facebook', label: 'Facebook', domains: ['facebook.com'] },
  { key: 'linkedin', label: 'LinkedIn', domains: ['linkedin.com'] },
] as const;

export interface FocusBlocklistStore {
  socialBundleEnabled: boolean;
  /** Site keys unchecked while the social bundle is enabled */
  bundleDisabled: string[];
  customDomains: string[];
}

export const DEFAULT_FOCUS_BLOCKLIST: FocusBlocklistStore = {
  socialBundleEnabled: true,
  bundleDisabled: [],
  customDomains: [],
};

export interface FocusSyncPayload {
  blocking: boolean;
  domains: string[];
  sessionEndsAt: number | null;
  lockMode: FocusLockMode | null;
  sessionId: string | null;
  timerPaused: boolean;
  remainingMs: number | null;
  /** When false, extension clears all blocking (e.g. subscription canceled). */
  entitled?: boolean;
}

export interface FocusInfractionPayload {
  domain: string;
  label: string;
  createdAt: number;
}

const PRODUC_FOCUS_SYNC = 'PRODUC_FOCUS_SYNC';
const PRODUC_FOCUS_INFRACTION = 'PRODUC_FOCUS_INFRACTION';
export const PRODUC_FOCUS_PING = 'PRODUC_FOCUS_PING';
export const PRODUC_FOCUS_PONG = 'PRODUC_FOCUS_PONG';

export const FOCUS_CLEAR_PAYLOAD: FocusSyncPayload = {
  blocking: false,
  domains: [],
  sessionEndsAt: null,
  lockMode: null,
  sessionId: null,
  timerPaused: false,
  remainingMs: null,
  entitled: false,
};

export function normalizeDomain(input: string): string | null {
  let raw = input.trim().toLowerCase();
  if (!raw) return null;
  raw = raw.replace(/^https?:\/\//, '');
  raw = raw.replace(/^www\./, '');
  raw = raw.split('/')[0]?.split('?')[0]?.split('#')[0] ?? '';
  raw = raw.replace(/:\d+$/, '');
  if (!raw || !raw.includes('.')) return null;
  if (!/^[a-z0-9.-]+$/.test(raw)) return null;
  return raw;
}

export function resolveBlocklist(store: FocusBlocklistStore): string[] {
  const domains = new Set<string>();

  if (store.socialBundleEnabled) {
    for (const site of SOCIAL_BUNDLE_SITES) {
      if (store.bundleDisabled.includes(site.key)) continue;
      for (const domain of site.domains) {
        domains.add(domain);
      }
    }
  }

  for (const custom of store.customDomains) {
    const normalized = normalizeDomain(custom);
    if (normalized) domains.add(normalized);
  }

  return [...domains].sort();
}

export function blockedSiteInfraction(domain: string): { categoryKey: string; label: string } {
  const normalized = normalizeDomain(domain) ?? domain;
  return {
    categoryKey: `blocked:${normalized}`,
    label: `Blocked site: ${normalized}`,
  };
}

export function computeSessionEndsAt(
  status: WorkStatus,
  session: WorkSession | null,
  openCountdownLeft: number | null,
  timerPaused: boolean
): number | null {
  if (status !== 'working' || !session?.countdownTargetMs || !session.countdownStartTime) {
    return null;
  }
  if (timerPaused && openCountdownLeft != null) {
    return Date.now() + openCountdownLeft;
  }
  return session.countdownStartTime + session.countdownTargetMs;
}

export function buildFocusSyncPayload(input: {
  status: WorkStatus;
  session: WorkSession | null;
  blocklist: FocusBlocklistStore;
  openCountdownLeft: number | null;
  timerPaused: boolean;
  entitled?: boolean;
}): FocusSyncPayload {
  const entitled = input.entitled !== false;
  if (!entitled) {
    return { ...FOCUS_CLEAR_PAYLOAD };
  }

  const lockMode = input.session?.lockMode ?? 'none';
  const blocking =
    input.status === 'working' && (lockMode === 'soft' || lockMode === 'hard');
  const timerPaused = blocking && input.timerPaused;
  const remainingMs =
    blocking && input.openCountdownLeft != null ? input.openCountdownLeft : null;

  return {
    blocking,
    domains: blocking ? resolveBlocklist(input.blocklist) : [],
    sessionEndsAt: timerPaused
      ? null
      : computeSessionEndsAt(
          input.status,
          input.session,
          input.openCountdownLeft,
          input.timerPaused
        ),
    lockMode: input.session?.lockMode ?? null,
    sessionId: input.session?.id ?? null,
    timerPaused,
    remainingMs: timerPaused ? remainingMs : null,
    entitled: true,
  };
}

export function postFocusClearSync(): void {
  postFocusSync(FOCUS_CLEAR_PAYLOAD);
}

export function pingFocusExtension(onPong: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.data?.type !== PRODUC_FOCUS_PONG) return;
    onPong();
  };

  window.addEventListener('message', listener);
  const interval = window.setInterval(() => {
    window.postMessage({ type: PRODUC_FOCUS_PING }, window.location.origin);
  }, 1500);
  window.postMessage({ type: PRODUC_FOCUS_PING }, window.location.origin);

  return () => {
    window.removeEventListener('message', listener);
    window.clearInterval(interval);
  };
}

export function postFocusSync(payload: FocusSyncPayload): void {
  if (typeof window === 'undefined') return;
  window.postMessage({ type: PRODUC_FOCUS_SYNC, payload }, window.location.origin);
}

export function onExtensionInfraction(handler: (payload: FocusInfractionPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.data?.type !== PRODUC_FOCUS_INFRACTION) return;
    const payload = event.data.payload as FocusInfractionPayload | undefined;
    if (!payload?.label) return;
    handler(payload);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

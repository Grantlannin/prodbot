'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import { useStuckHelp } from './hooks/StuckHelpProvider';
import type { Infraction } from './types';
import {
  DEFAULT_FOCUS_BLOCKLIST,
  FOCUS_BLOCKLIST_KEY,
  blockedSiteInfraction,
  buildFocusSyncPayload,
  onExtensionInfraction,
  onTimeStudyCheckIn,
  postFocusSync,
  postTimeStudySync,
  type FocusBlocklistStore,
} from './focusBlocking';
import {
  DEFAULT_TIME_STUDY_SETTINGS,
  TIME_STUDY_CHECKINS_KEY,
  TIME_STUDY_SETTINGS_KEY,
  makeTimeStudyCheckInId,
  normalizeTimeStudyCheckInsStore,
  normalizeTimeStudySettings,
  type TimeStudyCheckInsStore,
  type TimeStudySettings,
} from './timeStudy';

interface FocusExtensionBridgeProps {
  onAddInfraction: (categoryKey: string, label: string, source: Infraction['source']) => void;
}

export default function FocusExtensionBridge({ onAddInfraction }: FocusExtensionBridgeProps) {
  const [blocklist] = useLocalStorage<FocusBlocklistStore>(FOCUS_BLOCKLIST_KEY, DEFAULT_FOCUS_BLOCKLIST);
  const [timeStudySettings] = useLocalStorage<TimeStudySettings>(
    TIME_STUDY_SETTINGS_KEY,
    DEFAULT_TIME_STUDY_SETTINGS
  );
  const [, setTimeStudyCheckIns] = useLocalStorage<TimeStudyCheckInsStore>(TIME_STUDY_CHECKINS_KEY, {
    dayStartMs: 0,
    items: [],
  });
  /** Optimistic until billing status proves otherwise — avoids unlocking on fetch blips. */
  const [entitled, setEntitled] = useState(true);
  const {
    status,
    currentSession,
    timerPaused,
    finishWorkSession,
    tickStore,
  } = useWorkTrackerContext();
  const { blockStuckSessionAutoEnd, workCompleteOpen, isContinuingStuckWork } = useStuckHelp();
  const autoEndedRef = useRef(false);
  const seenInfractionsRef = useRef<Set<string>>(new Set());
  const blocklistRef = useRef(blocklist);
  const entitledRef = useRef(entitled);
  const statusRef = useRef(status);
  const sessionRef = useRef(currentSession);
  const timerPausedRef = useRef(timerPaused);
  blocklistRef.current = blocklist;
  entitledRef.current = entitled;
  statusRef.current = status;
  sessionRef.current = currentSession;
  timerPausedRef.current = timerPaused;

  useEffect(() => {
    let cancelled = false;

    const loadEntitlement = () => {
      void fetch('/api/billing/status')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (cancelled) return;
          // Keep last known entitlement on fetch failure so a blip doesn't unlock the blocker.
          if (!data) return;
          if (data.billingEnabled) {
            setEntitled(!!data.active);
          } else {
            setEntitled(true);
          }
        })
        .catch(() => {
          /* keep prior entitled state */
        });
    };

    loadEntitlement();
    const interval = window.setInterval(loadEntitlement, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const lastSyncKeyRef = useRef('');
  const wasBlockingRef = useRef(false);
  /** Wall-clock when Soft/Hard blocking last turned on — lock-on kicks share this window. */
  const blockingOnAtRef = useRef(0);

  const pushFocusSync = () => {
    const { openCountdownLeft } = tickStore.getSnapshot();
    const payload = buildFocusSyncPayload({
      status: statusRef.current,
      session: sessionRef.current,
      blocklist: blocklistRef.current,
      openCountdownLeft,
      timerPaused: timerPausedRef.current,
      entitled: entitledRef.current,
    });
    // Fingerprint stable fields only — never include per-tick countdown ms.
    const key = JSON.stringify({
      blocking: payload.blocking,
      domains: payload.domains,
      sessionEndsAt: payload.sessionEndsAt,
      lockMode: payload.lockMode,
      sessionId: payload.sessionId,
      timerPaused: payload.timerPaused,
      remainingMs: payload.remainingMs,
      entitled: payload.entitled !== false,
    });
    if (key === lastSyncKeyRef.current) return;
    lastSyncKeyRef.current = key;

    if (payload.blocking && !wasBlockingRef.current) {
      blockingOnAtRef.current = Date.now();
    }
    if (!payload.blocking) {
      blockingOnAtRef.current = 0;
    }
    wasBlockingRef.current = !!payload.blocking;

    postFocusSync(payload);
  };

  // Sync on real session/entitlement/blocklist changes — not every timer tick.
  useEffect(() => {
    pushFocusSync();
  }, [status, currentSession, timerPaused, entitled, blocklist, tickStore]);

  // Tick only to clear blocking / finish when countdown hits 0.
  useEffect(() => {
    let wasExpired = tickStore.getSnapshot().openCountdownLeft === 0;
    const onTick = () => {
      const { openCountdownLeft } = tickStore.getSnapshot();
      const expired = openCountdownLeft === 0;
      if (expired && !wasExpired) {
        pushFocusSync();
      }
      wasExpired = expired;
    };
    return tickStore.subscribe(onTick);
  }, [tickStore]);

  useEffect(() => {
    return onExtensionInfraction(payload => {
      // Lock-on kicks are logged in the extension immediately but may flush to the
      // app seconds later — judge by createdAt vs when blocking turned on, not receive time.
      const LOCK_ON_GRACE_MS = 20_000;
      const created =
        typeof payload.createdAt === 'number' && payload.createdAt > 0
          ? payload.createdAt
          : Date.now();
      const blockingOnAt = blockingOnAtRef.current;
      if (blockingOnAt > 0 && created >= blockingOnAt - 1000 && created < blockingOnAt + LOCK_ON_GRACE_MS) {
        return;
      }
      const session = sessionRef.current;
      const lock = session?.lockMode;
      if (
        (lock === 'soft' || lock === 'hard') &&
        typeof session?.startTime === 'number' &&
        created >= session.startTime - 1000 &&
        created < session.startTime + LOCK_ON_GRACE_MS
      ) {
        return;
      }
      const key = `${payload.domain}:${payload.createdAt}`;
      if (seenInfractionsRef.current.has(key)) return;
      seenInfractionsRef.current.add(key);
      const { categoryKey, label } = blockedSiteInfraction(payload.domain);
      onAddInfraction(categoryKey, label, 'extension');
    });
  }, [onAddInfraction]);

  useEffect(() => {
    const settings = normalizeTimeStudySettings(timeStudySettings);
    postTimeStudySync({
      enabled: settings.enabled,
      intervalMinutes: settings.intervalMinutes,
      sessionActive: status === 'working' && !timerPaused,
    });
  }, [timeStudySettings, status, timerPaused]);

  useEffect(() => {
    return onTimeStudyCheckIn(payload => {
      const text = payload.text.trim();
      if (!text) return;
      setTimeStudyCheckIns(prev => {
        const normalized = normalizeTimeStudyCheckInsStore(prev);
        if (normalized.items.some(item => item.id === payload.id)) return normalized;
        return {
          ...normalized,
          items: [
            ...normalized.items,
            {
              id: payload.id || makeTimeStudyCheckInId(),
              text,
              createdAt: payload.createdAt || Date.now(),
            },
          ],
        };
      });
    });
  }, [setTimeStudyCheckIns]);

  useEffect(() => {
    const check = () => {
      const { openCountdownLeft } = tickStore.getSnapshot();
      if (openCountdownLeft != null && openCountdownLeft > 0) {
        autoEndedRef.current = false;
      }
      if (status !== 'working' || !currentSession?.countdownTargetMs) {
        autoEndedRef.current = false;
        return;
      }
      if (openCountdownLeft === 0 && !autoEndedRef.current) {
        if (blockStuckSessionAutoEnd || workCompleteOpen || isContinuingStuckWork) {
          return;
        }
        autoEndedRef.current = true;
        finishWorkSession();
      }
    };

    check();
    return tickStore.subscribe(check);
  }, [
    status,
    currentSession,
    finishWorkSession,
    blockStuckSessionAutoEnd,
    workCompleteOpen,
    isContinuingStuckWork,
    tickStore,
  ]);

  return null;
}

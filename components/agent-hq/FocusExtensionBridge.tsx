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
  const [entitled, setEntitled] = useState(false);
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
  blocklistRef.current = blocklist;
  entitledRef.current = entitled;

  useEffect(() => {
    let cancelled = false;

    const loadEntitlement = () => {
      void fetch('/api/billing/status')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (cancelled) return;
          if (!data) {
            setEntitled(false);
            return;
          }
          if (data.billingEnabled) {
            setEntitled(!!data.active);
          } else {
            setEntitled(true);
          }
        })
        .catch(() => {
          if (!cancelled) setEntitled(false);
        });
    };

    loadEntitlement();
    const interval = window.setInterval(loadEntitlement, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const { openCountdownLeft } = tickStore.getSnapshot();
      const payload = buildFocusSyncPayload({
        status,
        session: currentSession,
        blocklist: blocklistRef.current,
        openCountdownLeft,
        timerPaused,
        entitled: entitledRef.current,
      });
      postFocusSync(payload);
    };

    sync();
    return tickStore.subscribe(sync);
  }, [status, currentSession, timerPaused, tickStore]);

  useEffect(() => {
    return onExtensionInfraction(payload => {
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

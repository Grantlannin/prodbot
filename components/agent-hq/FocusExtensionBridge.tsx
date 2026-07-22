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
  postFocusSync,
  type FocusBlocklistStore,
} from './focusBlocking';

interface FocusExtensionBridgeProps {
  onAddInfraction: (categoryKey: string, label: string, source: Infraction['source']) => void;
}

export default function FocusExtensionBridge({ onAddInfraction }: FocusExtensionBridgeProps) {
  const [blocklist] = useLocalStorage<FocusBlocklistStore>(FOCUS_BLOCKLIST_KEY, DEFAULT_FOCUS_BLOCKLIST);
  const [entitled, setEntitled] = useState(true);
  const {
    status,
    currentSession,
    openCountdownLeft,
    timerPaused,
    finishWorkSession,
  } = useWorkTrackerContext();
  const { blockStuckSessionAutoEnd, workCompleteOpen, isContinuingStuckWork } = useStuckHelp();
  const autoEndedRef = useRef(false);
  const seenInfractionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadEntitlement = () => {
      void fetch('/api/billing/status')
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (cancelled || !data) return;
          if (data.billingEnabled) {
            setEntitled(!!data.active);
          } else {
            setEntitled(true);
          }
        })
        .catch(() => {});
    };

    loadEntitlement();
    const interval = window.setInterval(loadEntitlement, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const payload = buildFocusSyncPayload({
      status,
      session: currentSession,
      blocklist,
      openCountdownLeft,
      timerPaused,
      entitled,
    });
    postFocusSync(payload);
  }, [status, currentSession, blocklist, openCountdownLeft, timerPaused, entitled]);

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
    if (openCountdownLeft != null && openCountdownLeft > 0) {
      autoEndedRef.current = false;
    }
  }, [openCountdownLeft]);

  useEffect(() => {
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
  }, [status, currentSession, openCountdownLeft, finishWorkSession, blockStuckSessionAutoEnd, workCompleteOpen, isContinuingStuckWork]);

  return null;
}

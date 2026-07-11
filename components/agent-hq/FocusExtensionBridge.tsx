'use client';

import { useEffect, useRef } from 'react';
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
    const payload = buildFocusSyncPayload({
      status,
      session: currentSession,
      blocklist,
      openCountdownLeft,
      timerPaused,
    });
    postFocusSync(payload);
  }, [status, currentSession, blocklist, openCountdownLeft, timerPaused]);

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

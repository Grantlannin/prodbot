'use client';

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useWorkTracker } from './useWorkTracker';
import type { WorkTrackerTickSnapshot, WorkTrackerTickStore } from './workTrackerTickStore';

type WorkTrackerValue = ReturnType<typeof useWorkTracker>;

const WorkTrackerContext = createContext<WorkTrackerValue | null>(null);

export function WorkTrackerProvider({ children }: { children: ReactNode }) {
  const tracker = useWorkTracker();

  const value = useMemo(
    () => tracker,
    [
      tracker.status,
      tracker.phase,
      tracker.currentSession,
      tracker.currentBreak,
      tracker.pendingData,
      tracker.pomodoroPausedRemaining,
      tracker.pausedWorkElapsed,
      tracker.timerPaused,
      tracker.sessions,
      tracker.breaks,
      tracker.tickStore,
      tracker.startSession,
      tracker.stopSessionTimer,
      tracker.endSession,
      tracker.finishWorkSession,
      tracker.continueStuckWorkSession,
      tracker.abortActiveSession,
      tracker.startBreak,
      tracker.endBreak,
      tracker.pauseTimer,
      tracker.resumeTimer,
      tracker.resetTimer,
      tracker.editTimer,
      tracker.setCountdownTimer,
      tracker.setSessionLockMode,
      tracker.extendActiveCountdown,
      tracker.adjustCountdownByMs,
      tracker.updateCurrentSession,
      tracker.setPendingData,
      tracker.setPhase,
      tracker.reset,
      tracker.getTodayStats,
      tracker.getTickSnapshot,
    ]
  );

  return <WorkTrackerContext.Provider value={value}>{children}</WorkTrackerContext.Provider>;
}

export function useWorkTrackerContext(): WorkTrackerValue {
  const ctx = useContext(WorkTrackerContext);
  if (!ctx) {
    throw new Error('useWorkTrackerContext must be used within WorkTrackerProvider');
  }
  return ctx;
}

/** Subscribe to live timer display values without re-rendering the whole app tree. */
export function useWorkTrackerTick(): WorkTrackerTickSnapshot {
  const { tickStore } = useWorkTrackerContext();
  return useSyncExternalStore(
    tickStore.subscribe,
    tickStore.getSnapshot,
    tickStore.getSnapshot
  );
}

export type { WorkTrackerTickStore, WorkTrackerTickSnapshot };

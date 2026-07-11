'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useWorkTracker } from './useWorkTracker';

type WorkTrackerValue = ReturnType<typeof useWorkTracker>;

const WorkTrackerContext = createContext<WorkTrackerValue | null>(null);

export function WorkTrackerProvider({ children }: { children: ReactNode }) {
  const tracker = useWorkTracker();
  return <WorkTrackerContext.Provider value={tracker}>{children}</WorkTrackerContext.Provider>;
}

export function useWorkTrackerContext(): WorkTrackerValue {
  const ctx = useContext(WorkTrackerContext);
  if (!ctx) {
    throw new Error('useWorkTrackerContext must be used within WorkTrackerProvider');
  }
  return ctx;
}

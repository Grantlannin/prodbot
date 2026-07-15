'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NightPrepTomorrowTask } from '../nightPrep/storage';
import {
  type MorningFlowChatMessage,
  type MorningFlowPhase,
  type MorningFlowState,
  type MorningTimerChoice,
} from '../morningFlow/flows';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function initialFlowState(tasks: NightPrepTomorrowTask[]): MorningFlowState {
  return {
    phase: 'intro',
    messages: [],
    tasks,
    selectedTask: null,
    timerChoice: null,
  };
}

interface MorningFlowContextValue {
  open: boolean;
  flow: MorningFlowState | null;
  openMorningFlow: (tasks: NightPrepTomorrowTask[]) => void;
  closeMorningFlow: () => void;
  resetMorningFlow: (tasks: NightPrepTomorrowTask[]) => void;
  setMorningFlowPhase: (phase: MorningFlowPhase) => void;
  setMorningFlowFields: (
    fields: Partial<Pick<MorningFlowState, 'selectedTask' | 'timerChoice'>>
  ) => void;
  appendMorningFlowMessages: (...items: Omit<MorningFlowChatMessage, 'id'>[]) => void;
}

const MorningFlowContext = createContext<MorningFlowContextValue | null>(null);

export function MorningFlowProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<MorningFlowState | null>(null);

  const openMorningFlow = useCallback((tasks: NightPrepTomorrowTask[]) => {
    setFlow(initialFlowState(tasks));
    setOpen(true);
  }, []);

  const closeMorningFlow = useCallback(() => {
    setOpen(false);
  }, []);

  const resetMorningFlow = useCallback((tasks: NightPrepTomorrowTask[]) => {
    setFlow(initialFlowState(tasks));
  }, []);

  const setMorningFlowPhase = useCallback((phase: MorningFlowPhase) => {
    setFlow(prev => (prev ? { ...prev, phase } : prev));
  }, []);

  const setMorningFlowFields = useCallback(
    (fields: Partial<Pick<MorningFlowState, 'selectedTask' | 'timerChoice'>>) => {
      setFlow(prev => (prev ? { ...prev, ...fields } : prev));
    },
    []
  );

  const appendMorningFlowMessages = useCallback((...items: Omit<MorningFlowChatMessage, 'id'>[]) => {
    setFlow(prev =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, ...items.map(item => ({ ...item, id: makeId() }))],
          }
        : prev
    );
  }, []);

  const value = useMemo(
    () => ({
      open,
      flow,
      openMorningFlow,
      closeMorningFlow,
      resetMorningFlow,
      setMorningFlowPhase,
      setMorningFlowFields,
      appendMorningFlowMessages,
    }),
    [
      open,
      flow,
      openMorningFlow,
      closeMorningFlow,
      resetMorningFlow,
      setMorningFlowPhase,
      setMorningFlowFields,
      appendMorningFlowMessages,
    ]
  );

  return <MorningFlowContext.Provider value={value}>{children}</MorningFlowContext.Provider>;
}

export function useMorningFlow(): MorningFlowContextValue {
  const ctx = useContext(MorningFlowContext);
  if (!ctx) throw new Error('useMorningFlow must be used within MorningFlowProvider');
  return ctx;
}

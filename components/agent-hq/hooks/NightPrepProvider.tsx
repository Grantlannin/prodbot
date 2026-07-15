'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { WindDownItem } from '../nightPrep/windDownItems';
import {
  type NightPrepChatMessage,
  type NightPrepFlowPhase,
  type NightPrepFlowState,
} from '../nightPrep/flows';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function initialFlowState(items: WindDownItem[]): NightPrepFlowState {
  return {
    phase: 'wind_down_intro',
    messages: [],
    windDownItems: items,
    windDownIndex: 0,
    firstWorkBlockTime: '',
    workLocation: '',
    projectMode: null,
    projectId: '',
    projectName: '',
    taskId: '',
    taskText: '',
  };
}

interface NightPrepContextValue {
  open: boolean;
  flow: NightPrepFlowState | null;
  openNightPrepChat: (windDownItems: WindDownItem[]) => void;
  closeNightPrepChat: () => void;
  resetNightPrepChat: (windDownItems: WindDownItem[]) => void;
  setNightPrepPhase: (phase: NightPrepFlowPhase) => void;
  setNightPrepFields: (
    fields: Partial<
      Pick<
        NightPrepFlowState,
        | 'windDownIndex'
        | 'firstWorkBlockTime'
        | 'workLocation'
        | 'projectMode'
        | 'projectId'
        | 'projectName'
        | 'taskId'
        | 'taskText'
      >
    >
  ) => void;
  appendNightPrepMessages: (...items: Omit<NightPrepChatMessage, 'id'>[]) => void;
}

const NightPrepContext = createContext<NightPrepContextValue | null>(null);

export function NightPrepProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<NightPrepFlowState | null>(null);

  const openNightPrepChat = useCallback((windDownItems: WindDownItem[]) => {
    setFlow(initialFlowState(windDownItems));
    setOpen(true);
  }, []);

  const closeNightPrepChat = useCallback(() => {
    setOpen(false);
  }, []);

  const resetNightPrepChat = useCallback((windDownItems: WindDownItem[]) => {
    setFlow(initialFlowState(windDownItems));
  }, []);

  const setNightPrepPhase = useCallback((phase: NightPrepFlowPhase) => {
    setFlow(prev => (prev ? { ...prev, phase } : prev));
  }, []);

  const setNightPrepFields = useCallback(
    (
      fields: Partial<
        Pick<
          NightPrepFlowState,
          | 'windDownIndex'
          | 'firstWorkBlockTime'
          | 'workLocation'
          | 'projectMode'
          | 'projectId'
          | 'projectName'
          | 'taskId'
          | 'taskText'
        >
      >
    ) => {
      setFlow(prev => (prev ? { ...prev, ...fields } : prev));
    },
    []
  );

  const appendNightPrepMessages = useCallback((...items: Omit<NightPrepChatMessage, 'id'>[]) => {
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
      openNightPrepChat,
      closeNightPrepChat,
      resetNightPrepChat,
      setNightPrepPhase,
      setNightPrepFields,
      appendNightPrepMessages,
    }),
    [
      open,
      flow,
      openNightPrepChat,
      closeNightPrepChat,
      resetNightPrepChat,
      setNightPrepPhase,
      setNightPrepFields,
      appendNightPrepMessages,
    ]
  );

  return <NightPrepContext.Provider value={value}>{children}</NightPrepContext.Provider>;
}

export function useNightPrep(): NightPrepContextValue {
  const ctx = useContext(NightPrepContext);
  if (!ctx) throw new Error('useNightPrep must be used within NightPrepProvider');
  return ctx;
}

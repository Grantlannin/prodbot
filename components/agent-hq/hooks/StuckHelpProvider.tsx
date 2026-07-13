'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useWorkTrackerContext } from './WorkTrackerProvider';
import { useDoneToday } from './useDoneToday';
import { useHoverTimer } from './HoverTimerProvider';
import {
  KICKSTART_DURATION_MS,
  STARTING_FLOW_COPY,
  STUCK_POST_PREP_WORK_PROJECT,
  STUCK_PREP_NOTES_PREFIX,
  STUCK_WORK_NOTES_PREFIX,
  isStuckPostPrepContinueSession,
  type OrganizingFlowPhase,
  type OrganizingFlowState,
  type StartingFlowPhase,
  type StartingFlowState,
  type StuckChatMessage,
} from '../stuckHelp/flows';
import type { FocusLockMode } from '../types';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isPrepSession(
  session: { sessionNotes?: string | null; countdownTargetMs?: number | null } | null
): boolean {
  return (
    !!session?.sessionNotes?.startsWith(STUCK_PREP_NOTES_PREFIX) &&
    session.countdownTargetMs === KICKSTART_DURATION_MS
  );
}

function isWorkSession(
  session: { lockMode?: string; sessionNotes?: string | null; countdownTargetMs?: number | null } | null
): boolean {
  return !!session?.sessionNotes?.startsWith(STUCK_WORK_NOTES_PREFIX);
}

interface WorkSessionMeta {
  sessionId: string;
  importantTask: string;
  chunks: string;
}

const STUCK_WORK_CTX_KEY = 'stuckHelp_workCtx';

function saveWorkCtx(meta: WorkSessionMeta) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STUCK_WORK_CTX_KEY, JSON.stringify(meta));
  } catch {
    /* ignore quota / private mode */
  }
}

function loadWorkCtx(): WorkSessionMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STUCK_WORK_CTX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkSessionMeta;
  } catch {
    return null;
  }
}

function clearWorkCtx() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STUCK_WORK_CTX_KEY);
  } catch {
    /* ignore */
  }
}

function continuedWorkProject(): string {
  return STUCK_POST_PREP_WORK_PROJECT;
}

interface StuckHelpContextValue {
  open: boolean;
  openStuckHelp: () => void;
  closeStuckHelp: () => void;
  startingFlow: StartingFlowState | null;
  organizingFlow: OrganizingFlowState | null;
  startStartingFlow: () => void;
  startOrganizingFlow: () => void;
  clearStartingFlow: () => void;
  setStartingPhase: (phase: StartingFlowPhase) => void;
  setOrganizingPhase: (phase: OrganizingFlowPhase) => void;
  setStartingFields: (fields: Partial<Pick<StartingFlowState, 'importantTask' | 'prepPlan' | 'chunks'>>) => void;
  setOrganizingFields: (
    fields: Partial<
      Pick<OrganizingFlowState, 'projectId' | 'projectName' | 'projectMode' | 'taskTexts' | 'hardestTask'>
    >
  ) => void;
  appendStartingMessages: (...items: Omit<StuckChatMessage, 'id'>[]) => void;
  appendOrganizingMessages: (...items: Omit<StuckChatMessage, 'id'>[]) => void;
  postPrepResume: boolean;
  clearPostPrepResume: () => void;
  prepOverlayOpen: boolean;
  beginPrepTimer: (importantTask: string, prepPlan: string) => void;
  finishPrepTimer: () => void;
  cancelPrepTimer: () => void;
  beginWorkTimer: (importantTask: string, chunks: string) => void;
  blockStuckSessionAutoEnd: boolean;
  isContinuingStuckWork: boolean;
  extendWorkSession: (minutes: number, lockMode: FocusLockMode) => void;
  dismissWorkComplete: () => void;
  endWorkSession: () => void;
  workCompleteOpen: boolean;
  workLoggedOpen: boolean;
  dismissWorkLogged: () => void;
}

const StuckHelpContext = createContext<StuckHelpContextValue | null>(null);

export function StuckHelpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [startingFlow, setStartingFlow] = useState<StartingFlowState | null>(null);
  const [organizingFlow, setOrganizingFlow] = useState<OrganizingFlowState | null>(null);
  const [postPrepResume, setPostPrepResume] = useState(false);
  const [prepOverlayOpen, setPrepOverlayOpen] = useState(false);
  const [workMeta, setWorkMeta] = useState<WorkSessionMeta | null>(null);
  const [workCompleteOpen, setWorkCompleteOpen] = useState(false);
  const [workLoggedOpen, setWorkLoggedOpen] = useState(false);
  const [isContinuingStuckWork, setIsContinuingStuckWork] = useState(false);
  const prepNotifiedRef = useRef(false);
  const workNotifiedRef = useRef(false);
  const stuckLoopContinueActiveRef = useRef(false);
  const sawContinueSessionRef = useRef(false);

  useEffect(() => {
    if (workMeta) return;
    const saved = loadWorkCtx();
    if (saved) setWorkMeta(saved);
  }, [workMeta]);

  const { startSession, continueStuckWorkSession, finishWorkSession, abortActiveSession, status, openCountdownLeft, currentSession } =
    useWorkTrackerContext();
  const { requestOpen, open: openHoverTimer, supported: hoverTimerSupported } = useHoverTimer();
  const { addItem: addDoneToday } = useDoneToday();

  const blockStuckSessionAutoEnd =
    status === 'working' &&
    (isPrepSession(currentSession) ||
      (isWorkSession(currentSession) &&
        !!workMeta &&
        currentSession?.countdownTargetMs === KICKSTART_DURATION_MS));

  const blockPrepAutoEnd =
    prepOverlayOpen && status === 'working' && isPrepSession(currentSession) && !prepNotifiedRef.current;

  const blockWorkAutoEnd =
    !!workMeta &&
    status === 'working' &&
    isWorkSession(currentSession) &&
    currentSession?.countdownTargetMs === KICKSTART_DURATION_MS &&
    !workCompleteOpen &&
    !workLoggedOpen &&
    !workNotifiedRef.current;

  const openStuckHelp = useCallback(() => setOpen(true), []);
  const closeStuckHelp = useCallback(() => setOpen(false), []);

  const startStartingFlow = useCallback(() => {
    setOrganizingFlow(null);
    setStartingFlow({
      phase: 'await_task',
      messages: [],
      importantTask: '',
      prepPlan: '',
      chunks: '',
    });
  }, []);

  const startOrganizingFlow = useCallback(() => {
    setStartingFlow(null);
    setOrganizingFlow({
      phase: 'await_project_mode',
      messages: [],
      projectMode: null,
      projectId: '',
      projectName: '',
      taskTexts: [],
      hardestTask: '',
    });
  }, []);

  const clearStartingFlow = useCallback(() => {
    setStartingFlow(null);
    setOrganizingFlow(null);
    setPostPrepResume(false);
  }, []);

  const completeStuckHelpLoop = useCallback(() => {
    clearStartingFlow();
    setWorkMeta(null);
    clearWorkCtx();
    setWorkCompleteOpen(false);
    setWorkLoggedOpen(false);
    setPrepOverlayOpen(false);
    setOpen(false);
    workNotifiedRef.current = false;
    prepNotifiedRef.current = false;
    stuckLoopContinueActiveRef.current = false;
    sawContinueSessionRef.current = false;
  }, [clearStartingFlow]);

  const setStartingPhase = useCallback((phase: StartingFlowPhase) => {
    setStartingFlow(prev => (prev ? { ...prev, phase } : prev));
  }, []);

  const setStartingFields = useCallback(
    (fields: Partial<Pick<StartingFlowState, 'importantTask' | 'prepPlan' | 'chunks'>>) => {
      setStartingFlow(prev => (prev ? { ...prev, ...fields } : prev));
    },
    []
  );

  const setOrganizingPhase = useCallback((phase: OrganizingFlowPhase) => {
    setOrganizingFlow(prev => (prev ? { ...prev, phase } : prev));
  }, []);

  const setOrganizingFields = useCallback(
    (
      fields: Partial<
        Pick<OrganizingFlowState, 'projectId' | 'projectName' | 'projectMode' | 'taskTexts' | 'hardestTask'>
      >
    ) => {
      setOrganizingFlow(prev => (prev ? { ...prev, ...fields } : prev));
    },
    []
  );

  const appendOrganizingMessages = useCallback((...items: Omit<StuckChatMessage, 'id'>[]) => {
    setOrganizingFlow(prev =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, ...items.map(item => ({ ...item, id: makeId() }))],
          }
        : prev
    );
  }, []);

  const appendStartingMessages = useCallback((...items: Omit<StuckChatMessage, 'id'>[]) => {
    setStartingFlow(prev =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, ...items.map(item => ({ ...item, id: makeId() }))],
          }
        : prev
    );
  }, []);

  const clearPostPrepResume = useCallback(() => setPostPrepResume(false), []);

  const beginPrepTimer = useCallback(
    (importantTask: string, prepPlan: string) => {
      if (status === 'working' || status === 'on_break') return;
      const task = importantTask.trim();
      const prep = prepPlan.trim();
      if (!task || !prep) return;

      startSession({
        project: task,
        type: 'open',
        countdownTargetMs: KICKSTART_DURATION_MS,
        lockMode: 'hard',
        sessionNotes: `${STUCK_PREP_NOTES_PREFIX}: ${prep}`,
      });
      prepNotifiedRef.current = false;
      setPrepOverlayOpen(true);
      setOpen(false);
    },
    [status, startSession]
  );

  const finishPrepTimer = useCallback(() => {
    if (!isPrepSession(currentSession)) return;
    finishWorkSession('stuck-help prep complete');
    prepNotifiedRef.current = false;
    setPrepOverlayOpen(false);
    setStartingPhase('await_chunks');
    setPostPrepResume(true);
    setOpen(true);
  }, [currentSession, finishWorkSession, setStartingPhase]);

  const cancelPrepTimer = useCallback(() => {
    if (!isPrepSession(currentSession) && status !== 'working') {
      setPrepOverlayOpen(false);
      setOpen(true);
      return;
    }
    abortActiveSession();
    prepNotifiedRef.current = false;
    setPrepOverlayOpen(false);
    setOpen(true);
  }, [currentSession, status, abortActiveSession]);

  const beginWorkTimer = useCallback(
    (importantTask: string, chunks: string) => {
      if (status === 'working' || status === 'on_break') return;
      const task = importantTask.trim();
      const chunkText = chunks.trim();
      if (!task || !chunkText) return;

      startSession({
        project: task,
        type: 'open',
        countdownTargetMs: KICKSTART_DURATION_MS,
        lockMode: 'hard',
        sessionNotes: `${STUCK_WORK_NOTES_PREFIX}: ${chunkText}`,
      });
      requestOpen();
      workNotifiedRef.current = false;
      const nextMeta = {
        sessionId: '',
        importantTask: task,
        chunks: chunkText,
      };
      setWorkMeta(nextMeta);
      saveWorkCtx(nextMeta);
      setOpen(false);
    },
    [status, startSession, requestOpen]
  );

  useEffect(() => {
    if (!workMeta || workMeta.sessionId || !currentSession) return;
    if (isWorkSession(currentSession)) {
      setWorkMeta(prev => (prev ? { ...prev, sessionId: currentSession.id } : prev));
    }
  }, [workMeta, currentSession]);

  const notifyPrepComplete = useCallback(() => {
    if (prepNotifiedRef.current) return;
    if (!isPrepSession(currentSession)) return;
    prepNotifiedRef.current = true;
    finishPrepTimer();
  }, [currentSession, finishPrepTimer]);

  const notifyWorkComplete = useCallback(() => {
    if (workNotifiedRef.current) return;
    if (!workMeta || !isWorkSession(currentSession)) return;
    if (currentSession?.countdownTargetMs !== KICKSTART_DURATION_MS) return;
    workNotifiedRef.current = true;

    const meta = workMeta;
    finishWorkSession(
      meta ? `5-min chunk #1 on "${meta.importantTask}": ${meta.chunks}` : '5-min chunk work session'
    );
    if (meta) saveWorkCtx(meta);
    setWorkMeta(prev => (prev ? { ...prev, sessionId: '' } : prev));
    setWorkCompleteOpen(true);
  }, [workMeta, currentSession, finishWorkSession]);

  useEffect(() => {
    if (!blockPrepAutoEnd) return;
    if (openCountdownLeft !== 0) return;
    notifyPrepComplete();
  }, [blockPrepAutoEnd, openCountdownLeft, notifyPrepComplete]);

  useEffect(() => {
    if (!blockWorkAutoEnd) return;
    if (openCountdownLeft !== 0) return;
    notifyWorkComplete();
  }, [blockWorkAutoEnd, openCountdownLeft, notifyWorkComplete]);

  const extendWorkSession = useCallback(
    (minutes: number, lockMode: FocusLockMode) => {
      if (minutes <= 0) return;

      const project = continuedWorkProject();

      setIsContinuingStuckWork(true);
      setWorkCompleteOpen(false);
      workNotifiedRef.current = false;
      stuckLoopContinueActiveRef.current = true;
      sawContinueSessionRef.current = false;

      const nextMeta: WorkSessionMeta = {
        sessionId: '',
        importantTask: project,
        chunks: '',
      };
      setWorkMeta(nextMeta);
      saveWorkCtx(nextMeta);

      const sessionPayload = {
        project,
        type: 'open' as const,
        countdownTargetMs: minutes * 60 * 1000,
        lockMode,
        sessionNotes: `${STUCK_WORK_NOTES_PREFIX}:extended:postprepwork`,
      };

      if (status === 'working' && currentSession) {
        continueStuckWorkSession({
          project,
          minutes,
          lockMode,
          sessionNotes: sessionPayload.sessionNotes,
          pendingKickstartNotes: 'stuck-help kickstart complete',
        });
      } else {
        startSession(sessionPayload);
      }

      requestOpen();
      if (hoverTimerSupported) {
        void openHoverTimer();
      }

      window.setTimeout(() => {
        setIsContinuingStuckWork(false);
      }, 250);
    },
    [
      status,
      currentSession,
      startSession,
      continueStuckWorkSession,
      requestOpen,
      openHoverTimer,
      hoverTimerSupported,
    ]
  );

  useEffect(() => {
    if (!stuckLoopContinueActiveRef.current) return;
    if (status === 'working' && isStuckPostPrepContinueSession(currentSession)) {
      sawContinueSessionRef.current = true;
      return;
    }
    if (!sawContinueSessionRef.current) return;
    if (status !== 'idle') return;
    completeStuckHelpLoop();
  }, [status, currentSession, completeStuckHelpLoop]);

  const dismissWorkComplete = useCallback(() => {
    setWorkCompleteOpen(false);
    workNotifiedRef.current = false;
  }, []);

  const endWorkSession = useCallback(() => {
    const meta = workMeta;
    if (status === 'working' && isWorkSession(currentSession)) {
      finishWorkSession(
        meta ? `continued work on "${meta.importantTask}"` : 'continued chunk work session'
      );
    }
    if (meta) {
      addDoneToday({
        text: meta.chunks || STUCK_POST_PREP_WORK_PROJECT,
        detail: meta.importantTask === STUCK_POST_PREP_WORK_PROJECT ? undefined : meta.importantTask,
        source: 'manual',
      });
    }
    setWorkCompleteOpen(false);
    setWorkLoggedOpen(true);
    setWorkMeta(null);
    clearWorkCtx();
    workNotifiedRef.current = false;
    stuckLoopContinueActiveRef.current = false;
    sawContinueSessionRef.current = false;
    clearStartingFlow();
  }, [finishWorkSession, workMeta, addDoneToday, status, currentSession, clearStartingFlow]);

  const dismissWorkLogged = useCallback(() => {
    setWorkLoggedOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      open,
      openStuckHelp,
      closeStuckHelp,
      startingFlow,
      organizingFlow,
      startStartingFlow,
      startOrganizingFlow,
      clearStartingFlow,
      setStartingPhase,
      setOrganizingPhase,
      setStartingFields,
      setOrganizingFields,
      appendStartingMessages,
      appendOrganizingMessages,
      postPrepResume,
      clearPostPrepResume,
      prepOverlayOpen,
      beginPrepTimer,
      finishPrepTimer,
      cancelPrepTimer,
      beginWorkTimer,
      blockStuckSessionAutoEnd,
      isContinuingStuckWork,
      extendWorkSession,
      dismissWorkComplete,
      endWorkSession,
      workCompleteOpen,
      workLoggedOpen,
      dismissWorkLogged,
    }),
    [
      open,
      openStuckHelp,
      closeStuckHelp,
      startingFlow,
      organizingFlow,
      startStartingFlow,
      startOrganizingFlow,
      clearStartingFlow,
      setStartingPhase,
      setOrganizingPhase,
      setStartingFields,
      setOrganizingFields,
      appendStartingMessages,
      appendOrganizingMessages,
      postPrepResume,
      clearPostPrepResume,
      prepOverlayOpen,
      beginPrepTimer,
      finishPrepTimer,
      cancelPrepTimer,
      beginWorkTimer,
      blockStuckSessionAutoEnd,
      isContinuingStuckWork,
      extendWorkSession,
      dismissWorkComplete,
      endWorkSession,
      workCompleteOpen,
      workLoggedOpen,
      dismissWorkLogged,
    ]
  );

  return <StuckHelpContext.Provider value={value}>{children}</StuckHelpContext.Provider>;
}

export function useStuckHelp(): StuckHelpContextValue {
  const ctx = useContext(StuckHelpContext);
  if (!ctx) throw new Error('useStuckHelp must be used within StuckHelpProvider');
  return ctx;
}

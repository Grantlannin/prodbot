'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { WorkSession, BreakSession, TrackerState, ConversationPhase, WorkStatus, FocusLockMode } from '../types';
import {
  isStuckPrepSessionNotes,
  isStuckWorkSessionNotes,
  KICKSTART_DURATION_MS,
} from '../stuckHelp/flows';
import { computeActiveWorkMs, isSameLocalDay, pomodoroTargetMs, sessionWorkMs } from '../workTime';

const SESSIONS_KEY = 'agentHQ_sessions';
const BREAKS_KEY = 'agentHQ_breaks';
const TRACKER_STATE_KEY = 'agentHQ_trackerState';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const initialState: TrackerState = {
  status: 'idle',
  phase: 'idle',
  currentSession: null,
  currentBreak: null,
  pendingData: {},
  pomodoroTimeLeft: null,
  breakTimeLeft: null,
  pomodoroPausedRemaining: null,
  pausedWorkElapsed: null,
  timerPaused: false,
};

export function useWorkTracker() {
  const [sessions, setSessions] = useLocalStorage<WorkSession[]>(SESSIONS_KEY, []);
  const [breaks, setBreaks] = useLocalStorage<BreakSession[]>(BREAKS_KEY, []);
  const [state, setState] = useLocalStorage<TrackerState>(TRACKER_STATE_KEY, initialState);

  const [elapsed, setElapsed] = useState(0);
  const [pomodoroLeft, setPomodoroLeft] = useState<number | null>(null);
  const [breakLeft, setBreakLeft] = useState<number | null>(null);
  const [openCountdownLeft, setOpenCountdownLeft] = useState<number | null>(null);

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(prev => {
      const chatPhases: ConversationPhase[] = [
        'asking_project',
        'asking_energy',
        'asking_focus',
        'asking_estimate',
        'asking_productivity',
        'asking_blockers',
        'eod_context',
        'eod_insights',
        'countdown',
        'pomodoro_done',
      ];
      const stuckSessionPhases: ConversationPhase[] = [
        'working',
        'pomodoro_working',
        'pomodoro_paused',
        'pomodoro_break',
      ];
      const noActiveSession = !prev.currentSession || prev.currentSession.endTime;
      if (prev.status === 'idle' && noActiveSession) {
        if (chatPhases.includes(prev.phase) || stuckSessionPhases.includes(prev.phase)) {
          return { ...prev, phase: 'idle', pendingData: {}, currentBreak: null, breakTimeLeft: null, pomodoroPausedRemaining: null, pausedWorkElapsed: null };
        }
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recomputeTick = useCallback(() => {
    const s = stateRef.current;
    if (s.timerPaused) return;
    const now = Date.now();

    if (s.status === 'working' && s.currentSession) {
      const start = s.currentSession.startTime;
      setElapsed(now - start);
      if (
        s.currentSession.countdownTargetMs != null &&
        s.currentSession.countdownStartTime != null &&
        s.currentSession.type === 'open'
      ) {
        const target = s.currentSession.countdownTargetMs;
        setOpenCountdownLeft(Math.max(0, target - (now - s.currentSession.countdownStartTime)));
      }
      if (s.phase === 'pomodoro_working' && s.currentSession.pomodoroMinutes) {
        const target = pomodoroTargetMs(s.currentSession);
        setPomodoroLeft(Math.max(0, target - (now - start)));
      }
    } else if (s.status === 'on_break' && s.currentBreak) {
      if (s.phase === 'pomodoro_break' && s.currentBreak.durationMinutes) {
        const target = s.currentBreak.durationMinutes * 60 * 1000;
        setBreakLeft(Math.max(0, target - (now - s.currentBreak.startTime)));
      } else {
        setBreakLeft(now - s.currentBreak.startTime);
      }
    }
  }, []);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (state.timerPaused) return;

    if (
      (state.status === 'working' && state.currentSession) ||
      (state.status === 'on_break' && state.currentBreak)
    ) {
      recomputeTick();
      tickRef.current = setInterval(recomputeTick, 1000);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [
    state.status,
    state.phase,
    state.currentSession?.startTime,
    state.currentSession?.countdownTargetMs,
    state.currentBreak?.startTime,
    state.timerPaused,
    recomputeTick,
  ]);

  const startSession = useCallback(
    (data: Partial<WorkSession>) => {
      const now = Date.now();
      const countdownTargetMs =
        data.type === 'open' && data.countdownTargetMs != null && data.countdownTargetMs > 0
          ? Math.round(data.countdownTargetMs)
          : null;

      const session: WorkSession = {
        id: makeId(),
        project: data.project || 'Unnamed',
        startTime: now,
        endTime: null,
        estimateMinutes: data.estimateMinutes ?? null,
        energyBefore: data.energyBefore ?? null,
        focusBefore: data.focusBefore ?? null,
        productivityRating: null,
        blockers: null,
        sessionNotes: data.sessionNotes ?? null,
        type: data.type || 'open',
        pomodoroMinutes: data.pomodoroMinutes,
        pomodoroBreakMinutes: data.pomodoroBreakMinutes,
        countdownTargetMs,
        countdownStartTime: countdownTargetMs ? now : null,
        lockMode: data.lockMode,
      };

      setState(prev => ({
        ...prev,
        status: 'working',
        phase: data.type === 'pomodoro' ? 'pomodoro_working' : 'working',
        currentSession: session,
        pendingData: {},
        pomodoroTimeLeft: data.pomodoroMinutes ? data.pomodoroMinutes * 60 * 1000 : null,
        pomodoroPausedRemaining: null,
        pausedWorkElapsed: null,
        timerPaused: false,
      }));

      setElapsed(0);
      setOpenCountdownLeft(countdownTargetMs);
      if (data.pomodoroMinutes) {
        setPomodoroLeft(data.pomodoroMinutes * 60 * 1000);
      }
    },
    [setState]
  );

  const stopSessionTimer = useCallback(() => {
    if (!state.currentSession || state.currentSession.endTime) return null;

    const now = Date.now();
    const workMs = computeActiveWorkMs({
      session: state.currentSession,
      status: state.status,
      phase: state.phase,
      elapsed,
      pomodoroLeft,
      pomodoroPausedRemaining: state.pomodoroPausedRemaining ?? null,
      pausedWorkElapsed: state.pausedWorkElapsed ?? null,
    });

    const stopped: WorkSession = {
      ...state.currentSession,
      endTime: now,
      startTime: now - workMs,
      accumulatedWorkMs: workMs,
    };

    setState(prev => ({
      ...prev,
      status: 'idle',
      currentSession: stopped,
      pomodoroTimeLeft: null,
      pausedWorkElapsed: null,
      timerPaused: false,
    }));

    setElapsed(workMs);
    setPomodoroLeft(null);
    setOpenCountdownLeft(null);

    return stopped;
  }, [state.currentSession, state.status, state.phase, state.pomodoroPausedRemaining, state.pausedWorkElapsed, elapsed, pomodoroLeft, setState]);

  const endSession = useCallback(
    (sessionNotes?: string) => {
      if (!state.currentSession) return null;

      const now = Date.now();
      const completed: WorkSession = {
        ...state.currentSession,
        endTime: state.currentSession.endTime ?? now,
        sessionNotes: sessionNotes?.trim() || null,
      };

      setSessions(prev => [...prev, completed]);
      setState(prev => ({
        ...prev,
        status: 'idle',
        phase: 'idle',
        currentSession: null,
        pomodoroTimeLeft: null,
        timerPaused: false,
      }));

      setElapsed(0);
      setPomodoroLeft(null);

      return completed;
    },
    [state.currentSession, setSessions, setState]
  );

  const finishWorkSession = useCallback(
    (sessionNotes?: string) => {
      const s = stateRef.current;
      if (!s.currentSession || s.currentSession.endTime) return null;

      const now = Date.now();

      if (s.currentBreak && !s.currentBreak.endTime) {
        setBreaks(prev => [...prev, { ...s.currentBreak!, endTime: now }]);
      }

      const workMs = computeActiveWorkMs({
        session: s.currentSession,
        status: s.status,
        phase: s.phase,
        elapsed,
        pomodoroLeft,
        pomodoroPausedRemaining: s.pomodoroPausedRemaining ?? null,
        pausedWorkElapsed: s.pausedWorkElapsed ?? null,
      });

      const completed: WorkSession = {
        ...s.currentSession,
        endTime: now,
        startTime: now - workMs,
        accumulatedWorkMs: workMs,
        sessionNotes: sessionNotes?.trim() || null,
      };

      setSessions(prev => [...prev, completed]);
      setState(prev => ({
        ...prev,
        status: 'idle',
        phase: 'idle',
        currentSession: null,
        currentBreak: null,
        breakTimeLeft: null,
        pomodoroTimeLeft: null,
        pomodoroPausedRemaining: null,
        pausedWorkElapsed: null,
        timerPaused: false,
      }));

      setElapsed(0);
      setPomodoroLeft(null);
      setBreakLeft(null);
      setOpenCountdownLeft(null);

      return completed;
    },
    [elapsed, pomodoroLeft, setBreaks, setSessions, setState]
  );

  const continueStuckWorkSession = useCallback(
    (opts: {
      project: string;
      minutes: number;
      lockMode?: FocusLockMode;
      sessionNotes?: string | null;
      pendingKickstartNotes?: string | null;
    }) => {
      const ms = Math.max(0, Math.round(opts.minutes * 60 * 1000));
      if (ms <= 0) return;

      const now = Date.now();
      const s = stateRef.current;
      let kickstartToArchive: WorkSession | null = null;

      if (
        s.status === 'working' &&
        s.currentSession &&
        !s.currentSession.endTime &&
        isStuckWorkSessionNotes(s.currentSession.sessionNotes) &&
        s.currentSession.countdownTargetMs === KICKSTART_DURATION_MS
      ) {
        const workMs = computeActiveWorkMs({
          session: s.currentSession,
          status: s.status,
          phase: s.phase,
          elapsed,
          pomodoroLeft,
          pomodoroPausedRemaining: s.pomodoroPausedRemaining ?? null,
          pausedWorkElapsed: s.pausedWorkElapsed ?? null,
        });
        kickstartToArchive = {
          ...s.currentSession,
          endTime: now,
          startTime: now - workMs,
          accumulatedWorkMs: workMs,
          sessionNotes: opts.pendingKickstartNotes?.trim() || s.currentSession.sessionNotes,
        };
      }

      const session: WorkSession = {
        id: makeId(),
        project: opts.project.trim() || 'Unnamed',
        startTime: now,
        endTime: null,
        estimateMinutes: null,
        energyBefore: null,
        focusBefore: null,
        productivityRating: null,
        blockers: null,
        sessionNotes: opts.sessionNotes ?? null,
        type: 'open',
        pomodoroMinutes: undefined,
        pomodoroBreakMinutes: undefined,
        countdownTargetMs: ms,
        countdownStartTime: now,
        lockMode: opts.lockMode,
      };

      if (kickstartToArchive) {
        setSessions(prev => [...prev, kickstartToArchive!]);
      }

      setState(prev => ({
        ...prev,
        status: 'working',
        phase: 'working',
        currentSession: session,
        currentBreak: null,
        pendingData: {},
        pomodoroTimeLeft: null,
        breakTimeLeft: null,
        pomodoroPausedRemaining: null,
        pausedWorkElapsed: null,
        timerPaused: false,
      }));

      setElapsed(0);
      setOpenCountdownLeft(ms);
      setPomodoroLeft(null);
      setBreakLeft(null);
    },
    [elapsed, pomodoroLeft, setSessions, setState]
  );

  const abortActiveSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'idle',
      phase: 'idle',
      currentSession: null,
      currentBreak: null,
      breakTimeLeft: null,
      pomodoroTimeLeft: null,
      pomodoroPausedRemaining: null,
      pausedWorkElapsed: null,
      timerPaused: false,
    }));
    setElapsed(0);
    setPomodoroLeft(null);
    setBreakLeft(null);
    setOpenCountdownLeft(null);
  }, [setState]);

  const startBreak = useCallback(
    (durationMinutes?: number) => {
      const s = stateRef.current;
      const breakSession: BreakSession = {
        id: makeId(),
        startTime: Date.now(),
        endTime: null,
        durationMinutes,
      };

      let pomodoroPausedRemaining: number | null = durationMinutes ? null : s.pomodoroPausedRemaining ?? null;
      let pausedWorkElapsed: number | null = s.pausedWorkElapsed ?? null;
      let phase: ConversationPhase = durationMinutes ? 'pomodoro_break' : 'working';

      let pausedSession = s.currentSession ? { ...s.currentSession } : null;

      if (
        !durationMinutes &&
        s.phase === 'pomodoro_working' &&
        s.currentSession?.type === 'pomodoro'
      ) {
        const target = pomodoroTargetMs(s.currentSession);
        pomodoroPausedRemaining = Math.max(0, target - (Date.now() - s.currentSession.startTime));
        phase = 'pomodoro_paused';
        setPomodoroLeft(pomodoroPausedRemaining);
        if (pausedSession) {
          pausedSession.accumulatedWorkMs =
            (pausedSession.accumulatedWorkMs ?? 0) + (target - pomodoroPausedRemaining);
        }
      } else if (durationMinutes && s.phase === 'pomodoro_working' && s.currentSession?.type === 'pomodoro') {
        pomodoroPausedRemaining = null;
        if (pausedSession) {
          pausedSession.accumulatedWorkMs = (pausedSession.accumulatedWorkMs ?? 0) + pomodoroTargetMs(s.currentSession);
        }
      } else if (!durationMinutes && s.status === 'working' && s.currentSession?.type === 'open') {
        pausedWorkElapsed = Date.now() - s.currentSession.startTime;
        if (s.currentSession.countdownTargetMs && s.currentSession.countdownStartTime) {
          setOpenCountdownLeft(
            Math.max(0, s.currentSession.countdownTargetMs - (Date.now() - s.currentSession.countdownStartTime))
          );
        }
      } else if (durationMinutes) {
        pomodoroPausedRemaining = null;
      }

      if (pausedSession) {
        setState(prev => ({
          ...prev,
          status: 'on_break',
          phase,
          currentBreak: breakSession,
          currentSession: pausedSession,
          breakTimeLeft: durationMinutes ? durationMinutes * 60 * 1000 : null,
          pomodoroPausedRemaining,
          pausedWorkElapsed,
          timerPaused: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'on_break',
          phase: 'idle',
          currentBreak: breakSession,
          pomodoroPausedRemaining: null,
          pausedWorkElapsed: null,
          timerPaused: false,
        }));
      }

      if (durationMinutes) {
        setBreakLeft(durationMinutes * 60 * 1000);
      }
    },
    [setState]
  );

  const endBreak = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentBreak) return;

    const completed: BreakSession = {
      ...s.currentBreak,
      endTime: Date.now(),
    };

    setBreaks(prev => [...prev, completed]);

    let session = s.currentSession ? { ...s.currentSession } : null;
    let nextPomodoroLeft: number | null = null;

    if (session?.type === 'pomodoro') {
      if (s.pomodoroPausedRemaining != null) {
        const remaining = s.pomodoroPausedRemaining;
        const target = pomodoroTargetMs(session);
        session.startTime = Date.now() - (target - remaining);
        nextPomodoroLeft = remaining;
      } else {
        const target = pomodoroTargetMs(session);
        session.startTime = Date.now();
        nextPomodoroLeft = target;
      }
    } else if (session?.type === 'open' && s.pausedWorkElapsed != null) {
      session.startTime = Date.now() - s.pausedWorkElapsed;
    }

    if (nextPomodoroLeft != null) {
      setPomodoroLeft(nextPomodoroLeft);
    }
    setBreakLeft(null);

    if (session?.type === 'pomodoro') {
      setElapsed(Date.now() - session.startTime);
    } else if (session?.type === 'open' && s.pausedWorkElapsed != null) {
      setElapsed(s.pausedWorkElapsed);
    }

    setState(prev => ({
      ...prev,
      status: session ? 'working' : 'idle',
      phase: session?.type === 'pomodoro' ? 'pomodoro_working' : session ? 'working' : 'idle',
      currentSession: session,
      currentBreak: null,
      breakTimeLeft: null,
      pomodoroPausedRemaining: null,
      pausedWorkElapsed: null,
      timerPaused: false,
    }));
  }, [setBreaks, setState]);

  const pauseTimer = useCallback(() => {
    if (state.timerPaused) return;
    const now = Date.now();
    const s = stateRef.current;
    if (s.status === 'working' && s.currentSession?.countdownTargetMs && s.currentSession.countdownStartTime) {
      const remaining = Math.max(
        0,
        s.currentSession.countdownTargetMs - (now - s.currentSession.countdownStartTime)
      );
      setOpenCountdownLeft(remaining);
    }
    if (s.status === 'on_break' && s.currentBreak && s.phase !== 'pomodoro_break') {
      setBreakLeft(now - s.currentBreak.startTime);
    }
    setState(prev => ({ ...prev, timerPaused: true }));
  }, [state.timerPaused, setState]);

  const resumeTimer = useCallback(() => {
    if (!state.timerPaused) return;
    const now = Date.now();

    setState(prev => {
      if (!prev.timerPaused) return prev;

      if (prev.status === 'working' && prev.currentSession) {
        const session = { ...prev.currentSession };
        if (prev.phase === 'pomodoro_working' && session.pomodoroMinutes) {
          const remaining = pomodoroLeft ?? pomodoroTargetMs(session);
          const target = pomodoroTargetMs(session);
          session.startTime = now - (target - remaining);
        } else if (session.countdownTargetMs && session.countdownStartTime) {
          const remaining = openCountdownLeft ?? session.countdownTargetMs;
          session.countdownStartTime = now - (session.countdownTargetMs - remaining);
        } else {
          session.startTime = now - elapsed;
        }
        return { ...prev, timerPaused: false, currentSession: session };
      }

      if (prev.status === 'on_break' && prev.currentBreak) {
        const brk = { ...prev.currentBreak };
        if (prev.phase === 'pomodoro_break' && brk.durationMinutes) {
          const remaining = breakLeft ?? brk.durationMinutes * 60 * 1000;
          const target = brk.durationMinutes * 60 * 1000;
          brk.startTime = now - (target - remaining);
        } else if (prev.phase === 'pomodoro_paused') {
          const openElapsed = breakLeft ?? now - brk.startTime;
          brk.startTime = now - openElapsed;
        } else {
          const openElapsed = breakLeft ?? now - brk.startTime;
          brk.startTime = now - openElapsed;
        }
        return { ...prev, timerPaused: false, currentBreak: brk };
      }

      return { ...prev, timerPaused: false };
    });
  }, [state.timerPaused, elapsed, pomodoroLeft, breakLeft, openCountdownLeft, setState]);

  const resetTimer = useCallback(() => {
    const now = Date.now();

    setState(prev => {
      if (prev.status === 'working' && prev.currentSession) {
        const session = { ...prev.currentSession, startTime: now };
        if (prev.phase === 'pomodoro_working' && session.pomodoroMinutes) {
          const target = pomodoroTargetMs(session);
          setPomodoroLeft(target);
          setElapsed(0);
        } else if (session.type === 'open' && session.countdownTargetMs && session.countdownStartTime) {
          session.countdownStartTime = now;
          setOpenCountdownLeft(session.countdownTargetMs);
          setElapsed(0);
        } else {
          setElapsed(0);
          setPomodoroLeft(null);
        }
        return { ...prev, timerPaused: false, currentSession: session };
      }

      if (prev.status === 'on_break' && prev.currentBreak) {
        const brk = { ...prev.currentBreak, startTime: now };
        if (prev.phase === 'pomodoro_break' && brk.durationMinutes) {
          setBreakLeft(brk.durationMinutes * 60 * 1000);
        }
        return { ...prev, timerPaused: false, currentBreak: brk };
      }

      return prev;
    });
  }, [setState]);

  const editTimer = useCallback(
    (targetMs: number) => {
      const ms = Math.max(0, Math.round(targetMs));
      const now = Date.now();

      setState(prev => {
        if (prev.status === 'working' && prev.currentSession) {
          const session = { ...prev.currentSession };
          if (prev.phase === 'pomodoro_working' && session.pomodoroMinutes) {
            const target = pomodoroTargetMs(session);
            const remaining = Math.min(ms, target);
            session.startTime = now - (target - remaining);
            setPomodoroLeft(remaining);
            setElapsed(now - session.startTime);
          } else {
            session.startTime = now - ms;
            setElapsed(ms);
          }
          return { ...prev, timerPaused: false, currentSession: session };
        }

        if (prev.status === 'on_break' && prev.currentBreak) {
          const brk = { ...prev.currentBreak };
          if (prev.phase === 'pomodoro_break' && brk.durationMinutes) {
            const target = brk.durationMinutes * 60 * 1000;
            const remaining = Math.min(ms, target);
            brk.startTime = now - (target - remaining);
            setBreakLeft(remaining);
          } else {
            brk.startTime = now - ms;
          }
          return { ...prev, timerPaused: false, currentBreak: brk };
        }

        return prev;
      });
    },
    [setState]
  );

  const setCountdownTimer = useCallback(
    (targetMs: number) => {
      const ms = Math.max(0, Math.round(targetMs));
      const now = Date.now();

      setState(prev => {
        if (prev.status === 'working' && prev.currentSession) {
          const session = { ...prev.currentSession };
          if (prev.phase === 'pomodoro_working' && session.pomodoroMinutes) {
            const target = pomodoroTargetMs(session);
            const remaining = Math.min(ms, target);
            session.startTime = now - (target - remaining);
            setPomodoroLeft(remaining);
            setElapsed(now - session.startTime);
          } else if (session.type === 'open') {
            session.countdownTargetMs = ms;
            session.countdownStartTime = now;
            setOpenCountdownLeft(ms);
          }
          return { ...prev, timerPaused: false, currentSession: session };
        }

        if (prev.status === 'on_break' && prev.currentBreak && prev.phase === 'pomodoro_break') {
          const brk = { ...prev.currentBreak };
          if (brk.durationMinutes) {
            const target = brk.durationMinutes * 60 * 1000;
            const remaining = Math.min(ms, target);
            brk.startTime = now - (target - remaining);
            setBreakLeft(remaining);
          }
          return { ...prev, timerPaused: false, currentBreak: brk };
        }

        return prev;
      });
    },
    [setState]
  );

  const setSessionLockMode = useCallback(
    (lockMode: FocusLockMode) => {
      setState(prev => {
        if (!prev.currentSession) return prev;
        return {
          ...prev,
          currentSession: { ...prev.currentSession, lockMode },
        };
      });
    },
    [setState]
  );

  const extendActiveCountdown = useCallback(
    (targetMs: number, lockMode: FocusLockMode, sessionNotes?: string) => {
      const ms = Math.max(0, Math.round(targetMs));
      const now = Date.now();

      setState(prev => {
        if (prev.status !== 'working' || !prev.currentSession || prev.currentSession.type !== 'open') {
          return prev;
        }
        const session = {
          ...prev.currentSession,
          countdownTargetMs: ms,
          countdownStartTime: now,
          startTime: now,
          lockMode,
          ...(sessionNotes != null ? { sessionNotes } : {}),
        };
        return { ...prev, timerPaused: false, currentSession: session };
      });
      setOpenCountdownLeft(ms);
      setElapsed(0);
    },
    [setState]
  );

  const updateCurrentSession = useCallback(
    (patch: Partial<WorkSession>) => {
      setState(prev => {
        if (!prev.currentSession) return prev;
        return { ...prev, currentSession: { ...prev.currentSession, ...patch } };
      });
    },
    [setState]
  );

  const setPendingData = useCallback(
    (data: Partial<WorkSession>) => {
      setState(prev => ({
        ...prev,
        pendingData: { ...prev.pendingData, ...data },
      }));
    },
    [setState]
  );

  const setPhase = useCallback(
    (phase: ConversationPhase) => {
      setState(prev => ({ ...prev, phase }));
    },
    [setState]
  );

  const reset = useCallback(() => {
    setState(initialState);
    setElapsed(0);
    setPomodoroLeft(null);
    setBreakLeft(null);
  }, [setState]);

  const getTodayStats = useCallback(() => {
    const todaySessions = sessions.filter(s => isSameLocalDay(s.startTime) && s.endTime);
    const todayBreaks = breaks.filter(b => isSameLocalDay(b.startTime) && b.endTime);

    let totalWorkMs = todaySessions.reduce((sum, s) => sum + sessionWorkMs(s), 0);
    let totalBreakMs = todayBreaks.reduce((sum, b) => sum + (b.endTime! - b.startTime), 0);

    const cs = state.currentSession;
    const csInArray = cs ? sessions.some(s => s.id === cs.id) : false;
    let activeSession: { project: string; workMs: number } | null = null;

    if (cs && !csInArray && isSameLocalDay(cs.startTime)) {
      const isPrep = isStuckPrepSessionNotes(cs.sessionNotes);
      const isInitialStuckChunk =
        isStuckWorkSessionNotes(cs.sessionNotes) && cs.countdownTargetMs === KICKSTART_DURATION_MS;
      const freezeLiveBar = isPrep || isInitialStuckChunk;

      if (!cs.endTime && (state.status === 'working' || state.status === 'on_break')) {
        if (freezeLiveBar) {
          activeSession = { project: cs.project, workMs: 0 };
        } else {
          const workMs = computeActiveWorkMs({
            session: cs,
            status: state.status,
            phase: state.phase,
            elapsed,
            pomodoroLeft,
            pomodoroPausedRemaining: state.pomodoroPausedRemaining ?? null,
            pausedWorkElapsed: state.pausedWorkElapsed ?? null,
          });
          totalWorkMs += workMs;
          activeSession = { project: cs.project, workMs };
        }
      } else if (cs.endTime) {
        totalWorkMs += sessionWorkMs(cs);
      }
    }

    if (state.currentBreak && !state.currentBreak.endTime && isSameLocalDay(state.currentBreak.startTime)) {
      totalBreakMs += Date.now() - state.currentBreak.startTime;
    }

    const allTodaySessions = [
      ...todaySessions,
      ...(cs && !csInArray && isSameLocalDay(cs.startTime) && cs.endTime ? [cs] : []),
    ];

    const projects: Record<string, { totalMs: number; count: number }> = {};
    for (const s of allTodaySessions) {
      if (!projects[s.project]) projects[s.project] = { totalMs: 0, count: 0 };
      projects[s.project].totalMs += sessionWorkMs(s);
      projects[s.project].count += 1;
    }
    if (activeSession) {
      if (!projects[activeSession.project]) projects[activeSession.project] = { totalMs: 0, count: 0 };
      if (activeSession.workMs > 0) {
        projects[activeSession.project].totalMs += activeSession.workMs;
      }
    }

    const projectStats = Object.entries(projects)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalMs - a.totalMs);

    const activeCountsAsSession = activeSession && activeSession.workMs > 0;
    const sessionCount = allTodaySessions.length + (activeCountsAsSession ? 1 : 0);

    return {
      totalWorkMs,
      totalBreakMs,
      sessionCount,
      sessions: allTodaySessions,
      activeSession,
      projectStats,
    };
  }, [
    sessions,
    breaks,
    state.currentSession,
    state.currentBreak,
    state.status,
    state.phase,
    state.pomodoroPausedRemaining,
    state.pausedWorkElapsed,
    elapsed,
    pomodoroLeft,
  ]);

  return {
    status: state.status as WorkStatus,
    phase: state.phase,
    currentSession: state.currentSession,
    currentBreak: state.currentBreak,
    pendingData: state.pendingData,
    pomodoroPausedRemaining: state.pomodoroPausedRemaining ?? null,
    pausedWorkElapsed: state.pausedWorkElapsed ?? null,
    timerPaused: state.timerPaused ?? false,
    elapsed,
    pomodoroLeft,
    breakLeft,
    openCountdownLeft,
    sessions,
    breaks,
    startSession,
    stopSessionTimer,
    endSession,
    finishWorkSession,
    continueStuckWorkSession,
    abortActiveSession,
    startBreak,
    endBreak,
    pauseTimer,
    resumeTimer,
    resetTimer,
    editTimer,
    setCountdownTimer,
    setSessionLockMode,
    extendActiveCountdown,
    updateCurrentSession,
    setPendingData,
    setPhase,
    reset,
    getTodayStats,
  };
}

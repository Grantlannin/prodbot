'use client';

import { useCallback } from 'react';
import { WorkSession, WorkStatus, WorkTrackerState } from '../types';
import { useLocalStorage } from './useLocalStorage';

function getTodayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const INITIAL_STATE: WorkTrackerState = {
  sessions: [],
  currentSession: null,
  accomplishments: [],
  status: 'idle',
};

export function useWorkTracker() {
  const [state, setState] = useLocalStorage<WorkTrackerState>('agentHQ_work', INITIAL_STATE);

  const todaySessions = state.sessions.filter(s => s.start >= getTodayStart());

  const startWork = useCallback(() => {
    setState(prev => {
      const now = Date.now();
      const sessions = [...prev.sessions];
      if (prev.currentSession) sessions.push({ ...prev.currentSession, end: now });
      const next: WorkSession = { id: makeId(), start: now, type: 'work' };
      return { ...prev, sessions, currentSession: next, status: 'working' };
    });
  }, [setState]);

  const startBreak = useCallback(() => {
    setState(prev => {
      const now = Date.now();
      const sessions = [...prev.sessions];
      if (prev.currentSession) sessions.push({ ...prev.currentSession, end: now });
      const next: WorkSession = { id: makeId(), start: now, type: 'break' };
      return { ...prev, sessions, currentSession: next, status: 'on_break' };
    });
  }, [setState]);

  const resumeWork = useCallback(() => startWork(), [startWork]);

  const stopTracking = useCallback(() => {
    setState(prev => {
      const now = Date.now();
      const sessions = [...prev.sessions];
      if (prev.currentSession) sessions.push({ ...prev.currentSession, end: now });
      return { ...prev, sessions, currentSession: null, status: 'done' };
    });
  }, [setState]);

  const addAccomplishment = useCallback((text: string) => {
    setState(prev => ({ ...prev, accomplishments: [...prev.accomplishments, text] }));
  }, [setState]);

  const getTotals = useCallback(
    (includeRunning = true) => {
      const today = getTodayStart();
      const todaySess = state.sessions.filter(s => s.start >= today);

      const allSessions =
        includeRunning && state.currentSession
          ? [...todaySess, { ...state.currentSession, end: Date.now() }]
          : todaySess;

      const workMs = allSessions
        .filter(s => s.type === 'work')
        .reduce((acc, s) => acc + ((s.end ?? Date.now()) - s.start), 0);

      const breakMs = allSessions
        .filter(s => s.type === 'break')
        .reduce((acc, s) => acc + ((s.end ?? Date.now()) - s.start), 0);

      return { workMs, breakMs };
    },
    [state.sessions, state.currentSession]
  );

  const resetDay = useCallback(() => {
    setState(INITIAL_STATE);
  }, [setState]);

  return {
    status: state.status as WorkStatus,
    sessions: todaySessions,
    currentSession: state.currentSession,
    accomplishments: state.accomplishments,
    startWork,
    startBreak,
    resumeWork,
    stopTracking,
    addAccomplishment,
    getTotals,
    resetDay,
  };
}

import type { WorkSession, ConversationPhase, WorkStatus } from './types';

export function pomodoroTargetMs(session: WorkSession): number {
  return (session.pomodoroMinutes || 25) * 60 * 1000;
}

/** Work ms for a saved or stopped session */
export function sessionWorkMs(session: WorkSession): number {
  if (session.accumulatedWorkMs != null) return session.accumulatedWorkMs;
  if (session.endTime) return session.endTime - session.startTime;
  return 0;
}

export interface ActiveWorkInput {
  session: WorkSession;
  status: WorkStatus;
  phase: ConversationPhase;
  elapsed: number;
  pomodoroLeft: number | null;
  pomodoroPausedRemaining: number | null;
  pausedWorkElapsed: number | null;
}

/** Work ms for the current in-progress session (excludes break time) */
export function computeActiveWorkMs(input: ActiveWorkInput): number {
  const { session, status, phase, elapsed, pomodoroLeft, pomodoroPausedRemaining, pausedWorkElapsed } = input;
  const base = session.accumulatedWorkMs ?? 0;

  if (session.type === 'pomodoro') {
    const target = pomodoroTargetMs(session);
    if (phase === 'pomodoro_working') {
      const remaining = pomodoroLeft ?? Math.max(0, target - elapsed);
      return base + Math.max(0, target - remaining);
    }
    if (phase === 'pomodoro_paused' && pomodoroPausedRemaining != null) {
      return base + Math.max(0, target - pomodoroPausedRemaining);
    }
    return base;
  }

  if (status === 'working') return base + elapsed;
  if (status === 'on_break') return base + (pausedWorkElapsed ?? 0);
  return base;
}

export function isSameLocalDay(timestamp: number, ref = Date.now()): boolean {
  return new Date(timestamp).toDateString() === new Date(ref).toDateString();
}

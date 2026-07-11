import { formatDurationShort, formatTimerHMS } from './chatLogic';
import type { ConversationPhase, WorkStatus } from './types';
import type { BreakSession, WorkSession } from './types';

export interface TimerDisplay {
  ms: number;
  mode: 'pomodoro' | 'break' | 'open';
  label: string;
  project: string | null;
  countingDown: boolean;
}

function pomodoroTargetMs(session: WorkSession): number {
  return (session.pomodoroMinutes || 25) * 60 * 1000;
}

function pomodoroRemainingFromSession(session: WorkSession, now = Date.now()): number {
  return Math.max(0, pomodoroTargetMs(session) - (now - session.startTime));
}

function breakRemainingMs(breakSession: BreakSession, breakLeft: number | null, now = Date.now()): number {
  if (!breakSession.durationMinutes) return breakLeft ?? 0;
  const target = breakSession.durationMinutes * 60 * 1000;
  return Math.max(0, breakLeft ?? target - (now - breakSession.startTime));
}

export function getTimerDisplay(input: {
  status: WorkStatus;
  phase: ConversationPhase;
  elapsed: number;
  pomodoroLeft: number | null;
  breakLeft: number | null;
  pomodoroPausedRemaining: number | null;
  pausedWorkElapsed: number | null;
  openCountdownLeft: number | null;
  currentSession: WorkSession | null;
  currentBreak: BreakSession | null;
  timerPaused?: boolean;
}): TimerDisplay | null {
  const {
    status,
    phase,
    elapsed,
    pomodoroLeft,
    breakLeft,
    pomodoroPausedRemaining,
    pausedWorkElapsed,
    openCountdownLeft,
    currentSession,
    currentBreak,
  } = input;

  if (
    currentSession?.type === 'open' &&
    !currentSession.endTime &&
    (status === 'working' || status === 'on_break')
  ) {
    const hasCountdown =
      currentSession.countdownTargetMs != null && currentSession.countdownStartTime != null;

    if (hasCountdown && status === 'working') {
      const target = currentSession.countdownTargetMs!;
      const remaining =
        openCountdownLeft != null
          ? openCountdownLeft
          : Math.max(0, target - (Date.now() - (currentSession.countdownStartTime ?? Date.now())));
      return {
        ms: remaining,
        mode: 'open',
        label: '',
        project: currentSession.project,
        countingDown: true,
      };
    }

    if (hasCountdown && status === 'on_break') {
      const remaining = openCountdownLeft ?? currentSession.countdownTargetMs!;
      return {
        ms: remaining,
        mode: 'open',
        label: '',
        project: currentSession.project,
        countingDown: true,
      };
    }

    const ms = status === 'on_break' ? (pausedWorkElapsed ?? elapsed) : elapsed;
    return {
      ms,
      mode: 'open',
      label: '',
      project: currentSession.project,
      countingDown: false,
    };
  }

  if (
    (phase === 'pomodoro_working' || phase === 'pomodoro_paused') &&
    currentSession?.type === 'pomodoro'
  ) {
    const ms =
      phase === 'pomodoro_paused' && pomodoroPausedRemaining != null
        ? pomodoroPausedRemaining
        : pomodoroLeft ?? pomodoroRemainingFromSession(currentSession);

    return {
      ms,
      mode: 'pomodoro',
      label: '',
      project: null,
      countingDown: true,
    };
  }

  if (phase === 'pomodoro_break' && currentBreak?.durationMinutes) {
    return {
      ms: breakRemainingMs(currentBreak, breakLeft),
      mode: 'break',
      label: '',
      project: null,
      countingDown: true,
    };
  }

  return null;
}

export function formatTimerDisplay(display: TimerDisplay): string {
  return display.countingDown ? formatTimerHMS(display.ms) : formatDurationShort(display.ms);
}

export function timerTitle(display: TimerDisplay): string {
  return formatTimerDisplay(display);
}

export type TimerCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export const CORNER_STYLES: Record<TimerCorner, { bottom?: number; top?: number; left?: number; right?: number }> = {
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-right': { top: 72, right: 16 },
  'top-left': { top: 72, left: 16 },
};

export const CORNER_CYCLE: TimerCorner[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];

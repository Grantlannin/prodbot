import type { ChatMessage, Infraction, WorkSession } from './types';
import { infractionCategoriesInOrder, startOfLocalDayMs } from './infractions';
import { sessionWorkMs } from './workTime';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createAgentMessage(content: string, variant?: ChatMessage['variant']): ChatMessage {
  return {
    id: makeId(),
    role: 'agent',
    content,
    timestamp: Date.now(),
    variant,
  };
}

export function createUserMessage(content: string): ChatMessage {
  return {
    id: makeId(),
    role: 'user',
    content,
    timestamp: Date.now(),
  };
}

export function parseStartShorthand(input: string): { energy?: number; focus?: number; estimate?: number } | null {
  const match = input.match(/^(?:start|go|begin)\s+(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?$/i);
  if (!match) return null;

  const energy = parseInt(match[1], 10);
  const focus = parseInt(match[2], 10);
  const estimate = match[3] ? parseInt(match[3], 10) : undefined;

  if (energy < 1 || energy > 10 || focus < 1 || focus > 10) return null;
  if (estimate !== undefined && estimate < 1) return null;

  return { energy, focus, estimate };
}

export function parsePomoShorthand(input: string): { workMinutes: number; breakMinutes?: number } | null {
  const match = input.match(/^(?:pomo|pomodoro)\s+(\d+)(?:\s*,\s*(\d+))?$/i);
  if (!match) return null;

  const workMinutes = parseInt(match[1], 10);
  const breakMinutes = match[2] ? parseInt(match[2], 10) : undefined;

  if (workMinutes < 1 || workMinutes > 180) return null;
  if (breakMinutes !== undefined && (breakMinutes < 1 || breakMinutes > 60)) return null;

  return { workMinutes, breakMinutes };
}

export function parseRating(input: string): number | null {
  const num = parseInt(input.trim(), 10);
  if (isNaN(num) || num < 1 || num > 10) return null;
  return num;
}

export function parseMinutes(input: string): number | null {
  const num = parseInt(input.trim(), 10);
  if (isNaN(num) || num < 1) return null;
  return num;
}

export type Intent =
  | { type: 'start' }
  | { type: 'start_shorthand'; energy: number; focus: number; estimate?: number }
  | { type: 'pomodoro'; workMinutes?: number; breakMinutes?: number }
  | { type: 'quick' }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'continue' }
  | { type: 'decline' }
  | { type: 'status' }
  | { type: 'help' }
  | { type: 'eod' }
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | { type: 'unknown' };

/** Full-message matches (trimmed, lowercased). Checked in detectIntent order. */
const START_COMMANDS: RegExp[] = [
  /^start$/,
  /^starting$/,
  /^start work$/,
  /^starting work$/,
  /^start timer$/,
  /^start work timer$/,
  /^working now$/,
  /^starting now$/,
  /^beginning$/,
  /^beginning work$/,
  /^begin$/,
  /^begin work$/,
  /^go$/,
  /^go work$/,
  /^going$/,
  /^working$/,
  /^start(?:ing)?(?:\s+(?:work|tracking|trackign))?$/,
  /^let'?s start$/,
  /^lets start$/,
  /^time to work$/,
  /^clock in$/,
];

const PAUSE_COMMANDS: RegExp[] = [
  /^pause$/,
  /^hold$/,
  /^break$/,
  /^rest$/,
  /^breaking$/,
  /^break time$/,
  /^taking break$/,
  /^taking a break$/,
  /^on break$/,
  /^pausing$/,
];

const STOP_COMMANDS: RegExp[] = [
  /^stop$/,
  /^done$/,
  /^done working$/,
  /^finished working$/,
  /^finish$/,
  /^finished$/,
  /^end$/,
  /^complete$/,
  /^stop work$/,
  /^stop working$/,
  /^end session$/,
  /^end work$/,
  /^end work session$/,
  /^done for now$/,
  /^i'?m done$/,
  /^im done$/,
  /^all done$/,
];

const CONFIRM_COMMANDS: RegExp[] = [
  /^yes$/,
  /^y$/,
  /^confirm$/,
  /^save$/,
  /^save report$/,
  /^looks good$/,
  /^correct$/,
];

export function isConfirmCommand(normalized: string): boolean {
  return CONFIRM_COMMANDS.some(p => p.test(normalized));
}

function matchesAny(normalized: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(normalized));
}

export function detectIntent(input: string): Intent {
  const normalized = input.toLowerCase().trim();

  const startShorthand = parseStartShorthand(input);
  if (startShorthand) {
    return {
      type: 'start_shorthand',
      energy: startShorthand.energy!,
      focus: startShorthand.focus!,
      estimate: startShorthand.estimate,
    };
  }

  const pomoShorthand = parsePomoShorthand(input);
  if (pomoShorthand) {
    return {
      type: 'pomodoro',
      workMinutes: pomoShorthand.workMinutes,
      breakMinutes: pomoShorthand.breakMinutes,
    };
  }

  if (/^(quick|quickstart)$/i.test(normalized)) {
    return { type: 'quick' };
  }

  if (/^(?:no|nope|nah|skip|nothing|none)$/i.test(normalized)) {
    return { type: 'decline' };
  }

  if (/^(?:eod|end of day|end-of-day)$/i.test(normalized)) {
    return { type: 'eod' };
  }

  if (matchesAny(normalized, STOP_COMMANDS)) {
    return { type: 'stop' };
  }

  if (matchesAny(normalized, PAUSE_COMMANDS)) {
    return { type: 'pause' };
  }

  if (matchesAny(normalized, START_COMMANDS)) {
    return { type: 'start' };
  }

  if (/^(?:pomo|pomodoro|start\s+pomodoro)$/i.test(normalized)) {
    return { type: 'pomodoro' };
  }

  if (/^(continue|resume|back|more)$/i.test(normalized)) {
    return { type: 'continue' };
  }

  if (/^(status|time|how long|progress)$/i.test(normalized)) {
    return { type: 'status' };
  }

  if (/^(help|commands|\?)$/i.test(normalized)) {
    return { type: 'help' };
  }

  const num = parseRating(normalized) || parseMinutes(normalized);
  if (num !== null) {
    return { type: 'number', value: num };
  }

  if (normalized.length > 0) {
    return { type: 'text', value: input.trim() };
  }

  return { type: 'unknown' };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatDurationShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Always H:MM:SS — e.g. 0:04:05 under an hour, 1:01:23 over an hour. */
export function formatTimerHMS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function minutesToTimerHMS(minutes: number): string {
  return formatTimerHMS(Math.max(0, minutes) * 60 * 1000);
}

export function formatHoursWorked(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  const rounded = Math.round(hours * 10) / 10;
  return `${formatDuration(ms)} (${rounded} hour${rounded === 1 ? '' : 's'})`;
}

export interface EodReportInput {
  completed: string;
  tomorrow: string;
  learnings: string;
  totalWorkMs: number;
  totalBreakMs: number;
  sessionCount: number;
  sessions: WorkSession[];
  infractions: Infraction[];
  activeSession?: { project: string; elapsedMs: number } | null;
}

export function buildEodReport(input: EodReportInput): string {
  const sessionLines: { project: string; durationMs: number; inProgress?: boolean }[] = input.sessions.map(s => ({
    project: s.project,
    durationMs: sessionWorkMs(s),
  }));

  if (input.activeSession) {
    sessionLines.push({
      project: input.activeSession.project,
      durationMs: input.activeSession.elapsedMs,
      inProgress: true,
    });
  }

  const t0 = startOfLocalDayMs(Date.now());
  const infractionsToday = input.infractions.filter(i => startOfLocalDayMs(i.createdAt) === t0);
  const infractionCategories = infractionCategoriesInOrder(infractionsToday);

  const lines: string[] = [
    'END OF DAY REPORT',
    '─────────────────',
    '',
    `Work time: ${formatHoursWorked(input.totalWorkMs)}`,
    `Break time: ${formatDuration(input.totalBreakMs)}`,
    `Sessions: ${input.sessionCount}`,
    '',
    'What I got completed:',
    input.completed,
    '',
    'What I need to do tomorrow:',
    input.tomorrow,
    '',
    'Learnings / insights:',
    input.learnings,
  ];

  if (sessionLines.length > 0) {
    lines.push('', 'Tracked sessions:');
    for (const s of sessionLines) {
      const suffix = s.inProgress ? ' — in progress' : '';
      lines.push(`• ${s.project} — ${formatDuration(s.durationMs)}${suffix}`);
    }
  }

  if (infractionCategories.length > 0) {
    lines.push('', `Infractions (${infractionsToday.length}):`);
    for (const c of infractionCategories) {
      lines.push(`• ${c.label}${c.count > 1 ? ` ×${c.count}` : ''}`);
    }
  }

  return lines.join('\n');
}

export const responses = {
  greeting:
    "Ready. Say 'start' to pick a task and begin — the hover timer opens when your session starts.",

  askProject:
    'What are you working on? (this is for your EOD)',
  askTaskNotes:
    'Do you want to add any notes/context for this specific task? (These will be stored in task notes)',
  sessionStarted: 'Session started.',
  taskNotesSaved: 'Notes saved to task notes.',

  trackingTime: (project: string) => `Tracking time. Working on: ${project}.`,
  pomodoroTrackingStarted: (project: string, minutes: number) =>
    `Tracking time. Working on: ${project}. ${minutes} minute focus block started.`,
  sessionEnded: (duration: string, project: string) => `Session complete. ${duration} logged for "${project}".`,

  pomodoroCountdown: (n: number) => `${n}...`,
  pomodoroStarted: (minutes: number) => `${minutes} minute focus block started.`,
  pomodoroWorkComplete: (workMinutes: number, breakMinutes: number) =>
    `${workMinutes} minutes complete. Starting a ${breakMinutes} minute break.`,
  pomodoroBreakComplete: (workMinutes: number) =>
    `Break over. Starting your next ${workMinutes} minute focus block.`,

  timerPaused: 'Timer paused. Say continue to resume.',
  timerResumed: 'Timer resumed.',

  noted: 'Noted.',
  logged: 'Logged.',
  awaiting: 'Awaiting your next command.',

  eodInitiated: 'End of day — let’s capture today’s report.',
  eodStats: (work: string, breakTime: string, sessions: number, infractionSummary: string) =>
    `Today — Work: ${work} · Break: ${breakTime} · Sessions: ${sessions}${infractionSummary ? ` · Infractions: ${infractionSummary}` : ''}`,
  eodAskCompleted: (prefill?: string) =>
    prefill
      ? `What did you get done today? (You logged: ${prefill})`
      : 'What did you get done today?',
  eodAskTracking:
    'Here are the habits and management items you track. Tap one to add today’s metrics or notes. Say continue when you’re done.',
  eodAskTrackingNotes: (name: string, detail?: string) =>
    detail
      ? `What metrics or notes for “${name}”? (${detail})`
      : `What metrics or notes for “${name}”?`,
  eodTrackingSaved: (name: string) => `Saved notes for “${name}”. Tap another item or say continue.`,
  eodAskLearnings: 'Any insights or learnings from today?',
  eodConfirmPrompt: 'Save this report? Reply yes to confirm or no to cancel.',
  eodCancelled: 'EOD cancelled. Say eod when you’re ready to try again.',
  eodSaved:
    'Report saved. Open Dashboard → Reports (calendar icon) to preview, pin, or download as Text, Word, CSV, or JSON.',

  status: (workMs: number, sessionCount: number) =>
    `Today: ${formatDuration(workMs)} tracked across ${sessionCount} session${sessionCount === 1 ? '' : 's'}.`,

  help: `Commands:
• Start work — start, starting, start work, working now, beginning, start timer, going, clock in…
• Pause — pause, break, taking a break, break time…
• End session — stop, done, done working, finished working, end session…
• continue / resume — unpause or return from pomodoro break
• pomodoro — 25 min focus block (pick a task after)
• status — today's stats
• eod — end-of-day report
• infraction - phone — log a distraction`,

  invalidMinutes: 'Please enter a number (minutes).',
  notWorking: "No active session. Type 'start' to begin.",
  alreadyWorking: (project: string) => `Already working on "${project}". Type 'stop' to end.`,
};

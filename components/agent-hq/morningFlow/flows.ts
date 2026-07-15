import type { NightPrepTomorrowTask } from '../nightPrep/storage';

export interface MorningFlowChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export const SIMULATED_MORNING_TASKS: NightPrepTomorrowTask[] = [
  {
    projectId: 'morning-test-p1',
    projectName: 'Test project',
    taskId: 'morning-test-t1',
    taskText: 'Ship morning flow',
  },
  {
    projectId: 'morning-test-p2',
    projectName: 'Admin',
    taskId: 'morning-test-t2',
    taskText: 'Review inbox',
  },
];

export const MORNING_FLOW_COPY = {
  beginButton: 'begin work',
  beginTest: 'begin work (test)',
  resetTest: 'reset morning flow (test)',
  testModeOn: 'Morning flow test mode on — button stays visible and you can run it repeatedly.',
  headerTitle: 'begin work',
  clearChat: 'clear chat',
  introGreeting: (name: string) => `hey ${name}. Let's begin your work day.`,
  introTaskList: (lines: string) =>
    `This is your task list for the day based on what you prepared:\n\n${lines}\n\nPlease choose the one you'd like to begin with.`,
  chooseTimer: 'please choose your timer length',
  chooseLock: 'Choose lock mode',
  busy: 'You already have a session running. Stop it first to start something new.',
  lockHints: {
    none: 'End the session anytime — no cooldown or escape flow.',
    soft: 'End early after a 2-minute wait and confirmation.',
    hard: 'No normal early end — hold 10s and type a phrase to escape.',
  },
} as const;

export const TIMER_PRESETS = [15, 25, 30, 45, 60, 90] as const;

export type MorningFlowPhase =
  | 'intro'
  | 'task_pick'
  | 'timer_pick'
  | 'lock_pick'
  | 'complete';

export type MorningTimerChoice =
  | { kind: 'countdown'; minutes: number }
  | { kind: 'pomodoro'; workMinutes: number; breakMinutes: number };

export interface MorningFlowState {
  phase: MorningFlowPhase;
  messages: MorningFlowChatMessage[];
  tasks: NightPrepTomorrowTask[];
  selectedTask: NightPrepTomorrowTask | null;
  timerChoice: MorningTimerChoice | null;
}

export function formatMorningTaskList(tasks: NightPrepTomorrowTask[]): string {
  return tasks
    .map(t => {
      const text = t.taskText.trim();
      const project = t.projectName.trim();
      return project ? `• ${text} (${project})` : `• ${text}`;
    })
    .join('\n');
}

import type { NightPrepTomorrowTask } from '../nightPrep/storage';

export interface MorningFlowChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export const MORNING_FLOW_COPY = {
  beginButton: 'begin work',
  headerTitle: 'begin work',
  clearChat: 'clear chat',
  introTaskList: (lines: string) =>
    `This is your task list for the day based on what you prepared:\n\n${lines}\n\nPlease choose the one you'd like to begin with.`,
  phoneConfirm:
    "great. please confirm your phone is in another room. If not, i'll wait here for you to put it out of reach.",
  phoneConfirmYes: 'yes',
  chooseTimer: 'please choose your timer length',
  chooseLock: 'Choose lock mode',
  busy: 'You already have a session running. Stop it first to start something new.',
} as const;

export const TIMER_PRESETS = [15, 25, 30, 45, 60, 90] as const;

export type MorningFlowPhase =
  | 'intro'
  | 'task_pick'
  | 'phone_confirm'
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

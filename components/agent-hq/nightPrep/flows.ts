import type { WindDownItem } from './windDownItems';
import { windDownItemLabel } from './windDownItems';
import type { NightPrepTomorrowTask } from './storage';

export interface NightPrepChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export const WIND_DOWN_FLOW_COPY = {
  windDownButton: 'wind down',
  reflectIntro:
    "Let's begin your wind down. What did you objectively get done today?\n& was that the best use of your time? Reflect below.",
  didntGetDone: "i didn't get done what I wanted to",
  missedWhy:
    "Happens, let's figure out why & build a system around it. What happened? analyze as best as you can.",
  missedPrep:
    'Got it. What will you need to make sure you do tomorrow from a prep, management, or system perspective to not allow it to happen again tomorrow?',
  missedClose: "Great. Tomorrow is a new day. let it go & dominate tomorrow. I'll be ready.",
  confirmBestUse: 'to confirm, was this the best use of your time?',
  yes: 'yes',
  no: 'no',
  betterUse: 'what would have been a more effective usage of time? analyze here.',
  betterUseNoted:
    'Noted. you can send that to yourself via email in the EOD if you want so you have it. Now before we organize for tomorrow, first thing we want to do is add specific context to everything you did today. If you don\'t want to add context, just click "no context. Next". Make sure your notes are specific enough to understand tomorrow, or you will pay the \'clarity tax\'. Staying organized will keep you a beast. Let\'s begin.',
  contextIntro:
    'great. Now before we organize for tomorrow, first thing we want to do is add specific context to everything you did today. If you don\'t want to add context, just click "no context. Next". Make sure your notes are specific enough to understand tomorrow, or you will pay the \'clarity tax\'. Staying organized will keep you a beast. Let\'s begin.',
  noContextNext: 'no context. Next',
  taskPrompt: (label: string) => `What context do you want to leave for "${label}"?`,
  emptyLogged:
    'I noticed you have nothing logged. Would you like to begin prepping for tomorrow?',
  emptyYes: 'yes',
  emptyNo: 'no',
  prepIntro:
    'great. Context added. Now let\'s prep your tasks/work for tomorrow, so you can begin quickly & clearly',
  prepIntroAfterMissed:
    "Now let's prep your tasks/work for tomorrow, so you can begin quickly & clearly",
  qFirstBlockTime: 'roughly what time are you putting in your 1st work block tomorrow?',
  qWorkLocation: 'where are you going to be doing this work?',
  qWhatWorkingOn:
    'Great. Now let\'s figure out what you\'re working on. For the "perfect task list", we can use a 2-question seqeunce. You can first ask yourself "what, if finished tomorrow, would make me feel like it was a productive day?". The 2nd question is "do i have high confidence that i can finish these?". The best task lists make you feel good, and are manageable.',
  chooseProject: 'choose project',
  inputProject: 'create project',
  addNewTask: 'add new task into this project',
  addAnotherTask: 'add task from another project to task list',
  taskListFinished: 'task list finished',
  doneSeeTomorrow: (time: string) => `great. See you tomorrow around ${time}.`,
  closeChat: 'close chat',
  clearChat: 'clear chat',
  projectNamePlaceholder: 'Project name',
  taskNamePlaceholder: 'New task for this project',
} as const;

export type NightPrepFlowPhase =
  | 'wind_down_reflect'
  | 'wind_down_missed_why'
  | 'wind_down_missed_prep'
  | 'wind_down_best_use_confirm'
  | 'wind_down_better_use'
  | 'wind_down_item'
  | 'empty_logged_prompt'
  | 'prep_time'
  | 'prep_location'
  | 'prep_project_mode'
  | 'prep_project_pick'
  | 'prep_project_name'
  | 'prep_task_pick'
  | 'prep_task_name'
  | 'prep_after_task'
  | 'complete';

export type NightPrepProjectMode = 'choose' | 'input' | null;

export interface NightPrepFlowState {
  phase: NightPrepFlowPhase;
  messages: NightPrepChatMessage[];
  windDownItems: WindDownItem[];
  windDownIndex: number;
  firstWorkBlockTime: string;
  workLocation: string;
  projectMode: NightPrepProjectMode;
  projectId: string;
  projectName: string;
  taskId: string;
  taskText: string;
  tomorrowTasks: NightPrepTomorrowTask[];
  /** Objective done-today reflection before best-use confirm */
  doneReflection: string;
  /** Missed-path: what happened */
  missedWhy: string;
  /** Missed-path: prep/system for tomorrow */
  missedPrep: string;
  /** What would have been a better use of time */
  betterUseOfTime: string;
}

export { windDownItemLabel };

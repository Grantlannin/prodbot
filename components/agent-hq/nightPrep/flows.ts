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
  intro:
    'Let\'s begin your wind down. The first thing we want to do is add specific context to everything you did today. If you don\'t want to add context, just click "no context. Next". Make sure your notes are specific enough to understand tomorrow, or you will pay the \'clarity tax\'. Staying organized will keep you a beast. Let\'s begin.',
  noContextNext: 'no context. Next',
  taskPrompt: (label: string) => `What context do you want to leave for "${label}"?`,
  emptyLogged:
    'I noticed you have nothing logged. Would you like to begin prepping for tomorrow?',
  emptyYes: 'yes',
  emptyNo: 'no',
  prepIntro:
    'great. Context added. Now let\'s prep your tasks/work for tomorrow, so you can begin quickly & clearly',
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
  | 'wind_down_intro'
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
}

export { windDownItemLabel };

export type StuckHelpPath =
  | 'starting'
  | 'organizing'
  | 'structure'
  | 'finishing'
  | 'grounding';

export const STUCK_HELP_OPTIONS: { id: StuckHelpPath; label: string }[] = [
  { id: 'starting', label: "I'm having trouble starting" },
  { id: 'organizing', label: 'im having trouble organizing my task list today' },
  { id: 'structure', label: "I'm having trouble giving myself daily structure" },
  { id: 'finishing', label: "I'm having trouble finishing & putting this out there" },
  {
    id: 'grounding',
    label:
      "I'm feeling like I missed my window for the day or the day is too far gone. Help ground me.",
  },
];

export const STUCK_HELP_NAV_BUTTON = "i'm stuck, help me bot";

export const STUCK_PREP_NOTES_PREFIX = 'stuck-help:prep';
export const STUCK_WORK_NOTES_PREFIX = 'stuck-help:work';
/** Continued sessions after kickstart — time-only, no user task attached */
export const STUCK_POST_PREP_WORK_PROJECT = 'postprepwork';

export function isStuckPrepSessionNotes(notes: string | null | undefined): boolean {
  return !!notes?.startsWith(STUCK_PREP_NOTES_PREFIX);
}

export function isStuckWorkSessionNotes(notes: string | null | undefined): boolean {
  return !!notes?.startsWith(STUCK_WORK_NOTES_PREFIX);
}

export function isStuckPostPrepContinueSession(
  session: { sessionNotes?: string | null; project?: string } | null | undefined
): boolean {
  if (!session) return false;
  return (
    session.project === STUCK_POST_PREP_WORK_PROJECT ||
    !!session.sessionNotes?.includes('postprepwork')
  );
}

export const STARTING_FLOW_COPY = {
  intro:
    'Easy fix. We need to figure out the most important task, break it down, & create a 5-minute timer to get the ball rolling. We’ll do this together. If nothing else today, we will have the most baller/productive 5 minutes ever. This will be fun, and productive.',
  q1: 'what is the most important next task we need to knock down?',
  q2:
    "Great. Now let's figure out the prep required to complete this task. If you only had 5 minutes to prepare this task so you could do it with minimal friction when you were fully ready, how would you prepare it? If insure how to prepare it, grab the course ",
  q2CourseLinkLabel: 'here:',
  /** Set via NEXT_PUBLIC_PREP_COURSE_URL when available */
  prepCourseUrl:
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PREP_COURSE_URL : undefined) ?? '',
  prepReady:
    'Awesome. Now let\'s actually prep it. I\'m going to create a 5-minute timer right now with a hard lock, and i want you to take 5 minutes and get everything set up to complete it. Open the tabs, log into the accounts, and get everything ready/set up. Are you ready to begin prepping? This will be worth it. If you finish before the 5 minutres, just click "done prepping" and let me know.',
  qChunks:
    'great. at this point the task should be prepped. If not, do that right now. Assuming it is, let\'s now break this task down into 3 chunks. If you were forced to separate this specific task into 3 separate chunks, what would those chunks be?',
  chunkWorkReady:
    'great. Now let\'s only focus on chunk #1 & put in a good 5 minutes on it. Completing chunk #1 (or moving the ball forward) is tremendously better than nothing, especially since you\'ve already prepped for it. Can you commit to just doing 5 minutes on the 1st chunk of this task right now? Remember, there is no other higher ROI activity for your progress that you could be doing right now. This is it. This is the real sh*t that will get you what you want. Everyone else quits right here, and doing this right now, in these moments, is your competitive advantage. Ready to put in 5 good minutes on this chunk?',
  yesBegin: 'YES',
  prepTimerLabel: 'prep timer',
  donePrepping: 'done prepping',
  prepStopConfirm: 'do you want to stop the prep process?',
  prepStopYes: 'yes',
  prepStopNo: 'no',
  completeTitle: 'should we just keep going?',
  completeYes: 'Yes',
  completeNo: 'no, end it now',
  keepGoing: 'keep going',
  close: 'close',
  logged: 'Ok, great 5 minute session. Session logged.',
} as const;

export const KICKSTART_DURATION_PRESETS = [5, 10, 15, 25, 30, 45, 60, 90] as const;

export const KICKSTART_MINUTES = 5;
/** TEMP: 10s for testing — restore to KICKSTART_MINUTES * 60 * 1000 before shipping */
export const KICKSTART_DURATION_MS = 10_000;

export type StartingFlowPhase =
  | 'await_task'
  | 'await_prep_plan'
  | 'await_prep_yes'
  | 'await_chunks'
  | 'await_chunk_yes';

export type StuckChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  link?: { label: string; href: string };
};

export interface StartingFlowState {
  phase: StartingFlowPhase;
  messages: StuckChatMessage[];
  importantTask: string;
  prepPlan: string;
  chunks: string;
}

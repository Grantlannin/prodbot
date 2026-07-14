import type { DayBlock } from './dailyStructureUtils';

export type StuckHelpPath =
  | 'starting'
  | 'organizing'
  | 'structure'
  | 'finishing'
  | 'grounding';

export const STUCK_HELP_OPTIONS: { id: StuckHelpPath; label: string }[] = [
  { id: 'starting', label: "I'm having trouble starting" },
  { id: 'organizing', label: 'im having trouble organizing my task list today' },
  { id: 'structure', label: 'lets quickly build my day' },
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
    !!session.sessionNotes?.includes('postprepwork') ||
    !!session.sessionNotes?.includes(`${STUCK_WORK_NOTES_PREFIX}:extended`)
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
  completeBody:
    "Nice work — you put in the full kickstart block. Might as well throw down another 15. You're already here. The world can wait for you to grind here for a sec.",
  completeYes: 'Yes',
  completeNo: 'no, end it now',
  keepGoing: 'keep going',
  close: 'close',
  logged: 'Ok, great 5 minute session. Session logged.',
} as const;

export const KICKSTART_DURATION_PRESETS = [5, 10, 15, 25, 30, 45, 60, 90] as const;

export const KICKSTART_MINUTES = 5;
/** TEMP: 10s for testing — restore to KICKSTART_MINUTES * 60 * 1000 before shipping */
/** TEMP: 5s for testing — restore to KICKSTART_MINUTES * 60 * 1000 before shipping */
export const KICKSTART_DURATION_MS = 5_000;

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

export const ORGANIZING_FLOW_COPY = {
  intro:
    "Ok, great. let's tee-up the most important task for you right now & get you organized quickly.",
  qProject: 'What project/goal are you working on?',
  qMvp:
    'Great. Now, take a second and think about what can get us to the finish line for this project in 48 hours with the most ghetto MVP (minimum viable product) imaginable. It just needs to WORK, not be pretty. Thinking/overanalyzing gets us nothing, shitty action gets us everything. So if we HAD to get this finished & "up" or "in motion" in 48 hrs (product launched, outreach message sent, funnel finished, thing completed etc), what are the 2 single most important things we\'d work on or do? (Enter them 1 by 1)',
  doneAddingTasks: 'done adding tasks',
  qHardest:
    "Great. Now - let's choose the hardest part of what we just wrote & and quickly prep it so when we start there's zero friction for us. We're not doing it yet, we're just going to set it up for when we're ready to do it. What is the hardest part? (Also note, one task may be required to be finished first because others are dependent on it. Obviously do that one first.",
  prepManual:
    "Really? That's easy af. You're way bigger than that little task. Okay - let's go ahead and get everything set up to complete this task. Open required windows, get necessary documents, log into accounts, get yourself in position. Go ahead and do that now, i'll wait for you. Then click \"done prepping\" when you're done prepping it.",
  donePrepping: 'done prepping',
  kickstartReady:
    "Welp, here we are. You've identified the most important task & you've just prepped it perfectly. Let's just put in 5 minutes on this thing like a psycho. We don't need to finish it, let's just put in the best 5 minutes imaginable, right here right now. There's nothing else to do, this is the exact moment where your dream life is carved. Win these, and you're balling. Most quit here. Also - i'm pumped lol - so let's destroy this f***** thing. Click \"I literally give zero f*cks & i'm taking imperfect action right now\" & i'll start a 5-minute timer with a hard lock for you. Let's rock this.",
  kickstartYes: "I literally give zero f*cks & i'm taking imperfect action right now",
  chooseProject: 'choose project',
  inputProject: 'input project',
  projectNamePlaceholder: 'Project name',
  addTaskPlaceholder: 'Add a task',
  noSavedProjects: 'No saved projects yet — use input project to add one.',
  clearChat: 'clear chat',
} as const;

export type OrganizingFlowPhase =
  | 'await_project_mode'
  | 'await_project_pick'
  | 'await_project_name'
  | 'await_mvp_tasks'
  | 'await_hardest_pick'
  | 'await_manual_prep'
  | 'await_kickstart_yes';

export type OrganizingProjectMode = 'choose' | 'input' | null;

export interface OrganizingFlowState {
  phase: OrganizingFlowPhase;
  messages: StuckChatMessage[];
  projectMode: OrganizingProjectMode;
  projectId: string;
  projectName: string;
  taskTexts: string[];
  hardestTask: string;
}

export const STRUCTURE_FLOW_COPY = {
  intro:
    "No worries. let's create that for you now & create some space. Here's what we're about to plug in:\n\n- Your big time commitments that are already scheduled in that you cant change (job, appointment, meeting etc)\n- Any smaller things (open loops) that also have to get done today specifically (text johnny back, send a package, etc that are dragging your attention/mental space)\n- The important work blocks we want to add in",
  qCommitments:
    'The first thing we need to do is plug in the large set-in-stone time commitments today that are unavoidable and already scheduled in. What hours of the day today are you already time-committed? (job, appointment, etc). List them out so we know what we have to work around. Type the name and times (e.g. Job 9am-5pm).',
  doneCommitments: 'done with commitments',
  doneOpenLoops: 'done with open loops',
  openLoopsIntro:
    "Awesome. Now that we know what you HAVE to do, we can now design your day. We already have your mandatory pre-committed blocks added, now let's add in the necessary open loops tugging your attention.",
  qOpenLoops: 'what do you need to handle today that isn\'t "important work related"?',
  noOpenLoops: "i don't have any open loops",
  workIntro:
    'Great. Now that we have the open loops set in place as well as what you have to do, let\'s now add in "important work" blocks where they make sense. This should be an hour or 2, doesn\'t have to be crazy unless you want it to be. Go ahead and add those in where you see fit.',
  dayLooksGreat: 'this day looks great',
  addToGoogleCalendar: 'add to google calendar',
  organizingHint:
    'If you need help figuring out what to do in your work blocks later, use the "im having trouble organizing my task list today" chat.',
  namePlaceholder: 'Event name (e.g. Job)',
  timeRangePlaceholder: '9am-5pm',
  openLoopTimePlaceholder: '2pm or 2pm-2:15pm',
  quickEntryPlaceholder: 'Job 9am-5pm',
  openLoopQuickEntryPlaceholder: 'text johnny at 2pm',
  startTime: 'Start',
  endTime: 'End',
  addBlock: 'Add to day',
  clearChat: 'clear chat',
} as const;

export type StructureFlowPhase =
  | 'await_commitments'
  | 'await_open_loops'
  | 'await_work_blocks'
  | 'await_finish';

export interface StructureFlowState {
  phase: StructureFlowPhase;
  messages: StuckChatMessage[];
  blocks: DayBlock[];
}

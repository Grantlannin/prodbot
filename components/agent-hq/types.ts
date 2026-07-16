// ─────────────────────────────────────────────────────────
// AGENT HQ — Shared Types
// ─────────────────────────────────────────────────────────

export type FocusLockMode = 'soft' | 'hard' | 'none';

export interface WorkSession {
  id: string;
  project: string;
  startTime: number;
  endTime: number | null;
  estimateMinutes: number | null;
  energyBefore: number | null;
  focusBefore: number | null;
  productivityRating: number | null;
  blockers: string | null;
  sessionNotes: string | null;
  type: 'open' | 'pomodoro';
  pomodoroMinutes?: number;
  pomodoroBreakMinutes?: number;
  /** Total work ms excluding breaks (pomodoro multi-block or open with breaks) */
  accumulatedWorkMs?: number;
  /** Optional focus countdown (display); work time still tracks elapsed */
  countdownTargetMs?: number | null;
  countdownStartTime?: number | null;
  /** Soft = 2 min cooldown to end early; hard = hold + type to end early */
  lockMode?: FocusLockMode;
}

export interface BreakSession {
  id: string;
  startTime: number;
  endTime: number | null;
  durationMinutes?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  variant?: 'command' | 'report' | 'onboarding' | 'seed' | 'question' | 'countdown';
}

export interface BigGoal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  deadline?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'complete';
  createdAt: number;
}

export interface TaskContextLink {
  id: string;
  url: string;
  name?: string;
  createdAt: number;
}

export interface ProjectSubTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  notes?: string;
  contextLinks?: TaskContextLink[];
}

export interface ProjectTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  notes?: string;
  subTasks?: ProjectSubTask[];
  /** @deprecated migrated to contextLinks */
  docUrl?: string | null;
  contextLinks?: TaskContextLink[];
}

export interface ProjectLink {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface ProjectFileRef {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number;
  uploadedAt: number;
}

export interface ProjectPiece {
  id: string;
  label: string;
  context: string;
  linksNote: string;
  files: ProjectFileRef[];
  createdAt: number;
}

export interface ProjectWorkspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  kickoffNote: string;
  stateNow: string;
  justCompleted: string;
  nextUp: string;
  linksNote: string;
  notes: string;
  pieces: ProjectPiece[];
  tasks: ProjectTask[];
  links: ProjectLink[];
  files: ProjectFileRef[];
}

export interface ProblemItem {
  id: string;
  text: string;
  createdAt: number;
  projectId?: string;
}

export interface DoneTodayItem {
  id: string;
  text: string;
  detail?: string;
  source: 'project' | 'manual';
  projectId?: string;
  createdAt: number;
}

export interface OpenLoop {
  id: string;
  requirement: string;
  action: string;
  scheduledTime: string;
  resolved: boolean;
  createdAt: number;
}

export interface ImmediateTask {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface Infraction {
  id: string;
  categoryKey: string;
  label: string;
  createdAt: number;
  source: 'chat' | 'dashboard' | 'extension';
}

export interface AppleNote {
  id: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

export interface ProjectBoard {
  id: string;
  name: string;
  tasks: ProjectTask[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CaptureNote {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  kind?: 'open_loop' | 'decision';
}

export interface Thing extends CaptureNote {}

export interface EodReport {
  id: string;
  date: string;
  createdAt: number;
  totalWorkMs: number;
  totalBreakMs: number;
  sessionCount: number;
  completed: string;
  tomorrow: string;
  /** Snapshot from Night prep → Previous day's context at EOD save time */
  previousDayContext?: string;
  learnings: string;
  sessions: { project: string; durationMs: number }[];
  doneToday?: { text: string; detail?: string }[];
  infractions: { label: string; count: number }[];
  habits?: EodHabitSnapshot[];
  recurringTasks?: EodRecurringSnapshot[];
  /** @deprecated use completed */
  contextAnswer?: string;
  /** @deprecated use learnings */
  insightsAnswer?: string;
}

export interface TrackedHabit {
  id: string;
  name: string;
  goal: string;
  metric: string;
  createdAt: number;
}

export interface RecurringTaskItem {
  id: string;
  name: string;
  milestone: string;
  createdAt: number;
}

export interface EodHabitSnapshot {
  name: string;
  goal: string;
  metric: string;
  notes: string;
}

export interface EodRecurringSnapshot {
  name: string;
  milestone: string;
  notes: string;
}

export interface DailyTrackingStore {
  habits: TrackedHabit[];
  recurringTasks: RecurringTaskItem[];
  /** dateKey → habitId → notes */
  habitLogs: Record<string, Record<string, string>>;
  /** dateKey → taskId → notes */
  recurringLogs: Record<string, Record<string, string>>;
}

export interface OnboardingState {
  step: number;
  completed: boolean;
  answers: Record<string, string>;
}

export type WorkStatus = 'idle' | 'working' | 'on_break' | 'done';

export type ConversationPhase =
  | 'idle'
  | 'asking_project'
  | 'asking_energy'
  | 'asking_focus'
  | 'asking_estimate'
  | 'countdown'
  | 'working'
  | 'pomodoro_working'
  | 'pomodoro_paused'
  | 'pomodoro_break'
  | 'pomodoro_done'
  | 'asking_productivity'
  | 'asking_blockers'
  | 'eod_context'
  | 'eod_insights';

export interface TrackerState {
  status: WorkStatus;
  phase: ConversationPhase;
  currentSession: WorkSession | null;
  currentBreak: BreakSession | null;
  pendingData: Partial<WorkSession>;
  pomodoroTimeLeft: number | null;
  breakTimeLeft: number | null;
  /** Remaining pomodoro ms saved when user takes a manual break mid-block */
  pomodoroPausedRemaining: number | null;
  /** Open-session work ms frozen when user starts a break */
  pausedWorkElapsed: number | null;
  timerPaused: boolean;
}

export interface DailyStats {
  date: string;
  totalWorkMs: number;
  totalBreakMs: number;
  sessionCount: number;
  avgProductivity: number | null;
  avgEnergy: number | null;
  avgFocus: number | null;
}

export interface HourlyProductivity {
  hour: number;
  avgProductivity: number;
  sessionCount: number;
}

export interface ProjectStats {
  project: string;
  totalMs: number;
  sessionCount: number;
  avgEstimateAccuracy: number | null;
}

// ─────────────────────────────────────────────────────────
// AGENT HQ — Shared Types
// ─────────────────────────────────────────────────────────

export interface WorkSession {
  id: string;
  start: number; // Unix ms
  end?: number; // Unix ms — undefined if still running
  type: 'work' | 'break';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  /** seed = first-turn copy shown only in UI, not sent to the model */
  variant?: 'command' | 'report' | 'onboarding' | 'seed';
}

export interface BigGoal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  /** Canonical `YYYY-MM-DD` (or legacy free text until next edit). */
  deadline?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'complete';
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

/** Logged from Work log (`infraction - …`) or Dashboard (`agentHQ_infractions`). */
export interface Infraction {
  id: string;
  /** Lowercase key for tallying (e.g. `phone`). */
  categoryKey: string;
  /** Display label as entered (e.g. `phone`, `Scrolling Twitter`). */
  label: string;
  createdAt: number;
  source: 'chat' | 'dashboard';
}

/** Apple-style sidebar note (localStorage `agentHQ_appleNotes`) */
export interface AppleNote {
  id: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

export interface OnboardingState {
  step: number; // current question index
  completed: boolean;
  answers: Record<string, string>;
}

export type WorkStatus = 'idle' | 'working' | 'on_break' | 'done';

export interface WorkTrackerState {
  sessions: WorkSession[];
  currentSession: WorkSession | null;
  accomplishments: string[];
  status: WorkStatus;
}

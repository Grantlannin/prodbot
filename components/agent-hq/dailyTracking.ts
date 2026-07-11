import { localDateKey } from './eodReports';
import type {
  DailyTrackingStore,
  EodHabitSnapshot,
  EodRecurringSnapshot,
  RecurringTaskItem,
  TrackedHabit,
} from './types';

export const DAILY_TRACKING_KEY = 'agentHQ_dailyTracking';

export const EMPTY_DAILY_TRACKING: DailyTrackingStore = {
  habits: [],
  recurringTasks: [],
  habitLogs: {},
  recurringLogs: {},
};

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function normalizeDailyTracking(raw: Partial<DailyTrackingStore> | DailyTrackingStore): DailyTrackingStore {
  return {
    habits: Array.isArray(raw.habits) ? raw.habits : [],
    recurringTasks: Array.isArray(raw.recurringTasks) ? raw.recurringTasks : [],
    habitLogs: raw.habitLogs && typeof raw.habitLogs === 'object' ? raw.habitLogs : {},
    recurringLogs: raw.recurringLogs && typeof raw.recurringLogs === 'object' ? raw.recurringLogs : {},
  };
}

export function readDailyTrackingStore(): DailyTrackingStore {
  if (typeof window === 'undefined') return EMPTY_DAILY_TRACKING;
  try {
    const raw = localStorage.getItem(DAILY_TRACKING_KEY);
    if (!raw) return EMPTY_DAILY_TRACKING;
    return normalizeDailyTracking(JSON.parse(raw) as DailyTrackingStore);
  } catch {
    return EMPTY_DAILY_TRACKING;
  }
}

export function createHabit(name: string, goal: string, metric: string): TrackedHabit {
  return {
    id: makeId(),
    name: name.trim(),
    goal: goal.trim(),
    metric: metric.trim(),
    createdAt: Date.now(),
  };
}

export function createRecurringTask(name: string, milestone: string): RecurringTaskItem {
  return {
    id: makeId(),
    name: name.trim(),
    milestone: milestone.trim(),
    createdAt: Date.now(),
  };
}

export function getHabitNotes(store: DailyTrackingStore, dateKey: string, habitId: string): string {
  return store.habitLogs[dateKey]?.[habitId] ?? '';
}

export function getRecurringNotes(store: DailyTrackingStore, dateKey: string, taskId: string): string {
  return store.recurringLogs[dateKey]?.[taskId] ?? '';
}

export interface DailyTrackingEodSnapshot {
  habits: EodHabitSnapshot[];
  recurringTasks: EodRecurringSnapshot[];
}

export function snapshotDailyTrackingForEod(
  store: DailyTrackingStore,
  dateKey = localDateKey()
): DailyTrackingEodSnapshot {
  const habits: EodHabitSnapshot[] = store.habits.map(h => ({
    name: h.name,
    goal: h.goal,
    metric: h.metric,
    notes: getHabitNotes(store, dateKey, h.id).trim(),
  }));

  const recurringTasks: EodRecurringSnapshot[] = store.recurringTasks.map(t => ({
    name: t.name,
    milestone: t.milestone,
    notes: getRecurringNotes(store, dateKey, t.id).trim(),
  }));

  return { habits, recurringTasks };
}

export function readDailyTrackingForEod(dateKey = localDateKey()): DailyTrackingEodSnapshot {
  return snapshotDailyTrackingForEod(readDailyTrackingStore(), dateKey);
}

export function formatHabitsForEodText(habits: EodHabitSnapshot[]): string {
  if (habits.length === 0) return '';
  return habits
    .map(h => {
      const meta = [h.goal && `Goal: ${h.goal}`, h.metric && `Metric: ${h.metric}`].filter(Boolean).join(' · ');
      const notes = h.notes || '—';
      return meta ? `• ${h.name} — ${meta}\n  ${notes}` : `• ${h.name}\n  ${notes}`;
    })
    .join('\n');
}

export function formatRecurringForEodText(tasks: EodRecurringSnapshot[]): string {
  if (tasks.length === 0) return '';
  return tasks
    .map(t => {
      const meta = t.milestone ? `Target: ${t.milestone}` : '';
      const notes = t.notes || '—';
      return meta ? `• ${t.name} — ${meta}\n  ${notes}` : `• ${t.name}\n  ${notes}`;
    })
    .join('\n');
}

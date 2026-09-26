import { startOfLocalDayMs } from './infractions';

export const TIME_STUDY_SETTINGS_KEY = 'agentHQ_timeStudySettings';
export const TIME_STUDY_CHECKINS_KEY = 'agentHQ_timeStudyCheckIns';

/** Minutes between pings. */
export const TIME_STUDY_INTERVAL_OPTIONS = [5, 15, 30, 45, 60] as const;

export interface TimeStudySettings {
  enabled: boolean;
  /** Minutes between check-in pings. */
  intervalMinutes: number;
}

export const DEFAULT_TIME_STUDY_SETTINGS: TimeStudySettings = {
  enabled: false,
  intervalMinutes: 30,
};

export interface TimeStudyCheckIn {
  id: string;
  text: string;
  createdAt: number;
}

export interface TimeStudyCheckInsStore {
  dayStartMs: number;
  items: TimeStudyCheckIn[];
}

export function normalizeTimeStudySettings(raw: Partial<TimeStudySettings> | null | undefined): TimeStudySettings {
  const interval = Number(raw?.intervalMinutes);
  const allowed = TIME_STUDY_INTERVAL_OPTIONS as readonly number[];
  return {
    enabled: Boolean(raw?.enabled),
    intervalMinutes: allowed.includes(interval) ? interval : DEFAULT_TIME_STUDY_SETTINGS.intervalMinutes,
  };
}

export function formatTimeStudyIntervalLabel(intervalMinutes: number): string {
  return `Every ${intervalMinutes} minutes`;
}

export function todayStartMs(now = Date.now()): number {
  return startOfLocalDayMs(now);
}

export function makeTimeStudyCheckInId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function normalizeTimeStudyCheckInsStore(
  store: TimeStudyCheckInsStore | null | undefined,
  now = Date.now()
): TimeStudyCheckInsStore {
  const dayStart = todayStartMs(now);
  if (!store || store.dayStartMs !== dayStart) {
    return { dayStartMs: dayStart, items: [] };
  }
  return {
    dayStartMs: store.dayStartMs,
    items: Array.isArray(store.items) ? store.items : [],
  };
}

export function formatCheckInTime(createdAt: number): string {
  try {
    return new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

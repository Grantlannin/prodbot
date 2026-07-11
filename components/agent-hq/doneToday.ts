import type { DoneTodayItem } from './types';
import { startOfLocalDayMs } from './infractions';

export const DONE_TODAY_STORAGE_KEY = 'agentHQ_doneToday';

export interface DoneTodayStore {
  dayStartMs: number;
  items: DoneTodayItem[];
}

export function todayStartMs(now = Date.now()): number {
  return startOfLocalDayMs(now);
}

export function makeDoneTodayId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function normalizeDoneTodayStore(store: DoneTodayStore, now = Date.now()): DoneTodayStore {
  const dayStart = todayStartMs(now);
  if (store.dayStartMs !== dayStart) {
    return { dayStartMs: dayStart, items: [] };
  }
  return store;
}

export function itemsForToday(store: DoneTodayStore, now = Date.now()): DoneTodayItem[] {
  return normalizeDoneTodayStore(store, now).items;
}

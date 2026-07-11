'use client';

import { useCallback } from 'react';
import {
  createHabit,
  createRecurringTask,
  DAILY_TRACKING_KEY,
  EMPTY_DAILY_TRACKING,
  getHabitNotes,
  getRecurringNotes,
  normalizeDailyTracking,
  readDailyTrackingForEod,
} from '../dailyTracking';
import { localDateKey } from '../eodReports';
import type { DailyTrackingStore } from '../types';
import { useLocalStorage } from './useLocalStorage';

export function useDailyTracking() {
  const [store, setStore] = useLocalStorage<DailyTrackingStore>(DAILY_TRACKING_KEY, EMPTY_DAILY_TRACKING);
  const todayKey = localDateKey();

  const addHabit = useCallback(
    (name: string, goal: string, metric: string) => {
      if (!name.trim()) return;
      setStore(prev => ({
        ...normalizeDailyTracking(prev),
        habits: [...normalizeDailyTracking(prev).habits, createHabit(name, goal, metric)],
      }));
    },
    [setStore]
  );

  const removeHabit = useCallback(
    (id: string) => {
      setStore(prev => {
        const next = normalizeDailyTracking(prev);
        return {
          ...next,
          habits: next.habits.filter(h => h.id !== id),
        };
      });
    },
    [setStore]
  );

  const addRecurringTask = useCallback(
    (name: string, milestone: string) => {
      if (!name.trim()) return;
      setStore(prev => ({
        ...normalizeDailyTracking(prev),
        recurringTasks: [...normalizeDailyTracking(prev).recurringTasks, createRecurringTask(name, milestone)],
      }));
    },
    [setStore]
  );

  const removeRecurringTask = useCallback(
    (id: string) => {
      setStore(prev => {
        const next = normalizeDailyTracking(prev);
        return {
          ...next,
          recurringTasks: next.recurringTasks.filter(t => t.id !== id),
        };
      });
    },
    [setStore]
  );

  const setHabitNotes = useCallback(
    (habitId: string, notes: string, dateKey = todayKey) => {
      setStore(prev => {
        const next = normalizeDailyTracking(prev);
        const day = { ...(next.habitLogs[dateKey] ?? {}), [habitId]: notes };
        return {
          ...next,
          habitLogs: { ...next.habitLogs, [dateKey]: day },
        };
      });
    },
    [setStore, todayKey]
  );

  const setRecurringNotes = useCallback(
    (taskId: string, notes: string, dateKey = todayKey) => {
      setStore(prev => {
        const next = normalizeDailyTracking(prev);
        const day = { ...(next.recurringLogs[dateKey] ?? {}), [taskId]: notes };
        return {
          ...next,
          recurringLogs: { ...next.recurringLogs, [dateKey]: day },
        };
      });
    },
    [setStore, todayKey]
  );

  const current = normalizeDailyTracking(store);

  return {
    habits: current.habits,
    recurringTasks: current.recurringTasks,
    todayKey,
    getHabitNotes: (habitId: string) => getHabitNotes(current, todayKey, habitId),
    getRecurringNotes: (taskId: string) => getRecurringNotes(current, todayKey, taskId),
    addHabit,
    removeHabit,
    addRecurringTask,
    removeRecurringTask,
    setHabitNotes,
    setRecurringNotes,
    snapshotForEod: () => readDailyTrackingForEod(todayKey),
  };
}

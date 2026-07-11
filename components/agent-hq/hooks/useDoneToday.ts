'use client';

import { useCallback } from 'react';
import {
  DONE_TODAY_STORAGE_KEY,
  makeDoneTodayId,
  normalizeDoneTodayStore,
  todayStartMs,
  type DoneTodayStore,
} from '../doneToday';
import type { DoneTodayItem } from '../types';
import { useLocalStorage } from './useLocalStorage';

const EMPTY: DoneTodayStore = { dayStartMs: todayStartMs(), items: [] };

export function useDoneToday() {
  const [store, setStore] = useLocalStorage<DoneTodayStore>(DONE_TODAY_STORAGE_KEY, EMPTY);
  const normalized = normalizeDoneTodayStore(store);
  const items = normalized.items;

  const addItem = useCallback(
    (input: Omit<DoneTodayItem, 'id' | 'createdAt'>) => {
      const dayStart = todayStartMs();
      setStore(prev => {
        const base = normalizeDoneTodayStore(prev, dayStart).items;
        let next = base;
        if (input.source === 'project' && input.projectId) {
          next = base.filter(i => i.projectId !== input.projectId);
        }
        const item: DoneTodayItem = {
          ...input,
          id: makeDoneTodayId(),
          createdAt: Date.now(),
        };
        return { dayStartMs: dayStart, items: [item, ...next] };
      });
    },
    [setStore]
  );

  const removeItem = useCallback(
    (id: string) => {
      setStore(prev => {
        const base = normalizeDoneTodayStore(prev);
        return { ...base, items: base.items.filter(i => i.id !== id) };
      });
    },
    [setStore]
  );

  return { items, addItem, removeItem };
}

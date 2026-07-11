'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Persists state to localStorage. SSR-safe for Next.js.
 * Uses lazy initializer so localStorage is read once on mount.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[useLocalStorage] Failed to write "${key}":`, e);
    }
  }, [key, value]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        /* ignore corrupt cross-tab payload */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const setValueSafe = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue(prev =>
        typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
      );
    },
    []
  );

  return [value, setValueSafe] as const;
}

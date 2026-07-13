'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SYNC_CHANNEL = 'agentHQ_localStorage_sync';
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
  return broadcastChannel;
}

/**
 * Persists state to localStorage. SSR-safe for Next.js.
 * Uses lazy initializer so localStorage is read once on mount.
 * BroadcastChannel keeps PiP / other same-origin windows in sync immediately.
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
  const skipBroadcastRef = useRef(false);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      if (!skipBroadcastRef.current) {
        getBroadcastChannel()?.postMessage({ key, value: serialized });
      }
      skipBroadcastRef.current = false;
    } catch (e) {
      console.error(`[useLocalStorage] Failed to write "${key}":`, e);
    }
  }, [key, value]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        skipBroadcastRef.current = true;
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        /* ignore corrupt cross-tab payload */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  useEffect(() => {
    const channel = getBroadcastChannel();
    if (!channel) return;
    const onMessage = (e: MessageEvent<{ key?: string; value?: string }>) => {
      if (e.data?.key !== key || e.data.value == null) return;
      try {
        skipBroadcastRef.current = true;
        setValue(JSON.parse(e.data.value) as T);
      } catch {
        /* ignore corrupt payload */
      }
    };
    channel.addEventListener('message', onMessage);
    return () => channel.removeEventListener('message', onMessage);
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

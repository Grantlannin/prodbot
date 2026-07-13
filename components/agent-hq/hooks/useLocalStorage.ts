'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SYNC_CHANNEL = 'agentHQ_localStorage_sync';
let broadcastChannel: BroadcastChannel | null = null;

type SameTabListener = (serialized: string) => void;
const sameTabSubscribers = new Map<string, Set<SameTabListener>>();

function subscribeSameTab(key: string, listener: SameTabListener): () => void {
  let listeners = sameTabSubscribers.get(key);
  if (!listeners) {
    listeners = new Set();
    sameTabSubscribers.set(key, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) sameTabSubscribers.delete(key);
  };
}

function publishSameTab(key: string, serialized: string) {
  const listeners = sameTabSubscribers.get(key);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(serialized);
  }
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
  return broadcastChannel;
}

/**
 * Persists state to localStorage. SSR-safe for Next.js.
 * Uses lazy initializer so localStorage is read once on mount.
 * Same-tab subscribers + BroadcastChannel keep all hooks/windows in sync immediately.
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
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(value);
      if (lastSerializedRef.current === serialized) {
        skipBroadcastRef.current = false;
        return;
      }

      localStorage.setItem(key, serialized);
      lastSerializedRef.current = serialized;

      if (!skipBroadcastRef.current) {
        publishSameTab(key, serialized);
        getBroadcastChannel()?.postMessage({ key, value: serialized });
      }
      skipBroadcastRef.current = false;
    } catch (e) {
      console.error(`[useLocalStorage] Failed to write "${key}":`, e);
    }
  }, [key, value]);

  useEffect(() => {
    const applySerialized = (serialized: string) => {
      if (lastSerializedRef.current === serialized) return;
      try {
        lastSerializedRef.current = serialized;
        skipBroadcastRef.current = true;
        setValue(JSON.parse(serialized) as T);
      } catch {
        /* ignore corrupt payload */
      }
    };

    const unsubscribeSameTab = subscribeSameTab(key, applySerialized);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      applySerialized(e.newValue);
    };
    window.addEventListener('storage', onStorage);

    const channel = getBroadcastChannel();
    const onMessage = (e: MessageEvent<{ key?: string; value?: string }>) => {
      if (e.data?.key !== key || e.data.value == null) return;
      applySerialized(e.data.value);
    };
    channel?.addEventListener('message', onMessage);

    return () => {
      unsubscribeSameTab();
      window.removeEventListener('storage', onStorage);
      channel?.removeEventListener('message', onMessage);
    };
  }, [key]);

  const setValueSafe = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue(prev => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;

        if (typeof window !== 'undefined') {
          try {
            const serialized = JSON.stringify(next);
            if (lastSerializedRef.current !== serialized) {
              localStorage.setItem(key, serialized);
              lastSerializedRef.current = serialized;
              if (!skipBroadcastRef.current) {
                publishSameTab(key, serialized);
                getBroadcastChannel()?.postMessage({ key, value: serialized });
              }
              skipBroadcastRef.current = false;
            }
          } catch (e) {
            console.error(`[useLocalStorage] Failed to write "${key}":`, e);
          }
        }

        return next;
      });
    },
    [key]
  );

  return [value, setValueSafe] as const;
}

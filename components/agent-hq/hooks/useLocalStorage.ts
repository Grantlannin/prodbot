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
 * Persists state to localStorage. SSR-safe for Next.js:
 * first render always uses `initialValue` (matches server HTML), then hydrates from
 * localStorage after mount so we don't trip React hydration mismatches.
 * Same-tab subscribers + BroadcastChannel keep all hooks/windows in sync immediately.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const skipBroadcastRef = useRef(false);
  const lastSerializedRef = useRef<string | null>(null);
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Load from localStorage only after mount (client), so SSR + first client paint match.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        lastSerializedRef.current = stored;
        skipBroadcastRef.current = true;
        setValue(JSON.parse(stored) as T);
      } else {
        lastSerializedRef.current = JSON.stringify(initialValueRef.current);
      }
    } catch {
      lastSerializedRef.current = JSON.stringify(initialValueRef.current);
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
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
  }, [key, value, ready]);

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

        if (typeof window !== 'undefined' && ready) {
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
    [key, ready]
  );

  return [value, setValueSafe] as const;
}

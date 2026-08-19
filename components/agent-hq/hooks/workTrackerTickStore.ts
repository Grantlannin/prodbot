export type WorkTrackerTickSnapshot = {
  elapsed: number;
  pomodoroLeft: number | null;
  breakLeft: number | null;
  openCountdownLeft: number | null;
};

export type WorkTrackerTickStore = {
  getSnapshot: () => WorkTrackerTickSnapshot;
  subscribe: (listener: () => void) => () => void;
  setSnapshot: (patch: Partial<WorkTrackerTickSnapshot>) => void;
};

const INITIAL_TICK: WorkTrackerTickSnapshot = {
  elapsed: 0,
  pomodoroLeft: null,
  breakLeft: null,
  openCountdownLeft: null,
};

export function createWorkTrackerTickStore(
  initial: WorkTrackerTickSnapshot = INITIAL_TICK
): WorkTrackerTickStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSnapshot: patch => {
      snapshot = { ...snapshot, ...patch };
      listeners.forEach(listener => listener());
    },
  };
}

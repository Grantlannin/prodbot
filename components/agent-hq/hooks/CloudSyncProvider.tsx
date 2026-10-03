'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { CaptureNote, SimpleNote, ProjectBoard } from '../types';
import { SIMPLE_NOTES_KEY } from '../simpleNotesUtils';
import { PROJECTS_STORAGE_KEY } from '../stuckHelp/projectMutations';
import { OPEN_LOOPS_STORAGE_KEY } from '../openLoopsUi';
import { NIGHT_PREP_PLAN_KEY, type NightPrepTomorrowPlan } from '../nightPrep/storage';
import {
  TODAY_TASK_LIST_KEY,
  emptyTodayTaskList,
  type TodayTaskListStore,
} from '../todayTaskList/storage';
import {
  isMorningFlowUsedForActivePlan,
  MORNING_FLOW_USED_KEY,
  type MorningFlowUsedRecord,
} from '../morningFlow/storage';
import { useAuth } from './AuthProvider';
import { useProjects } from './ProjectsProvider';
import { useLocalStorage } from './useLocalStorage';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  disableCloudBackup,
  enableCloudBackup,
  fetchCloudSnapshot,
  fetchSyncSettings,
  pushCloudSnapshot,
  type CloudSnapshotInput,
} from '@/lib/sync/cloudApi';
import { CLOUD_SYNC_ENABLED_KEY, SYNC_DEBOUNCE_MS } from '@/lib/sync/constants';
import CloudSyncModals from '../CloudSyncModals';

interface CloudSyncContextValue {
  authEnabled: boolean;
  userLoggedIn: boolean;
  cloudEnabled: boolean;
  lastSyncAt: number | null;
  syncing: boolean;
  syncError: string | null;
  enableBackup: () => void;
  confirmEnableBackup: () => Promise<void>;
  disableBackup: (deleteCloudCopy: boolean) => Promise<void>;
  pushNow: () => Promise<boolean>;
  restoreFromCloud: () => Promise<void>;
  offerRestore: () => void;
  dismissRestoreOffer: () => void;
  restoreOfferOpen: boolean;
  enableConfirmOpen: boolean;
  cancelEnableBackup: () => void;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

function isLocalDataEmpty(
  projects: ProjectBoard[],
  notes: SimpleNote[],
  openLoops: CaptureNote[],
  nightPrepPlan: NightPrepTomorrowPlan | null,
  miscTaskList: TodayTaskListStore
): boolean {
  return (
    projects.length === 0 &&
    notes.length === 0 &&
    openLoops.length === 0 &&
    !nightPrepPlan?.tasks?.length &&
    !(miscTaskList.lines?.length > 0)
  );
}

function snapshotHasData(input: {
  projects: ProjectBoard[];
  notes: SimpleNote[];
  openLoops: CaptureNote[];
  nightPrepPlan: NightPrepTomorrowPlan | null;
  miscTaskList: TodayTaskListStore;
}): boolean {
  return !isLocalDataEmpty(
    input.projects,
    input.notes,
    input.openLoops,
    input.nightPrepPlan,
    input.miscTaskList
  );
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { authEnabled, user } = useAuth();
  const { projects, setProjects } = useProjects();
  const [notes, setNotes] = useLocalStorage<SimpleNote[]>(SIMPLE_NOTES_KEY, []);
  const [openLoops, setOpenLoops] = useLocalStorage<CaptureNote[]>(OPEN_LOOPS_STORAGE_KEY, []);
  const [nightPrepPlan, setNightPrepPlan] = useLocalStorage<NightPrepTomorrowPlan | null>(
    NIGHT_PREP_PLAN_KEY,
    null
  );
  const [miscTaskList, setMiscTaskList] = useLocalStorage<TodayTaskListStore>(
    TODAY_TASK_LIST_KEY,
    emptyTodayTaskList()
  );
  const [morningFlowUsed, setMorningFlowUsed] = useLocalStorage<MorningFlowUsedRecord | string | null>(
    MORNING_FLOW_USED_KEY,
    null
  );
  const [cloudEnabledLocal, setCloudEnabledLocal] = useLocalStorage<boolean>(CLOUD_SYNC_ENABLED_KEY, false);

  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [restoreOfferOpen, setRestoreOfferOpen] = useState(false);
  const [enableConfirmOpen, setEnableConfirmOpen] = useState(false);
  const [hydratedFromServer, setHydratedFromServer] = useState(false);

  const skipPushRef = useRef(false);
  const declinedRestoreRef = useRef(false);
  const restoreOfferOpenRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectsRef = useRef(projects);
  const notesRef = useRef(notes);
  const openLoopsRef = useRef(openLoops);
  const nightPrepPlanRef = useRef(nightPrepPlan);
  const miscTaskListRef = useRef(miscTaskList);
  const morningFlowUsedRef = useRef(morningFlowUsed);

  projectsRef.current = projects;
  notesRef.current = notes;
  openLoopsRef.current = openLoops;
  nightPrepPlanRef.current = nightPrepPlan;
  miscTaskListRef.current = miscTaskList;
  morningFlowUsedRef.current = morningFlowUsed;
  restoreOfferOpenRef.current = restoreOfferOpen;

  const currentSnapshot = useCallback((): CloudSnapshotInput => {
    return {
      projects: projectsRef.current,
      notes: notesRef.current,
      openLoops: openLoopsRef.current,
      nightPrepPlan: nightPrepPlanRef.current,
      morningFlowUsed: morningFlowUsedRef.current,
      miscTaskList: miscTaskListRef.current,
    };
  }, []);

  /** If another device already began work for today's plan, hide Begin work here too. */
  const applyMorningFlowUsedFromCloud = useCallback(
    (cloudUsed: MorningFlowUsedRecord | null, plan: NightPrepTomorrowPlan | null) => {
      const localPlan = plan ?? nightPrepPlanRef.current;
      if (!cloudUsed || !isMorningFlowUsedForActivePlan(cloudUsed, localPlan)) return;
      if (isMorningFlowUsedForActivePlan(morningFlowUsedRef.current, localPlan)) return;
      skipPushRef.current = true;
      setMorningFlowUsed(cloudUsed);
      window.setTimeout(() => {
        skipPushRef.current = false;
      }, SYNC_DEBOUNCE_MS + 500);
    },
    [setMorningFlowUsed]
  );

  const offerRestoreIfNeeded = useCallback(
    async (supabase: ReturnType<typeof createBrowserSupabaseClient>, userId: string): Promise<boolean> => {
      if (
        !isLocalDataEmpty(
          projectsRef.current,
          notesRef.current,
          openLoopsRef.current,
          nightPrepPlanRef.current,
          miscTaskListRef.current
        )
      ) {
        return false;
      }
      if (declinedRestoreRef.current) return false;

      const snapshot = await fetchCloudSnapshot(supabase, userId);
      if (snapshotHasData(snapshot)) {
        setRestoreOfferOpen(true);
        return true;
      }
      return false;
    },
    []
  );

  useEffect(() => {
    if (!authEnabled || !user) {
      setCloudEnabled(false);
      setHydratedFromServer(false);
      setRestoreOfferOpen(false);
      declinedRestoreRef.current = false;
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const settings = await fetchSyncSettings(supabase, user.id);
        if (cancelled) return;

        const enabled = settings?.cloud_enabled ?? false;
        setCloudEnabled(enabled);
        setCloudEnabledLocal(enabled);
        setLastSyncAt(settings?.last_sync_at ? new Date(settings.last_sync_at).getTime() : null);
        setHydratedFromServer(true);

        if (enabled) {
          const offered = await offerRestoreIfNeeded(supabase, user.id);
          if (!cancelled && !offered) {
            try {
              const snapshot = await fetchCloudSnapshot(supabase, user.id);
              if (!cancelled) {
                applyMorningFlowUsedFromCloud(snapshot.morningFlowUsed, snapshot.nightPrepPlan);
              }
            } catch {
              /* non-fatal — begin-work sync is best-effort on login */
            }
          }
        }
      } catch {
        if (!cancelled) setSyncError('Could not load backup settings.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authEnabled, user, setCloudEnabledLocal, offerRestoreIfNeeded, applyMorningFlowUsedFromCloud]);

  const runPush = useCallback(async (): Promise<boolean> => {
    if (!authEnabled || !user || !cloudEnabled || skipPushRef.current || restoreOfferOpenRef.current) {
      return false;
    }

    setSyncing(true);
    setSyncError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const local = currentSnapshot();

      if (
        isLocalDataEmpty(
          local.projects,
          local.notes,
          local.openLoops,
          local.nightPrepPlan,
          local.miscTaskList
        )
      ) {
        const hasCloudBackup = await offerRestoreIfNeeded(supabase, user.id);
        if (hasCloudBackup) return false;
      }

      const { lastSyncAt: iso } = await pushCloudSnapshot(supabase, user.id, local);
      setLastSyncAt(new Date(iso).getTime());
      return true;
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Backup failed.');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [authEnabled, user, cloudEnabled, offerRestoreIfNeeded, currentSnapshot]);

  useEffect(() => {
    if (!cloudEnabled || !user || !hydratedFromServer || restoreOfferOpen) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void runPush();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    projects,
    notes,
    openLoops,
    nightPrepPlan,
    miscTaskList,
    morningFlowUsed,
    cloudEnabled,
    user,
    hydratedFromServer,
    restoreOfferOpen,
    runPush,
  ]);

  const enableBackup = useCallback(() => {
    if (!authEnabled) return;
    if (!user) {
      router.push('/login?next=/app');
      return;
    }
    setEnableConfirmOpen(true);
  }, [authEnabled, user, router]);

  const confirmEnableBackup = useCallback(async () => {
    if (!user) return;
    setEnableConfirmOpen(false);
    setSyncing(true);
    setSyncError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { lastSyncAt: iso } = await enableCloudBackup(supabase, user.id, currentSnapshot());
      setCloudEnabled(true);
      setCloudEnabledLocal(true);
      setLastSyncAt(new Date(iso).getTime());
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Could not enable backup.');
    } finally {
      setSyncing(false);
    }
  }, [user, setCloudEnabledLocal, currentSnapshot]);

  const disableBackup = useCallback(
    async (deleteCloudCopy: boolean) => {
      if (!user) return;
      setSyncing(true);
      setSyncError(null);
      try {
        const supabase = createBrowserSupabaseClient();
        await disableCloudBackup(supabase, user.id, deleteCloudCopy);
        setCloudEnabled(false);
        setCloudEnabledLocal(false);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not turn off backup.');
      } finally {
        setSyncing(false);
      }
    },
    [user, setCloudEnabledLocal]
  );

  const pushNow = useCallback(async () => {
    return runPush();
  }, [runPush]);

  const restoreFromCloud = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const snapshot = await fetchCloudSnapshot(supabase, user.id);
      skipPushRef.current = true;
      setProjects(snapshot.projects);
      setNotes(snapshot.notes);
      setOpenLoops(snapshot.openLoops);
      setNightPrepPlan(snapshot.nightPrepPlan);
      setMiscTaskList(snapshot.miscTaskList);
      setMorningFlowUsed(snapshot.morningFlowUsed);
      setRestoreOfferOpen(false);
      window.setTimeout(() => {
        skipPushRef.current = false;
      }, SYNC_DEBOUNCE_MS + 500);

      if (cloudEnabled) {
        const { lastSyncAt: iso } = await pushCloudSnapshot(supabase, user.id, {
          projects: snapshot.projects,
          notes: snapshot.notes,
          openLoops: snapshot.openLoops,
          nightPrepPlan: snapshot.nightPrepPlan,
          morningFlowUsed: snapshot.morningFlowUsed,
          miscTaskList: snapshot.miscTaskList,
        });
        setLastSyncAt(new Date(iso).getTime());
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setSyncing(false);
    }
  }, [
    user,
    cloudEnabled,
    setProjects,
    setNotes,
    setOpenLoops,
    setNightPrepPlan,
    setMiscTaskList,
    setMorningFlowUsed,
  ]);

  const dismissRestoreOffer = useCallback(() => {
    setRestoreOfferOpen(false);
    declinedRestoreRef.current = true;
  }, []);

  const offerRestore = useCallback(() => {
    if (!user) return;
    declinedRestoreRef.current = false;
    setSyncError(null);
    void (async () => {
      setSyncing(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const snapshot = await fetchCloudSnapshot(supabase, user.id);
        if (snapshotHasData(snapshot)) {
          setRestoreOfferOpen(true);
        } else {
          setSyncError('No cloud backup found for this account.');
        }
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Could not check cloud backup.');
      } finally {
        setSyncing(false);
      }
    })();
  }, [user]);

  const value = useMemo(
    (): CloudSyncContextValue => ({
      authEnabled,
      userLoggedIn: !!user,
      cloudEnabled: authEnabled && !!user && cloudEnabled,
      lastSyncAt,
      syncing,
      syncError,
      enableBackup,
      confirmEnableBackup,
      disableBackup,
      pushNow,
      restoreFromCloud,
      offerRestore,
      dismissRestoreOffer,
      restoreOfferOpen,
      enableConfirmOpen,
      cancelEnableBackup: () => setEnableConfirmOpen(false),
    }),
    [
      authEnabled,
      user,
      cloudEnabled,
      lastSyncAt,
      syncing,
      syncError,
      enableBackup,
      confirmEnableBackup,
      disableBackup,
      pushNow,
      restoreFromCloud,
      offerRestore,
      dismissRestoreOffer,
      restoreOfferOpen,
      enableConfirmOpen,
    ]
  );

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
      <CloudSyncModals />
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync(): CloudSyncContextValue {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) throw new Error('useCloudSync must be used within CloudSyncProvider');
  return ctx;
}

/** Keys synced to cloud (documentation / tests). */
export const CLOUD_SYNC_STORAGE_KEYS = [
  PROJECTS_STORAGE_KEY,
  SIMPLE_NOTES_KEY,
  OPEN_LOOPS_STORAGE_KEY,
  NIGHT_PREP_PLAN_KEY,
  TODAY_TASK_LIST_KEY,
  MORNING_FLOW_USED_KEY,
] as const;

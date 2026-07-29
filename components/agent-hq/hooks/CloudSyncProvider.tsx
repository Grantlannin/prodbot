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
import type { AppleNote, ProjectBoard } from '../types';
import { APPLE_NOTES_KEY } from '../appleNotesUtils';
import { PROJECTS_STORAGE_KEY } from '../stuckHelp/projectMutations';
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
  pushNow: () => Promise<void>;
  restoreFromCloud: () => Promise<void>;
  dismissRestoreOffer: () => void;
  restoreOfferOpen: boolean;
  enableConfirmOpen: boolean;
  cancelEnableBackup: () => void;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

function isLocalDataEmpty(projects: ProjectBoard[], notes: AppleNote[]): boolean {
  return projects.length === 0 && notes.length === 0;
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { authEnabled, user } = useAuth();
  const { projects, setProjects } = useProjects();
  const [notes, setNotes] = useLocalStorage<AppleNote[]>(APPLE_NOTES_KEY, []);
  const [cloudEnabledLocal, setCloudEnabledLocal] = useLocalStorage<boolean>(CLOUD_SYNC_ENABLED_KEY, false);

  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [restoreOfferOpen, setRestoreOfferOpen] = useState(false);
  const [enableConfirmOpen, setEnableConfirmOpen] = useState(false);
  const [hydratedFromServer, setHydratedFromServer] = useState(false);

  const skipPushRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectsRef = useRef(projects);
  const notesRef = useRef(notes);

  projectsRef.current = projects;
  notesRef.current = notes;

  useEffect(() => {
    if (!authEnabled || !user) {
      setCloudEnabled(false);
      setHydratedFromServer(false);
      setRestoreOfferOpen(false);
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

        if (enabled && isLocalDataEmpty(projectsRef.current, notesRef.current)) {
          const snapshot = await fetchCloudSnapshot(supabase, user.id);
          if (cancelled) return;
          if (snapshot.projects.length > 0 || snapshot.notes.length > 0) {
            setRestoreOfferOpen(true);
          }
        }
      } catch {
        if (!cancelled) setSyncError('Could not load backup settings.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authEnabled, user, setCloudEnabledLocal]);

  const runPush = useCallback(async () => {
    if (!authEnabled || !user || !cloudEnabled || skipPushRef.current) return;

    setSyncing(true);
    setSyncError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { lastSyncAt: iso } = await pushCloudSnapshot(
        supabase,
        user.id,
        projectsRef.current,
        notesRef.current
      );
      setLastSyncAt(new Date(iso).getTime());
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Backup failed.');
    } finally {
      setSyncing(false);
    }
  }, [authEnabled, user, cloudEnabled]);

  useEffect(() => {
    if (!cloudEnabled || !user || !hydratedFromServer) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void runPush();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [projects, notes, cloudEnabled, user, hydratedFromServer, runPush]);

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
      const { lastSyncAt: iso } = await enableCloudBackup(
        supabase,
        user.id,
        projectsRef.current,
        notesRef.current
      );
      setCloudEnabled(true);
      setCloudEnabledLocal(true);
      setLastSyncAt(new Date(iso).getTime());
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Could not enable backup.');
    } finally {
      setSyncing(false);
    }
  }, [user, setCloudEnabledLocal]);

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
    await runPush();
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
      setRestoreOfferOpen(false);
      window.setTimeout(() => {
        skipPushRef.current = false;
      }, SYNC_DEBOUNCE_MS + 500);

      if (cloudEnabled) {
        const { lastSyncAt: iso } = await pushCloudSnapshot(
          supabase,
          user.id,
          snapshot.projects,
          snapshot.notes
        );
        setLastSyncAt(new Date(iso).getTime());
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setSyncing(false);
    }
  }, [user, cloudEnabled, setProjects, setNotes]);

  const dismissRestoreOffer = useCallback(() => {
    setRestoreOfferOpen(false);
  }, []);

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
export const CLOUD_SYNC_STORAGE_KEYS = [PROJECTS_STORAGE_KEY, APPLE_NOTES_KEY] as const;

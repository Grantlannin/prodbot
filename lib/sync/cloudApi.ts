import type { SupabaseClient } from '@supabase/supabase-js';
import type { CaptureNote, SimpleNote, ProjectBoard } from '@/components/agent-hq/types';
import type { NightPrepTomorrowPlan } from '@/components/agent-hq/nightPrep/storage';
import type { MorningFlowUsedRecord } from '@/components/agent-hq/morningFlow/storage';
import type { TodayTaskListStore } from '@/components/agent-hq/todayTaskList/storage';
import { emptyTodayTaskList, sanitizeTodayTaskListStore } from '@/components/agent-hq/todayTaskList/storage';
import { MAX_SYNC_PAYLOAD_BYTES } from './constants';
import {
  buildNightPrepCloudBlob,
  estimateJsonBytes,
  parseNightPrepCloudBlob,
  sanitizeMiscTaskListForCloud,
  sanitizeNotesForCloud,
  sanitizeOpenLoopsForCloud,
  sanitizeProjectsForCloud,
} from './sanitize';

export interface SyncSettingsRow {
  user_id: string;
  cloud_enabled: boolean;
  enabled_at: string | null;
  last_sync_at: string | null;
  projects_updated_at: string | null;
  notes_updated_at: string | null;
  open_loops_updated_at?: string | null;
  night_prep_updated_at?: string | null;
  misc_tasks_updated_at?: string | null;
}

export interface CloudSnapshot {
  projects: ProjectBoard[];
  notes: SimpleNote[];
  openLoops: CaptureNote[];
  nightPrepPlan: NightPrepTomorrowPlan | null;
  morningFlowUsed: MorningFlowUsedRecord | null;
  miscTaskList: TodayTaskListStore;
  projectsUpdatedAt: string | null;
  notesUpdatedAt: string | null;
  openLoopsUpdatedAt: string | null;
  nightPrepUpdatedAt: string | null;
  miscTasksUpdatedAt: string | null;
}

export type CloudSnapshotInput = {
  projects: ProjectBoard[];
  notes: SimpleNote[];
  openLoops: CaptureNote[];
  nightPrepPlan: NightPrepTomorrowPlan | null;
  morningFlowUsed: MorningFlowUsedRecord | string | null;
  miscTaskList: TodayTaskListStore;
};

type NotesTable = 'user_simple_notes' | 'user_apple_notes';

let resolvedNotesTable: NotesTable | null = null;

function syncErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const o = err as { message?: string; details?: string; hint?: string; code?: string };
    if (typeof o.message === 'string' && o.message.trim()) {
      return [o.message, o.hint, o.details].filter(Boolean).join(' — ');
    }
  }
  return fallback;
}

function isMissingTableError(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'PGRST205';
}

/** Prod may still have the pre-rename table until migration 008 is applied. */
async function getNotesTable(supabase: SupabaseClient): Promise<NotesTable> {
  if (resolvedNotesTable) return resolvedNotesTable;

  const simple = await supabase.from('user_simple_notes').select('user_id').limit(1);
  if (!simple.error) {
    resolvedNotesTable = 'user_simple_notes';
    return resolvedNotesTable;
  }

  // PGRST205 = table missing from schema cache
  if (simple.error.code === 'PGRST205') {
    const apple = await supabase.from('user_apple_notes').select('user_id').limit(1);
    if (!apple.error) {
      resolvedNotesTable = 'user_apple_notes';
      return resolvedNotesTable;
    }
  }

  throw simple.error;
}

function parseProjects(raw: unknown): ProjectBoard[] {
  return Array.isArray(raw) ? (raw as ProjectBoard[]) : [];
}

function parseNotes(raw: unknown): SimpleNote[] {
  return Array.isArray(raw) ? (raw as SimpleNote[]) : [];
}

function parseOpenLoops(raw: unknown): CaptureNote[] {
  return Array.isArray(raw) ? (raw as CaptureNote[]) : [];
}

function parseMiscTaskList(raw: unknown): TodayTaskListStore {
  if (!raw || typeof raw !== 'object') return emptyTodayTaskList();
  return sanitizeTodayTaskListStore(raw as TodayTaskListStore);
}

export async function fetchSyncSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<SyncSettingsRow | null> {
  const { data, error } = await supabase
    .from('user_sync_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as SyncSettingsRow | null;
}

export async function fetchCloudSnapshot(supabase: SupabaseClient, userId: string): Promise<CloudSnapshot> {
  const notesTable = await getNotesTable(supabase);
  const [projectsRes, notesRes, openLoopsRes, nightPrepRes, miscRes] = await Promise.all([
    supabase.from('user_project_boards').select('projects, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from(notesTable).select('notes, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('user_open_loops').select('open_loops, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('user_night_prep_plans').select('plan, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('user_misc_task_lists').select('store, updated_at').eq('user_id', userId).maybeSingle(),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (notesRes.error) throw notesRes.error;

  // New tables may be missing until migration 009 is applied — treat as empty rather than failing restore.
  if (openLoopsRes.error && !isMissingTableError(openLoopsRes.error)) throw openLoopsRes.error;
  if (nightPrepRes.error && !isMissingTableError(nightPrepRes.error)) throw nightPrepRes.error;
  if (miscRes.error && !isMissingTableError(miscRes.error)) throw miscRes.error;

  const nightPrep = nightPrepRes.error
    ? { plan: null, morningFlowUsed: null }
    : parseNightPrepCloudBlob(nightPrepRes.data?.plan);

  return {
    projects: parseProjects(projectsRes.data?.projects),
    notes: parseNotes(notesRes.data?.notes),
    openLoops: openLoopsRes.error ? [] : parseOpenLoops(openLoopsRes.data?.open_loops),
    nightPrepPlan: nightPrep.plan,
    morningFlowUsed: nightPrep.morningFlowUsed,
    miscTaskList: miscRes.error ? emptyTodayTaskList() : parseMiscTaskList(miscRes.data?.store),
    projectsUpdatedAt: projectsRes.data?.updated_at ?? null,
    notesUpdatedAt: notesRes.data?.updated_at ?? null,
    openLoopsUpdatedAt: openLoopsRes.error ? null : openLoopsRes.data?.updated_at ?? null,
    nightPrepUpdatedAt: nightPrepRes.error ? null : nightPrepRes.data?.updated_at ?? null,
    miscTasksUpdatedAt: miscRes.error ? null : miscRes.data?.updated_at ?? null,
  };
}

export async function pushCloudSnapshot(
  supabase: SupabaseClient,
  userId: string,
  input: CloudSnapshotInput
): Promise<{ lastSyncAt: string }> {
  const cleanProjects = sanitizeProjectsForCloud(input.projects);
  const cleanNotes = sanitizeNotesForCloud(input.notes);
  const cleanOpenLoops = sanitizeOpenLoopsForCloud(input.openLoops);
  const cleanNightPrep = buildNightPrepCloudBlob(input.nightPrepPlan, input.morningFlowUsed);
  const cleanMisc = sanitizeMiscTaskListForCloud(input.miscTaskList);

  const payloads = [cleanProjects, cleanNotes, cleanOpenLoops, cleanNightPrep, cleanMisc];
  if (payloads.some(value => estimateJsonBytes(value) > MAX_SYNC_PAYLOAD_BYTES)) {
    throw new Error('Backup is too large. Try removing old content or contact support.');
  }

  const now = new Date().toISOString();
  const notesTable = await getNotesTable(supabase);

  const [projectsRes, notesRes, openLoopsRes, nightPrepRes, miscRes] = await Promise.all([
    supabase.from('user_project_boards').upsert(
      {
        user_id: userId,
        projects: cleanProjects,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
    supabase.from(notesTable).upsert(
      {
        user_id: userId,
        notes: cleanNotes,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
    supabase.from('user_open_loops').upsert(
      {
        user_id: userId,
        open_loops: cleanOpenLoops,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
    supabase.from('user_night_prep_plans').upsert(
      {
        user_id: userId,
        plan: cleanNightPrep,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
    supabase.from('user_misc_task_lists').upsert(
      {
        user_id: userId,
        store: cleanMisc,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (notesRes.error) throw notesRes.error;

  const workspaceErrors = [openLoopsRes.error, nightPrepRes.error, miscRes.error].filter(Boolean);
  if (workspaceErrors.length) {
    if (workspaceErrors.every(isMissingTableError)) {
      throw new Error(
        'Cloud backup needs a one-time database update (migration 009). Run supabase/migrations/009_cloud_sync_workspace_lists.sql in the Supabase SQL editor, then try again.'
      );
    }
    throw workspaceErrors[0];
  }

  const existing = await fetchSyncSettings(supabase, userId);
  const settingsRes = await supabase.from('user_sync_settings').upsert(
    {
      user_id: userId,
      cloud_enabled: true,
      enabled_at: existing?.enabled_at ?? now,
      last_sync_at: now,
      projects_updated_at: now,
      notes_updated_at: now,
      open_loops_updated_at: now,
      night_prep_updated_at: now,
      misc_tasks_updated_at: now,
    },
    { onConflict: 'user_id' }
  );

  if (settingsRes.error) {
    // Older DBs may lack the new timestamp columns — retry without them.
    if (settingsRes.error.code === 'PGRST204' || /column/i.test(settingsRes.error.message || '')) {
      const fallback = await supabase.from('user_sync_settings').upsert(
        {
          user_id: userId,
          cloud_enabled: true,
          enabled_at: existing?.enabled_at ?? now,
          last_sync_at: now,
          projects_updated_at: now,
          notes_updated_at: now,
        },
        { onConflict: 'user_id' }
      );
      if (fallback.error) throw fallback.error;
    } else {
      throw settingsRes.error;
    }
  }

  return { lastSyncAt: now };
}

export async function enableCloudBackup(
  supabase: SupabaseClient,
  userId: string,
  input: CloudSnapshotInput
): Promise<{ lastSyncAt: string }> {
  try {
    return await pushCloudSnapshot(supabase, userId, input);
  } catch (err) {
    throw new Error(syncErrorMessage(err, 'Could not enable backup.'));
  }
}

export async function disableCloudBackup(
  supabase: SupabaseClient,
  userId: string,
  deleteCloudCopy: boolean
): Promise<void> {
  const now = new Date().toISOString();

  if (deleteCloudCopy) {
    const notesTable = await getNotesTable(supabase);
    await Promise.all([
      supabase.from('user_project_boards').delete().eq('user_id', userId),
      supabase.from(notesTable).delete().eq('user_id', userId),
      supabase.from('user_open_loops').delete().eq('user_id', userId),
      supabase.from('user_night_prep_plans').delete().eq('user_id', userId),
      supabase.from('user_misc_task_lists').delete().eq('user_id', userId),
    ]);
  }

  const { error } = await supabase.from('user_sync_settings').upsert(
    {
      user_id: userId,
      cloud_enabled: false,
      last_sync_at: now,
    },
    { onConflict: 'user_id' }
  );

  if (error) throw new Error(syncErrorMessage(error, 'Could not turn off backup.'));
}

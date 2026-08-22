import type { SupabaseClient } from '@supabase/supabase-js';
import type { SimpleNote, ProjectBoard } from '@/components/agent-hq/types';
import { MAX_SYNC_PAYLOAD_BYTES } from './constants';
import { estimateJsonBytes, sanitizeNotesForCloud, sanitizeProjectsForCloud } from './sanitize';

export interface SyncSettingsRow {
  user_id: string;
  cloud_enabled: boolean;
  enabled_at: string | null;
  last_sync_at: string | null;
  projects_updated_at: string | null;
  notes_updated_at: string | null;
}

export interface CloudSnapshot {
  projects: ProjectBoard[];
  notes: SimpleNote[];
  projectsUpdatedAt: string | null;
  notesUpdatedAt: string | null;
}

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
  const [projectsRes, notesRes] = await Promise.all([
    supabase.from('user_project_boards').select('projects, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from(notesTable).select('notes, updated_at').eq('user_id', userId).maybeSingle(),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (notesRes.error) throw notesRes.error;

  return {
    projects: parseProjects(projectsRes.data?.projects),
    notes: parseNotes(notesRes.data?.notes),
    projectsUpdatedAt: projectsRes.data?.updated_at ?? null,
    notesUpdatedAt: notesRes.data?.updated_at ?? null,
  };
}

export async function pushCloudSnapshot(
  supabase: SupabaseClient,
  userId: string,
  projects: ProjectBoard[],
  notes: SimpleNote[]
): Promise<{ lastSyncAt: string }> {
  const cleanProjects = sanitizeProjectsForCloud(projects);
  const cleanNotes = sanitizeNotesForCloud(notes);

  const projectsBytes = estimateJsonBytes(cleanProjects);
  const notesBytes = estimateJsonBytes(cleanNotes);
  if (projectsBytes > MAX_SYNC_PAYLOAD_BYTES || notesBytes > MAX_SYNC_PAYLOAD_BYTES) {
    throw new Error('Backup is too large. Try removing old content or contact support.');
  }

  const now = new Date().toISOString();
  const notesTable = await getNotesTable(supabase);

  const [projectsRes, notesRes] = await Promise.all([
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
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (notesRes.error) throw notesRes.error;

  const existing = await fetchSyncSettings(supabase, userId);
  const settingsRes = await supabase.from('user_sync_settings').upsert(
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

  if (settingsRes.error) throw settingsRes.error;

  return { lastSyncAt: now };
}

export async function enableCloudBackup(
  supabase: SupabaseClient,
  userId: string,
  projects: ProjectBoard[],
  notes: SimpleNote[]
): Promise<{ lastSyncAt: string }> {
  try {
    return await pushCloudSnapshot(supabase, userId, projects, notes);
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

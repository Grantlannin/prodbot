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
  const [projectsRes, notesRes] = await Promise.all([
    supabase.from('user_project_boards').select('projects, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('user_simple_notes').select('notes, updated_at').eq('user_id', userId).maybeSingle(),
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

  const [projectsRes, notesRes] = await Promise.all([
    supabase.from('user_project_boards').upsert({
      user_id: userId,
      projects: cleanProjects,
      updated_at: now,
    }),
    supabase.from('user_simple_notes').upsert({
      user_id: userId,
      notes: cleanNotes,
      updated_at: now,
    }),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (notesRes.error) throw notesRes.error;

  const existing = await fetchSyncSettings(supabase, userId);
  const settingsRes = await supabase.from('user_sync_settings').upsert({
    user_id: userId,
    cloud_enabled: true,
    enabled_at: existing?.enabled_at ?? now,
    last_sync_at: now,
    projects_updated_at: now,
    notes_updated_at: now,
  });

  if (settingsRes.error) throw settingsRes.error;

  return { lastSyncAt: now };
}

export async function enableCloudBackup(
  supabase: SupabaseClient,
  userId: string,
  projects: ProjectBoard[],
  notes: SimpleNote[]
): Promise<{ lastSyncAt: string }> {
  return pushCloudSnapshot(supabase, userId, projects, notes);
}

export async function disableCloudBackup(
  supabase: SupabaseClient,
  userId: string,
  deleteCloudCopy: boolean
): Promise<void> {
  const now = new Date().toISOString();

  if (deleteCloudCopy) {
    await Promise.all([
      supabase.from('user_project_boards').delete().eq('user_id', userId),
      supabase.from('user_simple_notes').delete().eq('user_id', userId),
    ]);
  }

  const { error } = await supabase.from('user_sync_settings').upsert({
    user_id: userId,
    cloud_enabled: false,
    last_sync_at: now,
  });

  if (error) throw error;
}

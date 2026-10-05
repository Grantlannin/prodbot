import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { buildSupportFingerprint } from './fingerprint';
import type {
  SupportDebugSnapshot,
  SupportSurface,
  SupportTicketRow,
  SupportTicketStatus,
  SupportUniqueBugRow,
} from './types';

export interface CreateSupportTicketInput {
  userId?: string | null;
  userEmail?: string | null;
  subject: string;
  message: string;
  surface: SupportSurface;
  debug: SupportDebugSnapshot;
  screenshotPath?: string | null;
}

export interface CreateSupportTicketResult {
  ticket: SupportTicketRow;
  uniqueBug: SupportUniqueBugRow;
  isDuplicate: boolean;
  fingerprint: string;
}

export async function createSupportTicket(
  input: CreateSupportTicketInput
): Promise<CreateSupportTicketResult> {
  const admin = createAdminSupabaseClient();
  const fingerprint = buildSupportFingerprint({
    surface: input.surface,
    subject: input.subject,
    message: input.message,
    debug: input.debug,
  });

  const { data: existingBug } = await admin
    .from('support_unique_bugs')
    .select('*')
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  let uniqueBug: SupportUniqueBugRow;
  let isDuplicate = false;

  if (existingBug) {
    isDuplicate = true;
    const nextCount = (existingBug.reporter_count as number) + 1;
    const { data: updated, error } = await admin
      .from('support_unique_bugs')
      .update({
        reporter_count: nextCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingBug.id)
      .select('*')
      .single();
    if (error || !updated) throw error || new Error('Failed to update unique bug');
    uniqueBug = updated as SupportUniqueBugRow;
  } else {
    const requiresStore = input.surface === 'extension';
    const { data: created, error } = await admin
      .from('support_unique_bugs')
      .insert({
        fingerprint,
        title: input.subject.slice(0, 120) || 'Untitled issue',
        surface: input.surface,
        status: 'pending',
        reporter_count: 1,
        requires_store_upload: requiresStore,
      })
      .select('*')
      .single();
    if (error || !created) throw error || new Error('Failed to create unique bug');
    uniqueBug = created as SupportUniqueBugRow;
  }

  const { data: ticket, error: ticketError } = await admin
    .from('support_tickets')
    .insert({
      user_id: input.userId || null,
      user_email: input.userEmail || null,
      unique_bug_id: uniqueBug.id,
      fingerprint,
      subject: input.subject,
      message: input.message,
      surface: input.surface,
      status: uniqueBug.status === 'resolved' ? 'pending' : uniqueBug.status,
      screenshot_path: input.screenshotPath || null,
      debug: input.debug,
    })
    .select('*')
    .single();

  if (ticketError || !ticket) throw ticketError || new Error('Failed to create ticket');

  return {
    ticket: ticket as SupportTicketRow,
    uniqueBug,
    isDuplicate,
    fingerprint,
  };
}

export async function listUserTickets(userId: string): Promise<SupportTicketRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as SupportTicketRow[];
}

export async function listOpsTickets(opts?: {
  status?: SupportTicketStatus | 'all';
  limit?: number;
}): Promise<{
  tickets: SupportTicketRow[];
  uniqueBugs: SupportUniqueBugRow[];
}> {
  const admin = createAdminSupabaseClient();
  const limit = opts?.limit ?? 100;
  let ticketQuery = admin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.status && opts.status !== 'all') {
    ticketQuery = ticketQuery.eq('status', opts.status);
  }

  const [ticketsRes, bugsRes] = await Promise.all([
    ticketQuery,
    admin
      .from('support_unique_bugs')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100),
  ]);

  if (ticketsRes.error) throw ticketsRes.error;
  if (bugsRes.error) throw bugsRes.error;

  return {
    tickets: (ticketsRes.data || []) as SupportTicketRow[],
    uniqueBugs: (bugsRes.data || []) as SupportUniqueBugRow[],
  };
}

export async function updateTicketStatus(input: {
  ticketId: string;
  status: SupportTicketStatus;
  fixNote?: string | null;
  shippedVersion?: string | null;
  fanOutUniqueBug?: boolean;
}): Promise<SupportTicketRow> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: now,
  };
  if (input.fixNote !== undefined) patch.fix_note = input.fixNote;
  if (input.status === 'resolved') patch.resolved_at = now;
  if (input.status === 'still_broken' || input.status === 'pending') patch.resolved_at = null;

  const { data: ticket, error } = await admin
    .from('support_tickets')
    .update(patch)
    .eq('id', input.ticketId)
    .select('*')
    .single();
  if (error || !ticket) throw error || new Error('Ticket update failed');

  if (input.fanOutUniqueBug !== false && ticket.unique_bug_id) {
    const bugPatch: Record<string, unknown> = {
      status: input.status,
      updated_at: now,
    };
    if (input.fixNote !== undefined) bugPatch.fix_note = input.fixNote;
    if (input.shippedVersion !== undefined) bugPatch.shipped_version = input.shippedVersion;

    await admin.from('support_unique_bugs').update(bugPatch).eq('id', ticket.unique_bug_id);

    // Fan out amber / resolved to all tickets on this unique bug
    if (input.status === 'awaiting_user' || input.status === 'fix_ready' || input.status === 'resolved') {
      await admin
        .from('support_tickets')
        .update({
          status: input.status,
          fix_note: input.fixNote ?? ticket.fix_note,
          updated_at: now,
          ...(input.status === 'resolved' ? { resolved_at: now } : {}),
        })
        .eq('unique_bug_id', ticket.unique_bug_id)
        .neq('id', ticket.id);
    }
  }

  return ticket as SupportTicketRow;
}

export async function userRetestTicket(input: {
  ticketId: string;
  userId: string;
  result: 'green' | 'red';
  note?: string | null;
}): Promise<SupportTicketRow> {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: loadError } = await admin
    .from('support_tickets')
    .select('*')
    .eq('id', input.ticketId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!existing) throw new Error('Ticket not found');
  if (existing.status !== 'awaiting_user' && existing.status !== 'fix_ready') {
    throw new Error('Ticket is not ready for retest');
  }

  const status: SupportTicketStatus = input.result === 'green' ? 'resolved' : 'still_broken';
  const now = new Date().toISOString();
  const { data: ticket, error } = await admin
    .from('support_tickets')
    .update({
      status,
      user_retest_note: input.note?.trim() || null,
      updated_at: now,
      resolved_at: status === 'resolved' ? now : null,
    })
    .eq('id', input.ticketId)
    .select('*')
    .single();
  if (error || !ticket) throw error || new Error('Retest update failed');

  if (ticket.unique_bug_id && status === 'still_broken') {
    await admin
      .from('support_unique_bugs')
      .update({ status: 'still_broken', updated_at: now })
      .eq('id', ticket.unique_bug_id);
  }

  return ticket as SupportTicketRow;
}

export async function uploadSupportScreenshot(
  ticketKey: string,
  file: File
): Promise<string | null> {
  try {
    const admin = createAdminSupabaseClient();
    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : 'jpg';
    const path = `${ticketKey}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from('support-screenshots').upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error('[support] screenshot upload failed', error);
      return null;
    }
    return path;
  } catch (err) {
    console.error('[support] screenshot upload error', err);
    return null;
  }
}

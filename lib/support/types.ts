export type SupportSurface = 'app' | 'extension' | 'unknown';

export type SupportTicketStatus =
  | 'pending'
  | 'investigating'
  | 'fix_ready'
  | 'awaiting_user'
  | 'resolved'
  | 'still_broken';

export interface SupportDebugSnapshot {
  lockMode?: string | null;
  sessionActive?: boolean;
  sessionId?: string | null;
  blocklistDomains?: string[];
  blocklistCount?: number;
  extensionInstalled?: boolean;
  extensionVersion?: string | null;
  browser?: string | null;
  os?: string | null;
  appUrl?: string | null;
  userAgent?: string | null;
  [key: string]: unknown;
}

export interface SupportTicketRow {
  id: string;
  ticket_number: number;
  user_id: string | null;
  user_email: string | null;
  unique_bug_id: string | null;
  fingerprint: string;
  subject: string;
  message: string;
  surface: SupportSurface;
  status: SupportTicketStatus;
  screenshot_path: string | null;
  debug: SupportDebugSnapshot;
  fix_note: string | null;
  user_retest_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SupportUniqueBugRow {
  id: string;
  fingerprint: string;
  title: string;
  surface: SupportSurface;
  status: SupportTicketStatus;
  reporter_count: number;
  requires_store_upload: boolean;
  notes: string | null;
  fix_note: string | null;
  shipped_version: string | null;
  created_at: string;
  updated_at: string;
}

export function formatTicketId(ticketNumber: number): string {
  return `DW-${ticketNumber}`;
}

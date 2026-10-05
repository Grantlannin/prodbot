import { NextResponse } from 'next/server';
import { isOpsAdminEmail } from '@/lib/ops/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listOpsTickets, updateTicketStatus } from '@/lib/support/tickets';
import {
  formatTicketId,
  type SupportTicketStatus,
} from '@/lib/support/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = new Set<SupportTicketStatus>([
  'pending',
  'investigating',
  'fix_ready',
  'awaiting_user',
  'resolved',
  'still_broken',
]);

async function requireOpsAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  if (!isOpsAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: Request) {
  const gate = await requireOpsAdmin();
  if ('error' in gate && gate.error) return gate.error;

  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status') || 'all';
    const status =
      statusParam === 'all' || STATUSES.has(statusParam as SupportTicketStatus)
        ? (statusParam as SupportTicketStatus | 'all')
        : 'all';

    const { tickets, uniqueBugs } = await listOpsTickets({ status });
    return NextResponse.json({
      tickets: tickets.map(t => ({
        ...t,
        displayId: formatTicketId(t.ticket_number),
      })),
      uniqueBugs,
    });
  } catch (error) {
    console.error('[ops/tickets GET]', error);
    return NextResponse.json({ error: 'Could not load tickets' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireOpsAdmin();
  if ('error' in gate && gate.error) return gate.error;

  try {
    const body = (await req.json()) as {
      ticketId?: string;
      status?: SupportTicketStatus;
      fixNote?: string;
      shippedVersion?: string;
      fanOutUniqueBug?: boolean;
    };

    if (!body.ticketId || !body.status || !STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'ticketId and valid status required' }, { status: 400 });
    }

    const ticket = await updateTicketStatus({
      ticketId: body.ticketId,
      status: body.status,
      fixNote: body.fixNote ?? undefined,
      shippedVersion: body.shippedVersion ?? undefined,
      fanOutUniqueBug: body.fanOutUniqueBug,
    });

    return NextResponse.json({
      ticket: { ...ticket, displayId: formatTicketId(ticket.ticket_number) },
    });
  } catch (error) {
    console.error('[ops/tickets PATCH]', error);
    return NextResponse.json({ error: 'Could not update ticket' }, { status: 500 });
  }
}

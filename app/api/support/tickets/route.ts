import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listUserTickets, userRetestTicket } from '@/lib/support/tickets';
import { formatTicketId } from '@/lib/support/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tickets = await listUserTickets(user.id);
    return NextResponse.json({
      tickets: tickets.map(t => ({
        ...t,
        displayId: formatTicketId(t.ticket_number),
      })),
    });
  } catch (error) {
    console.error('[support/tickets GET]', error);
    return NextResponse.json({ error: 'Could not load tickets' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = (await req.json()) as {
      ticketId?: string;
      result?: 'green' | 'red';
      note?: string;
    };

    if (!body.ticketId || (body.result !== 'green' && body.result !== 'red')) {
      return NextResponse.json({ error: 'ticketId and result (green|red) required' }, { status: 400 });
    }

    const ticket = await userRetestTicket({
      ticketId: body.ticketId,
      userId: user.id,
      result: body.result,
      note: body.note ?? null,
    });

    return NextResponse.json({
      ticket: { ...ticket, displayId: formatTicketId(ticket.ticket_number) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update ticket';
    console.error('[support/tickets PATCH]', error);
    const status = /not found|not ready/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

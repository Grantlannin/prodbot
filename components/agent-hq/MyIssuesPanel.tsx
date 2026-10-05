'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useAuth } from './hooks/AuthProvider';
import type { SupportTicketStatus } from '@/lib/support/types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface TicketItem {
  id: string;
  status: SupportTicketStatus;
}

/** Nav status only — hidden unless the user has an open ticket. */
export default function MyIssuesPanel() {
  const { user } = useAuth();
  const [hasLiveTicket, setHasLiveTicket] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setHasLiveTicket(false);
      return;
    }
    try {
      const res = await fetch('/api/support/tickets');
      const data = (await res.json()) as { tickets?: TicketItem[] };
      if (!res.ok) {
        setHasLiveTicket(false);
        return;
      }
      const live = (data.tickets || []).some(t => t.status !== 'resolved');
      setHasLiveTicket(live);
    } catch {
      setHasLiveTicket(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener('daywinner:tickets-changed', onChange);
    return () => window.removeEventListener('daywinner:tickets-changed', onChange);
  }, [load]);

  if (!user || !hasLiveTicket) return null;

  return <span style={statusStyle}>fix request: sent</span>;
}

const statusStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  fontFamily: font,
  color: '#94a3b8',
  whiteSpace: 'nowrap',
};

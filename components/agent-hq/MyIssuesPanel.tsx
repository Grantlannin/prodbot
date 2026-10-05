'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './hooks/AuthProvider';
import type { SupportTicketStatus } from '@/lib/support/types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface TicketItem {
  id: string;
  displayId: string;
  subject: string;
  status: SupportTicketStatus;
  fix_note: string | null;
  created_at: string;
}

function lightColor(status: SupportTicketStatus): string {
  if (status === 'resolved') return '#22c55e';
  if (status === 'awaiting_user' || status === 'fix_ready') return '#f59e0b';
  if (status === 'still_broken') return '#ef4444';
  return '#ef4444';
}

function statusLabel(status: SupportTicketStatus): string {
  switch (status) {
    case 'resolved':
      return 'Fixed';
    case 'awaiting_user':
    case 'fix_ready':
      return 'Ready to test';
    case 'still_broken':
      return 'Still broken';
    case 'investigating':
      return 'Investigating';
    default:
      return 'Pending';
  }
}

export default function MyIssuesPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setTickets([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/support/tickets');
      const data = (await res.json()) as { tickets?: TicketItem[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
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

  if (!user) return null;

  const openCount = tickets.filter(t => t.status !== 'resolved').length;
  const needsRetest = tickets.some(
    t => t.status === 'awaiting_user' || t.status === 'fix_ready'
  );

  const retest = async (ticketId: string, result: 'green' | 'red') => {
    setActingId(ticketId);
    setError(null);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, result }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={navLinkStyle} title="My issues">
        my issues
        {openCount > 0 ? (
          <span
            style={{
              ...dotStyle,
              background: needsRetest ? '#f59e0b' : '#ef4444',
            }}
          />
        ) : null}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div style={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
              <div style={styles.panel} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={styles.header}>
                  <h3 style={styles.title}>my issues</h3>
                  <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                    ×
                  </button>
                </div>
                <div style={styles.body}>
                  {loading ? <p style={styles.muted}>Loading…</p> : null}
                  {error ? <p style={styles.error}>{error}</p> : null}
                  {!loading && tickets.length === 0 ? (
                    <p style={styles.muted}>No tickets yet. Use “not working?” to file one.</p>
                  ) : null}
                  {tickets.map(t => (
                    <div key={t.id} style={styles.card}>
                      <div style={styles.cardTop}>
                        <span style={{ ...dotStyle, background: lightColor(t.status), marginRight: 8 }} />
                        <strong style={styles.id}>{t.displayId}</strong>
                        <span style={styles.status}>{statusLabel(t.status)}</span>
                      </div>
                      <div style={styles.subject}>{t.subject}</div>
                      {t.fix_note && (t.status === 'awaiting_user' || t.status === 'fix_ready') ? (
                        <p style={styles.fixNote}>{t.fix_note}</p>
                      ) : null}
                      {(t.status === 'awaiting_user' || t.status === 'fix_ready') && (
                        <div style={styles.actions}>
                          <button
                            type="button"
                            disabled={actingId === t.id}
                            onClick={() => void retest(t.id, 'green')}
                            style={styles.greenBtn}
                          >
                            Green — fixed for me
                          </button>
                          <button
                            type="button"
                            disabled={actingId === t.id}
                            onClick={() => void retest(t.id, 'red')}
                            style={styles.redBtn}
                          >
                            Red — still broken
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const navLinkStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: '0 2px',
  margin: 0,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: font,
  color: '#94a3b8',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const dotStyle: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 10050,
  },
  panel: {
    width: 'min(100%, 440px)',
    maxHeight: '85vh',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 650,
    color: '#0f172a',
    textTransform: 'lowercase',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  body: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'auto',
  },
  muted: { margin: 0, fontSize: 13, color: '#64748b' },
  error: { margin: 0, fontSize: 12, color: '#b45309' },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 12,
    background: '#f8fafc',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  id: { fontSize: 12, color: '#0f172a' },
  status: { marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 600 },
  subject: { fontSize: 13, color: '#334155', lineHeight: 1.4 },
  fixNote: { margin: '8px 0 0', fontSize: 12, color: '#92400e', lineHeight: 1.4 },
  actions: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  greenBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 10px',
    background: '#15803d',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  redBtn: {
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 10px',
    background: '#fff',
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

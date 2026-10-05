'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { OpsMetrics } from '@/lib/ops/metrics';
import type {
  SupportTicketStatus,
  SupportUniqueBugRow,
} from '@/lib/support/types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type Tab = 'pulse' | 'tickets';
type TicketFilter = 'all' | SupportTicketStatus;
type TicketView = 'uniques' | 'tickets';

interface OpsTicket {
  id: string;
  displayId: string;
  ticket_number: number;
  user_email: string | null;
  unique_bug_id: string | null;
  fingerprint: string;
  subject: string;
  message: string;
  surface: string;
  status: SupportTicketStatus;
  screenshot_path: string | null;
  debug: Record<string, unknown>;
  fix_note: string | null;
  created_at: string;
  updated_at: string;
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      {hint ? <div style={styles.statHint}>{hint}</div> : null}
    </div>
  );
}

function light(status: SupportTicketStatus): string {
  if (status === 'resolved') return '#22c55e';
  if (status === 'awaiting_user' || status === 'fix_ready') return '#f59e0b';
  if (status === 'still_broken') return '#ef4444';
  return '#ef4444';
}

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const FILTERS: Array<{ id: TicketFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'investigating', label: 'Investigating' },
  { id: 'fix_ready', label: 'Fix ready' },
  { id: 'awaiting_user', label: 'Awaiting user' },
  { id: 'still_broken', label: 'Red' },
  { id: 'resolved', label: 'Resolved' },
];

export default function OpsDashboard() {
  const [tab, setTab] = useState<Tab>('pulse');
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [ticketView, setTicketView] = useState<TicketView>('uniques');
  const [filter, setFilter] = useState<TicketFilter>('all');
  const [tickets, setTickets] = useState<OpsTicket[]>([]);
  const [uniqueBugs, setUniqueBugs] = useState<SupportUniqueBugRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fixNote, setFixNote] = useState('');
  const [shippedVersion, setShippedVersion] = useState('');
  const [saving, setSaving] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const loadPulse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/metrics');
      const json = (await res.json()) as OpsMetrics & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setTicketsError(null);
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/ops/tickets${qs}`);
      const json = (await res.json()) as {
        tickets?: OpsTicket[];
        uniqueBugs?: SupportUniqueBugRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || 'Failed to load tickets');
      setTickets(json.tickets || []);
      setUniqueBugs(json.uniqueBugs || []);
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Failed to load tickets');
    }
  }, [filter]);

  useEffect(() => {
    void loadPulse();
  }, [loadPulse]);

  useEffect(() => {
    if (tab === 'tickets') void loadTickets();
  }, [tab, loadTickets]);

  const selected = tickets.find(t => t.id === selectedId) || null;

  useEffect(() => {
    if (selected) {
      setFixNote(selected.fix_note || '');
      setShippedVersion('');
    }
  }, [selected]);

  const updateStatus = async (status: SupportTicketStatus) => {
    if (!selected) return;
    setSaving(true);
    setTicketsError(null);
    try {
      const res = await fetch('/api/ops/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selected.id,
          status,
          fixNote: fixNote || undefined,
          shippedVersion: shippedVersion || undefined,
          fanOutUniqueBug: true,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Update failed');
      await loadTickets();
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const maxDay = Math.max(1, ...(data?.signupsByDay.map(d => d.signups) ?? [1]));
  const openUniques = uniqueBugs.filter(b => b.status !== 'resolved');

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Daywinner ops</h1>
          <p style={styles.sub}>Pulse metrics + Solution Loop tickets</p>
        </div>
        <button
          type="button"
          onClick={() => void (tab === 'pulse' ? loadPulse() : loadTickets())}
          style={styles.refresh}
          disabled={loading}
        >
          {loading && tab === 'pulse' ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <div style={styles.tabs}>
        <button
          type="button"
          style={tab === 'pulse' ? styles.tabActive : styles.tab}
          onClick={() => setTab('pulse')}
        >
          Pulse
        </button>
        <button
          type="button"
          style={tab === 'tickets' ? styles.tabActive : styles.tab}
          onClick={() => setTab('tickets')}
        >
          Tickets{openUniques.length ? ` (${openUniques.length} open uniques)` : ''}
        </button>
      </div>

      {tab === 'pulse' ? (
        <>
          {error ? <p style={styles.error}>{error}</p> : null}
          {data ? (
            <>
              <section style={styles.section}>
                <h2 style={styles.h2}>Signups</h2>
                <div style={styles.grid}>
                  <Stat label="Today (UTC)" value={data.windows.signupsToday} />
                  <Stat label="Last 7 days" value={data.windows.signups7d} />
                  <Stat label="Last 30 days" value={data.windows.signups30d} />
                  <Stat label="All profiles" value={data.totals.profiles} />
                </div>
                <div style={styles.chart}>
                  {data.signupsByDay.map(d => (
                    <div key={d.date} style={styles.barCol} title={`${d.date}: ${d.signups}`}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${Math.max(2, (d.signups / maxDay) * 100)}%`,
                        }}
                      />
                      <span style={styles.barLabel}>{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <p style={styles.caption}>Daily signups (UTC) · last 30 days</p>
              </section>

              <section style={styles.section}>
                <h2 style={styles.h2}>Subscriptions</h2>
                <div style={styles.grid}>
                  <Stat label="Active" value={data.totals.active} />
                  <Stat label="Trialing" value={data.totals.trialing} />
                  <Stat label="Past due" value={data.totals.pastDue} />
                  <Stat label="Canceled" value={data.totals.canceled} />
                  <Stat label="None / unpaid" value={data.totals.none} />
                  <Stat
                    label="Ending soon"
                    value={data.totals.endingSoon}
                    hint="Cancel at period end"
                  />
                  <Stat label="Stripe customers" value={data.totals.withStripeCustomer} />
                  <Stat label="Course access" value={data.totals.courseAccess} />
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.h2}>Continue-email outbox</h2>
                <div style={styles.grid}>
                  <Stat label="Pending" value={data.emailOutbox.pending} />
                  <Stat label="Sending" value={data.emailOutbox.sending} />
                  <Stat label="Sent" value={data.emailOutbox.sent} />
                  <Stat label="Failed" value={data.emailOutbox.failed} />
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.h2}>Infra</h2>
                <ul style={styles.list}>
                  <li>Stripe: {data.infra.hasStripeSecret ? data.infra.stripeKeyMode : 'missing'}</li>
                  <li>Billing enabled: {String(data.infra.billingEnabled)}</li>
                  <li>
                    Resend: {data.infra.resendConfigured ? data.infra.resendFrom || 'configured' : 'off'}
                  </li>
                  <li>Cron secret: {data.infra.cronSecretConfigured ? 'set' : 'missing'}</li>
                  <li>Supabase: {data.infra.supabaseConfigured ? 'configured' : 'missing'}</li>
                  <li>App URL: {data.infra.appUrl || '—'}</li>
                </ul>
                <div style={styles.links}>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                    Stripe Dashboard
                  </a>
                  <a href="https://resend.com/emails" target="_blank" rel="noreferrer">
                    Resend (quota / sends)
                  </a>
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
                    Supabase (plan / Auth)
                  </a>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">
                    Vercel
                  </a>
                </div>
                {data.infra.notes.map(n => (
                  <p key={n} style={styles.note}>
                    {n}
                  </p>
                ))}
                <p style={styles.caption}>Updated {new Date(data.generatedAt).toLocaleString()}</p>
              </section>
            </>
          ) : null}
        </>
      ) : (
        <>
          {ticketsError ? <p style={styles.error}>{ticketsError}</p> : null}

          <div style={styles.tabs}>
            <button
              type="button"
              style={ticketView === 'uniques' ? styles.tabActive : styles.tab}
              onClick={() => setTicketView('uniques')}
            >
              Unique bugs
            </button>
            <button
              type="button"
              style={ticketView === 'tickets' ? styles.tabActive : styles.tab}
              onClick={() => setTicketView('tickets')}
            >
              All tickets
            </button>
          </div>

          <div style={styles.filterRow}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                style={filter === f.id ? styles.chipActive : styles.chip}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {ticketView === 'uniques' ? (
            <section style={styles.section}>
              <h2 style={styles.h2}>Unique bugs (scale unit)</h2>
              {uniqueBugs.length === 0 ? (
                <p style={styles.caption}>No unique bugs yet. File one via “not working?”.</p>
              ) : (
                <div style={styles.table}>
                  {uniqueBugs
                    .filter(b => filter === 'all' || b.status === filter)
                    .map(b => (
                      <div key={b.id} style={styles.row}>
                        <span style={{ ...styles.dot, background: light(b.status) }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.rowTitle}>{b.title}</div>
                          <div style={styles.rowMeta}>
                            <code style={styles.code}>{b.fingerprint}</code>
                            {' · '}
                            {b.reporter_count} reporter{b.reporter_count === 1 ? '' : 's'}
                            {' · '}
                            {b.surface}
                            {' · '}
                            {ageLabel(b.updated_at)}
                          </div>
                          {b.requires_store_upload ? (
                            <div style={styles.gate}>
                              Extension — best-shot unpacked gate before Chrome Web Store upload
                            </div>
                          ) : null}
                        </div>
                        <span style={styles.statusTag}>{b.status}</span>
                      </div>
                    ))}
                </div>
              )}
            </section>
          ) : (
            <div style={styles.split}>
              <section style={{ ...styles.section, flex: 1, minWidth: 0 }}>
                <h2 style={styles.h2}>Tickets</h2>
                <div style={styles.table}>
                  {tickets.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      style={selectedId === t.id ? styles.ticketRowActive : styles.ticketRow}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <span style={{ ...styles.dot, background: light(t.status) }} />
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={styles.rowTitle}>
                          {t.displayId} · {t.subject}
                        </div>
                        <div style={styles.rowMeta}>
                          {t.surface} · ext {String(t.debug?.extensionVersion || '—')} ·{' '}
                          {ageLabel(t.created_at)}
                        </div>
                      </div>
                    </button>
                  ))}
                  {tickets.length === 0 ? (
                    <p style={styles.caption}>No tickets for this filter.</p>
                  ) : null}
                </div>
              </section>

              <section style={{ ...styles.section, flex: 1.1, minWidth: 0 }}>
                <h2 style={styles.h2}>Detail</h2>
                {!selected ? (
                  <p style={styles.caption}>Select a ticket.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <strong>{selected.displayId}</strong> · {selected.status}
                    </div>
                    <div style={styles.rowMeta}>
                      {selected.user_email || 'no email'} · {selected.fingerprint}
                    </div>
                    {selected.surface === 'extension' ? (
                      <div style={styles.gate}>
                        Extension bug — smoke-test unpacked best shot before store submit
                      </div>
                    ) : null}
                    <p style={styles.message}>{selected.message}</p>
                    <pre style={styles.debug}>{JSON.stringify(selected.debug, null, 2)}</pre>
                    <label style={styles.label}>
                      Fix note (shown to user on amber)
                      <textarea
                        value={fixNote}
                        onChange={e => setFixNote(e.target.value)}
                        rows={3}
                        style={styles.textarea}
                        placeholder="Update to 1.2.x / refresh, then try: …"
                      />
                    </label>
                    <label style={styles.label}>
                      Shipped version (optional)
                      <input
                        value={shippedVersion}
                        onChange={e => setShippedVersion(e.target.value)}
                        style={styles.input}
                        placeholder="1.2.4"
                      />
                    </label>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        disabled={saving}
                        style={styles.actionBtn}
                        onClick={() => void updateStatus('investigating')}
                      >
                        Investigating
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        style={styles.actionBtn}
                        onClick={() => void updateStatus('awaiting_user')}
                      >
                        Amber — ask user
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        style={styles.actionBtn}
                        onClick={() => void updateStatus('resolved')}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        style={styles.actionBtnWarn}
                        onClick={() => void updateStatus('still_broken')}
                      >
                        Mark red
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: font,
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 20px 64px',
    color: '#0f172a',
    background: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  h1: { margin: 0, fontSize: 28, letterSpacing: '-0.03em' },
  sub: { margin: '6px 0 0', color: '#64748b', fontSize: 14 },
  refresh: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 10,
    padding: '10px 14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabs: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 999,
    padding: '8px 14px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    color: '#475569',
  },
  tabActive: {
    border: '1px solid #0f172a',
    background: '#0f172a',
    borderRadius: 999,
    padding: '8px 14px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    color: '#fff',
  },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    border: '1px solid #e2e8f0',
    background: '#fff',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#64748b',
  },
  chipActive: {
    border: '1px solid #0f172a',
    background: '#0f172a',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#fff',
  },
  error: { color: '#b91c1c', fontWeight: 600 },
  section: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  h2: { margin: '0 0 14px', fontSize: 16, fontWeight: 700 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  stat: {
    background: '#f8fafc',
    borderRadius: 10,
    padding: '12px 14px',
  },
  statValue: { fontSize: 26, fontWeight: 750, letterSpacing: '-0.03em' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 600 },
  statHint: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 3,
    height: 120,
    marginTop: 18,
    paddingTop: 8,
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  bar: {
    width: '100%',
    maxWidth: 14,
    background: '#0f172a',
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 4,
    transform: 'rotate(-60deg)',
    whiteSpace: 'nowrap',
  },
  caption: { margin: '10px 0 0', fontSize: 12, color: '#94a3b8' },
  list: { margin: 0, paddingLeft: 18, color: '#334155', lineHeight: 1.7, fontSize: 14 },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 14,
    fontSize: 13,
    fontWeight: 600,
  },
  note: { margin: '10px 0 0', fontSize: 12, color: '#64748b' },
  table: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: 10,
  },
  ticketRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: 10,
    border: '1px solid transparent',
    cursor: 'pointer',
    width: '100%',
    fontFamily: font,
  },
  ticketRowActive: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: '#eef2ff',
    borderRadius: 10,
    border: '1px solid #c7d2fe',
    cursor: 'pointer',
    width: '100%',
    fontFamily: font,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    marginTop: 5,
    flexShrink: 0,
  },
  rowTitle: { fontSize: 13, fontWeight: 650, color: '#0f172a' },
  rowMeta: { fontSize: 11, color: '#64748b', marginTop: 3, wordBreak: 'break-word' },
  code: { fontSize: 11, background: '#e2e8f0', padding: '1px 4px', borderRadius: 4 },
  statusTag: { fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' },
  gate: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: 650,
    color: '#92400e',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 8,
    padding: '6px 8px',
  },
  split: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  message: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontSize: 13,
    lineHeight: 1.45,
    color: '#334155',
    background: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  debug: {
    margin: 0,
    fontSize: 11,
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    overflow: 'auto',
    maxHeight: 180,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  textarea: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: font,
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: font,
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 650,
    cursor: 'pointer',
  },
  actionBtnWarn: {
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#b91c1c',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 650,
    cursor: 'pointer',
  },
};

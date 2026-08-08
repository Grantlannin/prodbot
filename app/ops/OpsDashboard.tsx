'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { OpsMetrics } from '@/lib/ops/metrics';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      {hint ? <div style={styles.statHint}>{hint}</div> : null}
    </div>
  );
}

export default function OpsDashboard() {
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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

  useEffect(() => {
    void load();
  }, [load]);

  const maxDay = Math.max(1, ...(data?.signupsByDay.map(d => d.signups) ?? [1]));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Daywinner pulse</h1>
          <p style={styles.sub}>Signups, billing state, email outbox, infra checks</p>
        </div>
        <button type="button" onClick={() => void load()} style={styles.refresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

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
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    fontFamily: font,
    maxWidth: 960,
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
    marginBottom: 28,
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
};

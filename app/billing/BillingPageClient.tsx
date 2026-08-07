'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface PlanInfo {
  active: boolean;
  status: string;
  planName: string;
  priceLabel: string;
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
  error?: string;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BillingPageClient() {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/plan');
      const data = (await res.json()) as PlanInfo;
      if (!res.ok) throw new Error(data.error ?? 'Could not load billing.');
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing.');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    if (
      !window.confirm(
        'Cancel your Daywinner subscription? You’ll keep access until the end of your current billing period.'
      )
    ) {
      return;
    }
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/plan', { method: 'POST' });
      const data = (await res.json()) as { error?: string; endsAt?: string | null };
      if (!res.ok) throw new Error(data.error ?? 'Could not cancel.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel.');
    } finally {
      setCanceling(false);
    }
  };

  const endsLabel = formatDate(plan?.endsAt ?? null);

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>Billing</h1>
          <p style={styles.lead}>Your current plan</p>

          {loading ? <p style={styles.meta}>Loading…</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          {!loading && plan ? (
            <>
              <div style={styles.planBox}>
                <div style={styles.planName}>{plan.planName}</div>
                <div style={styles.planPrice}>{plan.priceLabel}</div>
                {plan.cancelAtPeriodEnd && endsLabel ? (
                  <p style={styles.notice}>Cancels on {endsLabel}. You’ll have access until then.</p>
                ) : plan.active && endsLabel ? (
                  <p style={styles.meta}>Renews / current period ends {endsLabel}</p>
                ) : plan.active ? (
                  <p style={styles.meta}>Active subscription</p>
                ) : (
                  <p style={styles.meta}>No active subscription</p>
                )}
              </div>

              {plan.active && !plan.cancelAtPeriodEnd ? (
                <button type="button" style={styles.cancelBtn} disabled={canceling} onClick={() => void handleCancel()}>
                  {canceling ? 'Canceling…' : 'Cancel subscription'}
                </button>
              ) : null}
            </>
          ) : null}

          <Link href="/app" style={styles.backLink}>
            ← Back to Daywinner
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 48,
    fontFamily: font,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: '28px 24px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
  },
  lead: {
    margin: 0,
    fontSize: 14,
    color: '#64748b',
  },
  planBox: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '16px 14px',
    background: '#f8fafc',
  },
  planName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  planPrice: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
  },
  meta: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#64748b',
  },
  notice: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#b45309',
    lineHeight: 1.45,
  },
  cancelBtn: {
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: font,
    background: '#fff',
    color: '#b91c1c',
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
  },
  backLink: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    textDecoration: 'none',
  },
};

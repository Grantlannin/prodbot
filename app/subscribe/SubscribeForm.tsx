'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/agent-hq/hooks/AuthProvider';
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_SHORT } from '@/lib/billing/price';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface BillingStatus {
  billingEnabled: boolean;
  active: boolean;
  status: string;
  endsAt: string | null;
}

export default function SubscribeForm() {
  const searchParams = useSearchParams();
  const { user, email, loading: authLoading, signOut } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canceled = searchParams.get('canceled') === '1';
  const notice = useMemo(() => {
    if (canceled) return 'Checkout canceled. Subscribe whenever you are ready.';
    return null;
  }, [canceled]);

  useEffect(() => {
    if (authLoading) return;
    void fetch('/api/billing/status')
      .then(res => res.json())
      .then(data => setStatus(data as BillingStatus))
      .catch(() => setError('Could not load billing status.'));
  }, [authLoading, user]);

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not start checkout.');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not open billing portal.');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal.');
      setBusy(false);
    }
  };

  if (authLoading || !status) {
    return (
      <MarketingShell showSignIn={false}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <p style={styles.lead}>Loading…</p>
          </div>
        </div>
      </MarketingShell>
    );
  }

  if (!status.billingEnabled) {
    return (
      <MarketingShell showSignIn={false}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h1 style={styles.title}>Billing not configured</h1>
            <p style={styles.lead}>Stripe env vars are not set on this deployment yet.</p>
            <Link href="/app" style={styles.backLink}>
              Open app anyway →
            </Link>
          </div>
        </div>
      </MarketingShell>
    );
  }

  const showPortal = status.status === 'past_due' || status.status === 'canceled';

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>Subscribe to Daywinner</h1>
          <p style={styles.lead}>
            {MONTHLY_PRICE_LABEL}/month. Your projects, timer, and day plan stay in your browser — we only store your
            account and subscription status.
          </p>

          {email ? <p style={styles.account}>Signed in as {email}</p> : null}
          {notice ? <p style={styles.notice}>{notice}</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          <ul style={styles.featureList}>
            <li>Dashboard, timer, and session locks</li>
            <li>Projects, notes, and EOD reports</li>
            <li>Chrome extension for site blocking</li>
          </ul>

          <button type="button" onClick={startCheckout} disabled={busy} style={styles.primaryBtn}>
            {busy ? 'Redirecting to Stripe…' : `Subscribe — ${MONTHLY_PRICE_SHORT}`}
          </button>

          {showPortal ? (
            <button type="button" onClick={openPortal} disabled={busy} style={styles.secondaryBtn}>
              Manage billing
            </button>
          ) : null}

          <button type="button" onClick={() => signOut()} style={styles.linkBtn}>
            Sign out
          </button>
        </div>
      </div>
    </MarketingShell>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 48,
    fontFamily: font,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: '28px 24px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
  },
  lead: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: '#64748b',
  },
  account: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  featureList: {
    margin: '4px 0 8px',
    paddingLeft: 18,
    color: '#334155',
    fontSize: 14,
    lineHeight: 1.6,
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 10,
    padding: '13px 14px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  secondaryBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  linkBtn: {
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    alignSelf: 'flex-start',
    padding: 0,
  },
  backLink: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    textDecoration: 'none',
    fontFamily: font,
  },
  notice: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fffbeb',
    color: '#92400e',
    fontSize: 13,
  },
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
  },
};

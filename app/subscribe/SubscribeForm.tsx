'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canceled = searchParams.get('canceled') === '1';
  const notice = useMemo(() => {
    if (canceled) return 'Checkout canceled. Subscribe whenever you are ready.';
    return null;
  }, [canceled]);

  useEffect(() => {
    void fetch('/api/billing/status')
      .then(async res => {
        const data = (await res.json()) as BillingStatus & { error?: string };
        if (!res.ok || typeof data.billingEnabled !== 'boolean') {
          throw new Error(data.error ?? 'Could not load billing status.');
        }
        setStatus(data);
      })
      .catch(() => setError('Could not load billing status.'));
  }, []);

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

  if (!status) {
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

  if (status.active) {
    return (
      <MarketingShell showSignIn={false}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h1 style={styles.title}>You&apos;re subscribed</h1>
            <p style={styles.lead}>Your Daywinner account is active. Jump back into the app.</p>
            <Link
              href="/app"
              style={{ ...styles.primaryBtn, display: 'block', textAlign: 'center', textDecoration: 'none' }}
            >
              Open Daywinner →
            </Link>
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
            <h1 style={styles.title}>Billing unavailable</h1>
            <p style={styles.lead}>Checkout isn&apos;t available right now. Try again shortly.</p>
            <Link href="/" style={styles.backLink}>
              ← Back to home
            </Link>
          </div>
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>Subscribe to Daywinner</h1>
          <p style={styles.lead}>
            {MONTHLY_PRICE_LABEL}/month. Cancel anytime. You&apos;ll create your account after checkout with the same
            email.
          </p>

          {notice ? <p style={styles.notice}>{notice}</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          <ul style={styles.featureList}>
            <li>Productivity dashboard + work timer</li>
            <li>Projects, notes, wind down &amp; EOD</li>
            <li>Chrome extension for site blocking</li>
          </ul>

          <button type="button" onClick={startCheckout} disabled={busy} style={styles.primaryBtn}>
            {busy ? 'Redirecting…' : `Subscribe — ${MONTHLY_PRICE_SHORT}`}
          </button>

          <p style={styles.footerNote}>
            Already paid?{' '}
            <Link href="/login?mode=signup&next=/app" style={styles.legalLink}>
              Create account
            </Link>
            {' · '}
            <Link href="/login" style={styles.legalLink}>
              Sign in
            </Link>
          </p>

          <p style={styles.legal}>
            <Link href="/terms" style={styles.legalLink}>
              Terms
            </Link>
            {' · '}
            <Link href="/privacy" style={styles.legalLink}>
              Privacy
            </Link>
          </p>
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
  footerNote: {
    margin: 0,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  legal: {
    margin: '8px 0 0',
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  legalLink: {
    color: '#64748b',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

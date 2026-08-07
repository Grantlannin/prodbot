'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface BillingStatus {
  billingEnabled: boolean;
  active: boolean;
}

/** /subscribe is only a thin hop: already-subscribed → app, else → Stripe Checkout. */
export default function SubscribeForm() {
  const [message, setMessage] = useState('Redirecting to checkout…');
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const statusRes = await fetch('/api/billing/status');
        const status = (await statusRes.json()) as BillingStatus & { error?: string };
        if (!statusRes.ok) throw new Error(status.error ?? 'Could not load billing status.');
        if (cancelled) return;

        if (status.active) {
          setActive(true);
          return;
        }

        if (!status.billingEnabled) {
          setError('Checkout isn\'t available right now. Try again shortly.');
          setMessage('');
          return;
        }

        const res = await fetch('/api/stripe/checkout', { method: 'POST' });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? 'Could not start checkout.');
        }
        window.location.href = data.url;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not start checkout.');
        setMessage('');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (active) {
    return (
      <MarketingShell showSignIn={false}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h1 style={styles.title}>You&apos;re subscribed</h1>
            <p style={styles.lead}>Your Daywinner account is active.</p>
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

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          {message ? <p style={styles.lead}>{message}</p> : null}
          {error ? (
            <>
              <p style={styles.error}>{error}</p>
              <Link href="/" style={styles.backLink}>
                ← Back to home
              </Link>
              <p style={styles.footerNote}>
                Already paid?{' '}
                <Link href="/login?mode=signup&next=/app" style={styles.link}>
                  Create account
                </Link>
                {' · '}
                <Link href="/login" style={styles.link}>
                  Sign in
                </Link>
              </p>
            </>
          ) : null}
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
    maxWidth: 400,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: '28px 24px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
  },
  lead: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.5,
    color: '#64748b',
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
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
  },
  backLink: {
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    textDecoration: 'none',
    fontFamily: font,
  },
  footerNote: {
    margin: 0,
    fontSize: 12,
    color: '#94a3b8',
  },
  link: {
    color: '#64748b',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

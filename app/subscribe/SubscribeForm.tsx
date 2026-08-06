'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  COURSE_PRICE_LABEL,
  MONTHLY_PRICE_LABEL,
  MONTHLY_PRICE_SHORT,
} from '@/lib/billing/price';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface BillingChecks {
  paywallDisabled: boolean;
  hasStripeSecret: boolean;
  supabaseConfigured: boolean;
  billingEnabled: boolean;
}

interface BillingStatus {
  billingEnabled: boolean;
  active: boolean;
  status: string;
  endsAt: string | null;
  checks?: BillingChecks;
}

export default function SubscribeForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeCourse, setIncludeCourse] = useState(true);

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

  const checkoutLabel = includeCourse
    ? `Continue to checkout — ${MONTHLY_PRICE_SHORT} + ${COURSE_PRICE_LABEL}`
    : `Continue to checkout — ${MONTHLY_PRICE_SHORT}`;

  const startCheckout = async () => {
    if (!status?.billingEnabled) {
      setError(
        'Paywall is off on this deployment, so Stripe checkout is disabled. Turn off DISABLE_PAYWALL to test a real purchase.'
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeCourse }),
      });
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

  if (!status && !error) {
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

  const checks = status?.checks;
  const billingMissing =
    status &&
    !status.billingEnabled &&
    checks &&
    !checks.paywallDisabled &&
    (!checks.hasStripeSecret || !checks.supabaseConfigured);

  if (billingMissing) {
    const hint = !checks.hasStripeSecret
      ? 'STRIPE_SECRET_KEY is missing on this deployment.'
      : 'Supabase URL or anon key is missing on this deployment.';

    return (
      <MarketingShell showSignIn={false}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h1 style={styles.title}>Billing not configured</h1>
            <p style={styles.lead}>{hint}</p>
            <Link href="/app" style={styles.backLink}>
              Open app anyway →
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
          <h1 style={styles.title}>Checkout</h1>
          <p style={styles.planLine}>
            Daywinner bot — <strong>{MONTHLY_PRICE_LABEL}/mo</strong>
            <span style={styles.strike}> $12.99/mo</span>
          </p>

          {notice ? <p style={styles.notice}>{notice}</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          <label style={styles.bump}>
            <input
              type="checkbox"
              checked={includeCourse}
              onChange={e => setIncludeCourse(e.target.checked)}
              style={styles.bumpCheck}
            />
            <span style={styles.bumpBody}>
              <span style={styles.bumpTitle}>
                Yes — add the Daywinner Course for {COURSE_PRICE_LABEL}
              </span>
              <span style={styles.bumpSub}>One-time. Instant access after payment.</span>
            </span>
            <span style={styles.bumpPrice}>{COURSE_PRICE_LABEL}</span>
          </label>

          <button type="button" onClick={startCheckout} disabled={busy} style={styles.primaryBtn}>
            {busy ? 'Redirecting to Stripe…' : checkoutLabel}
          </button>

          <p style={styles.footerNote}>You&apos;ll create your account after checkout.</p>

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
    gap: 14,
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
  planLine: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.5,
    color: '#0f172a',
  },
  strike: {
    color: '#94a3b8',
    textDecoration: 'line-through',
    fontWeight: 500,
  },
  bump: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    margin: 0,
    padding: '14px 14px',
    borderRadius: 12,
    border: '2px solid #f59e0b',
    background: '#fffbeb',
    cursor: 'pointer',
  },
  bumpCheck: {
    marginTop: 3,
    width: 18,
    height: 18,
    accentColor: '#0f172a',
    flexShrink: 0,
  },
  bumpBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  bumpTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  bumpSub: {
    fontSize: 12,
    color: '#78716c',
    lineHeight: 1.4,
  },
  bumpPrice: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    flexShrink: 0,
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
    margin: '4px 0 0',
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

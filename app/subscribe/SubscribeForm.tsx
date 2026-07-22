'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MONTHLY_PRICE_LABEL, MONTHLY_PRICE_SHORT } from '@/lib/billing/price';
import { CHROME_DOWNLOAD_URL } from '@/lib/intro';
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

  if (!status.billingEnabled) {
    const checks = status.checks;
    const hint = !checks
      ? 'Stripe env vars are not set on this deployment yet.'
      : checks.paywallDisabled
        ? 'Paywall is disabled (DISABLE_PAYWALL or NEXT_PUBLIC_DISABLE_PAYWALL is true).'
        : !checks.hasStripeSecret
          ? 'STRIPE_SECRET_KEY is missing on the prodbot Vercel project — add it under Settings → Environment Variables, then redeploy.'
          : !checks.supabaseConfigured
            ? 'Supabase URL or anon key is missing on this deployment.'
            : 'Billing checks failed after redeploy — open /api/billing/health for details.';

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
          <h1 style={styles.title}>Subscribe to Daywinner</h1>
          <p style={styles.lead}>
            {MONTHLY_PRICE_LABEL}/month. Your projects, timer, and day plan stay in your browser — we only store your
            account and subscription status.
          </p>

          {notice ? <p style={styles.notice}>{notice}</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          <ul style={styles.featureList}>
            <li>Dashboard, timer, and session locks</li>
            <li>Projects, notes, and EOD reports</li>
            <li>Chrome extension for site blocking</li>
          </ul>

          <div style={styles.chromeNote}>
            <p style={styles.chromeNoteTitle}>Requires Google Chrome (desktop)</p>
            <p style={styles.chromeNoteText}>
              Daywinner and the focus extension run in Chrome — not Safari or Firefox.{' '}
              <a href={CHROME_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={styles.chromeLink}>
                Download Chrome
              </a>
            </p>
          </div>

          <button type="button" onClick={startCheckout} disabled={busy} style={styles.primaryBtn}>
            {busy ? 'Redirecting to Stripe…' : `Subscribe — ${MONTHLY_PRICE_SHORT}`}
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
  chromeNote: {
    margin: 0,
    padding: '12px 14px',
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  chromeNoteTitle: {
    margin: '0 0 4px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
  },
  chromeNoteText: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#64748b',
  },
  chromeLink: {
    color: '#1d4ed8',
    fontWeight: 600,
    textDecoration: 'none',
  },
  legal: {
    margin: '8px 0 0',
    fontSize: 12,
    color: '#94a3b8',
  },
  legalLink: {
    color: '#64748b',
    fontWeight: 600,
    textDecoration: 'none',
  },
};

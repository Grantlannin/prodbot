'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import { linkReasonMessage } from '@/lib/billing/checkout-receipt';
import {
  clearCheckoutSessionId,
  resolveCheckoutSessionId,
} from '@/lib/billing/checkout-receipt-client';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface BillingStatus {
  billingEnabled: boolean;
  active: boolean;
}

type Phase = 'checking' | 'active' | 'stuck' | 'redirecting' | 'error';

/**
 * /subscribe: reconcile purchase first (session_id / email), then Checkout only if needed.
 * Avoids bouncing paid users into a second charge.
 */
export default function SubscribeForm() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('Checking your subscription…');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startCheckout = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPhase('redirecting');
    setMessage('Redirecting to checkout…');
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not start checkout.');
      }
      window.location.href = data.url;
    } catch (err) {
      setPhase('stuck');
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setMessage('');
      setBusy(false);
    }
  }, []);

  const retryAccess = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setMessage('Looking up your purchase…');
    try {
      const sessionId = resolveCheckoutSessionId(null) || '';
      const res = await fetch('/api/billing/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
      });
      const data = (await res.json()) as { linked?: boolean; reason?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not link subscription.');
      }
      if (data.linked) {
        clearCheckoutSessionId();
        window.location.href = '/app';
        return true;
      }
      setPhase('stuck');
      setError(linkReasonMessage(data.reason));
      setMessage('');
      setBusy(false);
      return false;
    } catch (err) {
      setPhase('stuck');
      setError(err instanceof Error ? err.message : 'Could not link subscription.');
      setMessage('');
      setBusy(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const statusRes = await fetch('/api/billing/status');
        const status = (await statusRes.json()) as BillingStatus & { error?: string };
        if (!statusRes.ok) throw new Error(status.error ?? 'Could not load billing status.');
        if (cancelled) return;

        if (status.active) {
          setPhase('active');
          return;
        }

        if (!status.billingEnabled) {
          setPhase('error');
          setError("Checkout isn't available right now. Try again shortly.");
          setMessage('');
          return;
        }

        // Paid users first: claim session / email before offering another Checkout.
        const sessionId = resolveCheckoutSessionId(null) || '';
        const linkRes = await fetch('/api/billing/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
        });

        if (linkRes.status === 401) {
          // Not signed in — send to signup/signin; keep receipt for after auth.
          setPhase('stuck');
          setMessage('');
          setError('Sign in or create your account to unlock access after payment.');
          return;
        }

        const linkData = (await linkRes.json()) as {
          linked?: boolean;
          reason?: string;
          error?: string;
        };
        if (cancelled) return;

        if (linkData.linked) {
          clearCheckoutSessionId();
          window.location.href = '/app';
          return;
        }

        // Have a checkout receipt but not linked yet (race / wrong account) — don't rebought.
        if (sessionId || linkData.reason === 'already_claimed') {
          setPhase('stuck');
          setError(linkReasonMessage(linkData.reason));
          setMessage('');
          return;
        }

        await startCheckout();
      } catch (err) {
        if (cancelled) return;
        setPhase('stuck');
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setMessage('');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [startCheckout]);

  if (phase === 'active') {
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
          {phase === 'checking' || phase === 'redirecting' ? (
            <p style={styles.lead}>{message || 'One moment…'}</p>
          ) : null}

          {phase === 'stuck' || phase === 'error' ? (
            <>
              <h1 style={styles.title}>Need access?</h1>
              {error ? <p style={styles.error}>{error}</p> : null}
              <p style={styles.lead}>
                If you already paid, retry access before buying again.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void retryAccess()}
                style={styles.primaryBtn}
              >
                {busy ? 'Checking…' : 'I already paid — retry access'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startCheckout()}
                style={styles.secondaryBtn}
              >
                Continue to checkout
              </button>
              <p style={styles.footerNote}>
                <Link href="/login?mode=signup&next=/app" style={styles.link}>
                  Create account
                </Link>
                {' · '}
                <Link href="/login" style={styles.link}>
                  Sign in
                </Link>
                {' · '}
                <Link href="/" style={styles.link}>
                  Home
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
  secondaryBtn: {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    textAlign: 'left',
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

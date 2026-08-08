'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { clearIntroProgressClient, INTRO_CHROME_PATH } from '@/lib/intro';
import { PRODUCTION_SITE_ORIGIN } from '@/lib/site';
import { linkReasonMessage } from '@/lib/billing/checkout-receipt';
import {
  clearCheckoutSessionId,
  resolveCheckoutSessionId,
} from '@/lib/billing/checkout-receipt-client';
import { safeNextPath } from '@/lib/security/safe-path';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function LoginForm({ prefillEmail = null }: { prefillEmail?: string | null }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(prefillEmail?.trim().toLowerCase() || '');
  const [emailLocked, setEmailLocked] = useState(Boolean(prefillEmail?.trim()));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [resetReady, setResetReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState('');

  const authError = searchParams.get('error') || searchParams.get('error_code');
  const nextPath = safeNextPath(searchParams.get('next'), '/app');
  const fromCheckout = checkoutSessionId.startsWith('cs_');
  const initialError = useMemo(() => {
    if (authError === 'otp_expired') {
      return 'That email link expired or was already used. Request a new one from your phone, or sign in with your password below.';
    }
    if (authError === 'access_denied' || authError === 'auth') {
      return 'Sign-in failed. Try again with email and password.';
    }
    return null;
  }, [authError]);

  useEffect(() => {
    const resolved = resolveCheckoutSessionId(searchParams.get('session_id')?.trim() || '');
    if (resolved) setCheckoutSessionId(resolved);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('mode') === 'signup' || fromCheckout) {
      setMode('signup');
    }
  }, [searchParams, fromCheckout]);

  useEffect(() => {
    const next = prefillEmail?.trim().toLowerCase() || '';
    if (!next) return;
    setEmail(next);
    setEmailLocked(true);
  }, [prefillEmail]);

  useEffect(() => {
    if (searchParams.get('reset') !== '1') return;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setMode('reset');
        setResetReady(true);
      } else {
        setError('Reset link expired or invalid. Request a new one below.');
        setMode('forgot');
      }
    });
  }, [searchParams]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setResetReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <MarketingShell showSignIn={false}>
        <div style={styles.card}>
          <h1 style={styles.title}>Sign in unavailable</h1>
          <p style={styles.lead}>Supabase is not configured for this deployment yet.</p>
        </div>
      </MarketingShell>
    );
  }

  const linkBilling = async (): Promise<{ linked: boolean; reason?: string }> => {
    const sessionId = resolveCheckoutSessionId(checkoutSessionId) || '';
    const res = await fetch('/api/billing/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionId ? { session_id: sessionId } : {}),
    });
    const data = (await res.json()) as { linked?: boolean; reason?: string; error?: string };
    if (!res.ok) {
      return { linked: false, reason: data.reason };
    }
    if (data.linked) clearCheckoutSessionId();
    return { linked: Boolean(data.linked), reason: data.reason };
  };

  const afterAuth = async (opts?: { isNewAccount?: boolean; linkReason?: string }) => {
    let linked = opts?.linkReason === 'linked';
    let reason = opts?.linkReason;
    if (!linked) {
      try {
        const result = await linkBilling();
        linked = result.linked;
        reason = result.reason;
      } catch {
        /* subscription link is best-effort; /subscribe will retry */
      }
    } else {
      clearCheckoutSessionId();
    }

    if (opts?.isNewAccount || fromCheckout) {
      clearIntroProgressClient();
    }

    const dest = safeNextPath(nextPath, '/app');
    if (dest.startsWith('/app') && !linked && (reason === 'already_claimed' || reason === 'email_mismatch')) {
      setError(linkReasonMessage(reason));
      setBusy(false);
      return;
    }

    // Post-purchase / new account → Chrome + extension setup before the dashboard.
    if (opts?.isNewAccount || fromCheckout) {
      window.location.href = INTRO_CHROME_PATH;
      return;
    }
    window.location.href = dest;
  };

  const resetRedirectTo = () => {
    const next = encodeURIComponent('/login?reset=1');
    // Never put localhost in reset emails — Supabase falls back to Site URL if
    // redirectTo isn't allow-listed, so keep this a production callback URL.
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const browserOrigin =
      host && host !== 'localhost' && host !== '127.0.0.1' ? window.location.origin : '';
    const origin = configured || browserOrigin || PRODUCTION_SITE_ORIGIN;
    return `${origin}/auth/callback?next=${next}`;
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error(
            'Invalid email or password. If you just created an account, try Create account again with the same email.'
          );
        }
        throw signInError;
      }
      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const sessionId = resolveCheckoutSessionId(checkoutSessionId) || '';
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        link?: { linked?: boolean; reason?: string };
      };
      if (!res.ok) {
        if (res.status === 409) {
          setMode('signin');
          throw new Error(data.error ?? 'An account with this email already exists. Sign in instead.');
        }
        throw new Error(data.error ?? 'Could not create account.');
      }

      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      await afterAuth({
        isNewAccount: true,
        linkReason: data.link?.linked ? 'linked' : data.link?.reason,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
      setBusy(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectTo(),
      });
      if (resetError) throw resetError;
      setMessage('Check your email for a password reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
      setBusy(false);
    }
  };

  const title =
    mode === 'signup'
      ? fromCheckout
        ? 'Create your Daywinner account'
        : 'Create your account'
      : mode === 'forgot'
        ? 'Reset password'
        : mode === 'reset'
          ? 'Choose a new password'
          : 'Welcome back';

  const lead =
    mode === 'signup'
      ? fromCheckout
        ? "Payment received. Pick a password and you're in."
        : 'Create an account to access Daywinner.'
      : mode === 'forgot'
        ? 'Enter your email and we will send a reset link.'
        : mode === 'reset'
          ? 'Pick a new password for your account.'
          : 'Sign in to continue to your workspace.';

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.lead}>{lead}</p>

          {initialError ? <p style={styles.error}>{initialError}</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}
          {message ? <p style={styles.success}>{message}</p> : null}

          {mode === 'reset' && resetReady ? (
            <form onSubmit={handleResetPassword} style={styles.form}>
              <label style={styles.label} htmlFor="password">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
              />
              <label style={styles.label} htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={styles.input}
              />
              <button type="submit" disabled={busy || !password || !confirmPassword} style={styles.primaryBtn}>
                {busy ? 'Saving…' : 'Save password'}
              </button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgot} style={styles.form}>
              <label style={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
              />
              <button type="submit" disabled={busy || !email.trim()} style={styles.primaryBtn}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
                style={styles.textBtn}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} style={styles.form}>
              {!fromCheckout ? (
                <div style={styles.modeRow}>
                  <button
                    type="button"
                    style={{ ...styles.modeBtn, ...(mode === 'signin' ? styles.modeBtnActive : null) }}
                    onClick={() => setMode('signin')}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.modeBtn, ...(mode === 'signup' ? styles.modeBtnActive : null) }}
                    onClick={() => setMode('signup')}
                  >
                    Create account
                  </button>
                </div>
              ) : null}
              <label style={styles.label} htmlFor="email">
                Email
              </label>
              {emailLocked ? (
                <p style={styles.emailHint}>Locked to the email from your checkout.</p>
              ) : null}
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => {
                  if (!emailLocked) setEmail(e.target.value);
                }}
                readOnly={emailLocked}
                placeholder="you@example.com"
                style={{
                  ...styles.input,
                  ...(emailLocked ? styles.inputLocked : null),
                }}
              />
              <label style={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={styles.input}
              />
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setMessage(null);
                  }}
                  style={styles.textBtn}
                >
                  Forgot password?
                </button>
              ) : null}
              <button type="submit" disabled={busy || !email.trim() || !password} style={styles.primaryBtn}>
                {busy
                  ? mode === 'signup'
                    ? 'Creating…'
                    : 'Signing in…'
                  : fromCheckout
                    ? 'Start Daywinner'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Sign in'}
              </button>
            </form>
          )}

          <Link href="/" style={styles.backLink}>
            ← Back
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
    paddingTop: 24,
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
  },
  title: {
    margin: '0 0 8px',
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
  },
  lead: {
    margin: '0 0 20px',
    fontSize: 14,
    lineHeight: 1.5,
    color: '#64748b',
  },
  modeRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    background: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
  },
  modeBtnActive: {
    background: '#fff',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '11px 12px',
    fontSize: 15,
    fontFamily: font,
    marginBottom: 8,
  },
  emailHint: {
    margin: '0 0 6px',
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.4,
  },
  inputLocked: {
    background: '#f8fafc',
    color: '#334155',
  },
  primaryBtn: {
    marginTop: 4,
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
  textBtn: {
    alignSelf: 'flex-start',
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: 4,
  },
  error: {
    margin: '0 0 12px',
    padding: '10px 12px',
    borderRadius: 8,
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
  },
  success: {
    margin: '0 0 12px',
    padding: '10px 12px',
    borderRadius: 8,
    background: '#f0fdf4',
    color: '#15803d',
    fontSize: 13,
  },
  backLink: {
    display: 'inline-block',
    marginTop: 16,
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    textDecoration: 'none',
    fontFamily: font,
  },
};

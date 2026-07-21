'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [resetReady, setResetReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authError = searchParams.get('error');
  const nextPath = searchParams.get('next') || '/app';
  const initialError = useMemo(() => {
    if (authError === 'auth') return 'Sign-in failed. Try again with email and password.';
    return null;
  }, [authError]);

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setMode('signup');
    }
  }, [searchParams]);

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

  const afterAuth = () => {
    window.location.href = nextPath.startsWith('/') ? nextPath : '/app';
  };

  const resetRedirectTo = () => {
    const next = encodeURIComponent('/login?reset=1');
    return `${window.location.origin}/auth/callback?next=${next}`;
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
      afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not create account.');
      }

      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
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
      afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === 'signup'
      ? 'Create your account'
      : mode === 'forgot'
        ? 'Reset password'
        : mode === 'reset'
          ? 'Choose a new password'
          : 'Welcome back';

  const lead =
    mode === 'signup'
      ? 'Set up your login, then subscribe to open the app.'
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

'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import MarketingShell from '@/components/marketing/MarketingShell';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
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

  return (
    <MarketingShell showSignIn={false}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p style={styles.lead}>
            {mode === 'signup'
              ? 'Set up your login, then subscribe to open the app.'
              : 'Sign in to continue to your workspace.'}
          </p>

          {initialError ? <p style={styles.error}>{initialError}</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}
          {message ? <p style={styles.success}>{message}</p> : null}

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

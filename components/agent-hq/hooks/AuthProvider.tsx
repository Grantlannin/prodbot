'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isAuthRequired, isSupabaseConfigured } from '@/lib/supabase/config';

interface AuthContextValue {
  authEnabled: boolean;
  authRequired: boolean;
  loading: boolean;
  user: User | null;
  email: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authEnabled = isSupabaseConfigured();
  const authRequired = isAuthRequired();
  const [loading, setLoading] = useState(authEnabled);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!authEnabled) {
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authEnabled]);

  const signOut = useCallback(async () => {
    if (!authEnabled) return;
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }, [authEnabled]);

  const value = useMemo(
    () => ({
      authEnabled,
      authRequired,
      loading,
      user,
      email: user?.email ?? null,
      signOut,
    }),
    [authEnabled, authRequired, loading, user, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

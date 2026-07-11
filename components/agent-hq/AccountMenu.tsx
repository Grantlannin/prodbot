'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useAuth } from './hooks/AuthProvider';
import { useUserProfile } from './hooks/UserProfileProvider';
import { welcomeLabel } from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function AccountMenu() {
  const { user, email, signOut } = useAuth();
  const { profile, setDisplayName } = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.displayName);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setDraft(profile.displayName);
  }, [profile.displayName, editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const saveName = () => {
    setDisplayName(draft);
    setEditing(false);
  };

  const openBillingPortal = async () => {
    setMenuOpen(false);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={wrapRef} style={styles.wrap}>
      {editing ? (
        <div style={styles.nameRow}>
          <span style={styles.prefix}>Welcome back,</span>
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveName();
              }
              if (e.key === 'Escape') {
                setDraft(profile.displayName);
                setEditing(false);
              }
            }}
            onBlur={saveName}
            style={styles.nameInput}
            aria-label="Your name"
            autoFocus
          />
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} style={styles.nameBtn} title="Click to edit your name">
          {welcomeLabel(profile.displayName)}
        </button>
      )}

      {user ? (
        <div style={styles.accountCol}>
          <button
            type="button"
            style={styles.accountBtn}
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
          >
            Account
          </button>
          {menuOpen ? (
            <div style={styles.menu}>
              {email ? <div style={styles.menuEmail}>{email}</div> : null}
              <button type="button" style={styles.menuItem} onClick={openBillingPortal}>
                Manage billing
              </button>
              <button type="button" style={styles.menuItem} onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  nameBtn: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 700,
    fontFamily: font,
    textAlign: 'left',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  prefix: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 700,
    fontFamily: font,
  },
  nameInput: {
    border: 'none',
    borderBottom: '2px solid #3b82f6',
    outline: 'none',
    background: 'transparent',
    fontFamily: font,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    padding: '0 2px 2px',
    minWidth: 80,
    maxWidth: 200,
  },
  accountCol: {
    position: 'relative',
  },
  accountBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#f8fafc',
    color: '#475569',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    padding: '6px 10px',
    cursor: 'pointer',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    zIndex: 50,
    minWidth: 200,
    padding: '8px 0',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
  },
  menuEmail: {
    padding: '6px 12px 8px',
    fontSize: 11,
    color: '#64748b',
    borderBottom: '1px solid #f1f5f9',
    wordBreak: 'break-all',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    cursor: 'pointer',
  },
};

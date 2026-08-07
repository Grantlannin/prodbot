'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useAuth } from './hooks/AuthProvider';
import { useUserProfile } from './hooks/UserProfileProvider';
import { useCloudSync } from './hooks/CloudSyncProvider';
import { welcomeLabel } from './userProfile';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function AccountMenu() {
  const { user, email, signOut, authEnabled } = useAuth();
  const { profile, setDisplayName } = useUserProfile();
  const {
    cloudEnabled,
    lastSyncAt,
    syncing,
    syncError,
    enableBackup,
    pushNow,
    disableBackup,
    offerRestore,
  } = useCloudSync();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.displayName);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const lastSavedLabel = (() => {
    if (!lastSyncAt) return null;
    const mins = Math.round((Date.now() - lastSyncAt) / 60000);
    if (mins < 1) return 'Last saved: just now';
    if (mins === 1) return 'Last saved: 1 min ago';
    if (mins < 60) return `Last saved: ${mins} min ago`;
    return `Last saved: ${new Date(lastSyncAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
  })();

  const handleDisableBackup = () => {
    setMenuOpen(false);
    if (!window.confirm('Turn off cloud backup? Your device copy stays; syncing stops.')) return;
    const deleteCopy = window.confirm('Also delete your cloud copy permanently?');
    void disableBackup(deleteCopy);
  };

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
              {authEnabled ? (
                <div style={styles.backupSection}>
                  <div style={styles.backupLabel}>Backup</div>
                  {cloudEnabled ? (
                    <>
                      <div style={styles.backupStatus}>Cloud backup on</div>
                      {lastSavedLabel ? <div style={styles.backupMeta}>{lastSavedLabel}</div> : null}
                      {syncError ? <div style={styles.backupError}>{syncError}</div> : null}
                      <button
                        type="button"
                        style={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          offerRestore();
                        }}
                        disabled={syncing}
                      >
                        Restore from cloud
                      </button>
                      <button
                        type="button"
                        style={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          void pushNow();
                        }}
                        disabled={syncing}
                      >
                        {syncing ? 'Saving…' : 'Back up now'}
                      </button>
                      <button type="button" style={styles.menuItemMuted} onClick={handleDisableBackup}>
                        Turn off cloud backup…
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={styles.backupStatus}>Saved on this device only</div>
                      {syncError ? <div style={styles.backupError}>{syncError}</div> : null}
                      <button
                        type="button"
                        style={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          enableBackup();
                        }}
                        disabled={syncing}
                      >
                        Back up to cloud
                      </button>
                    </>
                  )}
                </div>
              ) : null}
              <Link
                href="/billing"
                style={styles.menuItemLink}
                onClick={() => setMenuOpen(false)}
              >
                Manage billing
              </Link>
              <button type="button" style={styles.menuItem} onClick={() => signOut()}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      ) : authEnabled ? (
        <Link href="/login?next=/app" style={styles.signInLink}>
          Sign in
        </Link>
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
  signInLink: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#f8fafc',
    color: '#475569',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    padding: '6px 10px',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
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
  menuItemLink: {
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
    textDecoration: 'none',
    boxSizing: 'border-box',
  },
  menuItemMuted: {
    display: 'block',
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: font,
    color: '#94a3b8',
    cursor: 'pointer',
  },
  backupSection: {
    padding: '8px 12px 10px',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: 4,
  },
  backupLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 4,
  },
  backupStatus: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  backupMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  backupError: {
    fontSize: 11,
    color: '#b45309',
    marginBottom: 6,
  },
};

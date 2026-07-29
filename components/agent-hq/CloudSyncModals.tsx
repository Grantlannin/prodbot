'use client';

import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useCloudSync } from './hooks/CloudSyncProvider';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function CloudSyncModals() {
  const {
    enableConfirmOpen,
    cancelEnableBackup,
    confirmEnableBackup,
    restoreOfferOpen,
    dismissRestoreOffer,
    restoreFromCloud,
    syncing,
  } = useCloudSync();

  if (typeof document === 'undefined') return null;

  const enableModal =
    enableConfirmOpen &&
    createPortal(
      <div style={styles.backdrop} role="presentation">
        <div style={styles.panel} role="dialog" aria-modal="true" aria-labelledby="enable-backup-title">
          <h3 id="enable-backup-title" style={styles.title}>
            Back up projects &amp; notes?
          </h3>
          <p style={styles.body}>
            Your projects, tasks, notes, and attached links (URLs only) will be saved to your account so you can
            restore them on another computer. We don&apos;t store the content of linked websites.
          </p>
          <p style={styles.hint}>Timer history and extension settings stay on this device.</p>
          <div style={styles.actions}>
            <button type="button" onClick={cancelEnableBackup} style={styles.secondaryBtn} disabled={syncing}>
              Cancel
            </button>
            <button type="button" onClick={() => void confirmEnableBackup()} style={styles.primaryBtn} disabled={syncing}>
              {syncing ? 'Backing up…' : 'Back up now'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  const restoreModal =
    restoreOfferOpen &&
    createPortal(
      <div style={styles.backdrop} role="presentation">
        <div style={styles.panel} role="dialog" aria-modal="true" aria-labelledby="restore-backup-title">
          <h3 id="restore-backup-title" style={styles.title}>
            Restore from cloud?
          </h3>
          <p style={styles.body}>
            This device has no projects or notes saved locally, but we found a cloud backup on your account.
          </p>
          <div style={styles.actions}>
            <button type="button" onClick={dismissRestoreOffer} style={styles.secondaryBtn} disabled={syncing}>
              Not now
            </button>
            <button type="button" onClick={() => void restoreFromCloud()} style={styles.primaryBtn} disabled={syncing}>
              {syncing ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {enableModal}
      {restoreModal}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10001,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 420px)',
    background: '#fff',
    borderRadius: 12,
    padding: '20px 22px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
  },
  body: {
    margin: '10px 0 0',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.5,
  },
  hint: {
    margin: '8px 0 0',
    fontSize: 12,
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  secondaryBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
};

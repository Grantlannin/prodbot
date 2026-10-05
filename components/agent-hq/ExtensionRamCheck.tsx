'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  detectFocusExtension,
  fetchExtensionRamDiag,
  type ExtensionRamDiag,
} from './focusBlocking';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function formatUptime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

/** Small Soft/Hard thrash check — confirms the extension isn't doing the old RAM-burn loop. */
export default function ExtensionRamCheck() {
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState<ExtensionRamDiag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const installed = await detectFocusExtension(1000);
    if (!installed.installed) {
      setDiag(null);
      setError('Extension not detected. Reload the unpacked extension, then refresh this page.');
      setLoading(false);
      return;
    }
    const next = await fetchExtensionRamDiag();
    if (!next) {
      setDiag(null);
      setError('Could not read RAM diag. Reload the extension (chrome://extensions) and try again.');
    } else {
      setDiag(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    const interval = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(interval);
  }, [open, load]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={navLinkStyle}>
        ram check
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div style={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
              <div
                style={styles.panel}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ram-check-title"
              >
                <div style={styles.header}>
                  <h3 id="ram-check-title" style={styles.title}>
                    Soft/Hard RAM check
                  </h3>
                  <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                    ×
                  </button>
                </div>
                <div style={styles.body}>
                  {loading && !diag ? <p style={styles.muted}>Reading extension…</p> : null}
                  {error ? <p style={styles.error}>{error}</p> : null}
                  {diag ? (
                    <>
                      <div
                        style={{
                          ...styles.badge,
                          background: diag.healthy ? '#ecfdf5' : '#fff7ed',
                          color: diag.healthy ? '#047857' : '#c2410c',
                          borderColor: diag.healthy ? '#a7f3d0' : '#fed7aa',
                        }}
                      >
                        {diag.healthy ? 'Looks healthy (not thrashing)' : 'Check counters — may still be thrashing'}
                      </div>
                      <ul style={styles.list}>
                        <li>Version {diag.version}</li>
                        <li>
                          Blocking: {diag.blocking ? `${diag.lockMode || 'on'} · ${diag.domainCount} sites` : 'off'}
                        </li>
                        <li>SW uptime: {formatUptime(diag.uptimeMs)}</li>
                        <li>
                          Syncs: {diag.syncReceived} received · {diag.syncApplied} applied ·{' '}
                          {diag.syncSkipped} skipped
                        </li>
                        <li>Rule updates: {diag.ruleUpdates}</li>
                        <li>
                          Alarms: {diag.alarms.length ? diag.alarms.join(', ') : 'none'}
                          {diag.hasEnforceLoop ? ' · BAD: enforceBlockedTabs still present' : ''}
                        </li>
                      </ul>
                      <p style={styles.hint}>
                        After Soft/Hard has been on a few minutes, <strong>skipped</strong> should climb and{' '}
                        <strong>applied</strong> should stay tiny. If applied ≈ received, the old leak pattern is back.
                      </p>
                      <p style={styles.hint}>
                        Chrome check: ⋮ → More tools → Task Manager → “Extension: Daywinner bot”. Leave Soft/Hard on
                        with 15+ tabs for 5–10 min — memory should stay roughly flat, not climb into GBs.
                      </p>
                    </>
                  ) : null}
                  <button type="button" onClick={() => void load()} style={styles.refresh} disabled={loading}>
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

const navLinkStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: '0 2px',
  margin: 0,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: font,
  color: '#94a3b8',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 10050,
  },
  panel: {
    width: 'min(100%, 420px)',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: { margin: 0, fontSize: 15, fontWeight: 650, color: '#0f172a' },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  body: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  muted: { margin: 0, fontSize: 13, color: '#64748b' },
  error: { margin: 0, fontSize: 12, color: '#b45309' },
  badge: {
    border: '1px solid',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 650,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.55,
  },
  hint: { margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.45 },
  refresh: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};

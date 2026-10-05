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

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/** Local-only Soft/Hard RAM test — works with the current store extension. */
export default function ExtensionRamCheck() {
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState<ExtensionRamDiag | null>(null);
  const [extVersion, setExtVersion] = useState<string | null>(null);
  const [extInstalled, setExtInstalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState(false);

  useEffect(() => {
    setLocal(isLocalHost());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const installed = await detectFocusExtension(1000);
    setExtInstalled(installed.installed);
    setExtVersion(installed.version);
    if (installed.installed) {
      const next = await fetchExtensionRamDiag();
      setDiag(next);
    } else {
      setDiag(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  if (!local) return null;

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
                    Is Chrome using too much memory?
                  </h3>
                  <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                    ×
                  </button>
                </div>
                <div style={styles.body}>
                  <p style={styles.lead}>
                    Quick test with the Daywinner extension you already have from the Chrome store.
                  </p>
                  <p style={styles.meta}>
                    {loading
                      ? 'Looking for the extension…'
                      : extInstalled
                        ? `Extension is on${extVersion ? ` (version ${extVersion})` : ''}`
                        : 'Can’t see the extension yet. Make sure it’s installed and turned on, then refresh this page.'}
                  </p>

                  <ol style={styles.steps}>
                    <li>Turn Soft or Hard on.</li>
                    <li>Keep about 15 tabs open.</li>
                    <li>Use Daywinner for 5–10 minutes.</li>
                    <li>
                      In Chrome, open the menu (⋮) → More tools → Task Manager.
                    </li>
                    <li>Find the row that says Daywinner bot (extension).</li>
                    <li>
                      Good: the Memory number stays about the same.
                      <br />
                      Bad: it keeps going up a lot (toward many GB).
                    </li>
                  </ol>

                  {diag ? (
                    <div style={styles.diagBox}>
                      <div style={styles.diagTitle}>Extra detail (optional)</div>
                      <ul style={styles.list}>
                        <li>
                          Lock:{' '}
                          {diag.blocking ? `${diag.lockMode || 'on'} · ${diag.domainCount} sites` : 'off'}
                        </li>
                        <li>Running for: {formatUptime(diag.uptimeMs)}</li>
                        <li>
                          Updates: {diag.syncApplied} real / {diag.syncSkipped} skipped (skipped should be higher)
                        </li>
                        <li>
                          {diag.healthy
                            ? 'Looks calm so far'
                            : 'Looks busy — trust the Task Manager number more'}
                        </li>
                      </ul>
                    </div>
                  ) : null}

                  <button type="button" onClick={() => void load()} style={styles.refresh} disabled={loading}>
                    {loading ? 'Checking…' : 'Check again'}
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
  lead: { margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.45 },
  meta: { margin: 0, fontSize: 12, color: '#64748b' },
  steps: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.55,
  },
  hint: { margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.45 },
  diagBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  diagTitle: { fontSize: 12, fontWeight: 650, color: '#475569', marginBottom: 6 },
  list: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 12,
    color: '#334155',
    lineHeight: 1.55,
  },
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

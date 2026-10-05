'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { detectFocusExtension } from './focusBlocking';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Local-only. Chrome MV3 rarely shows "Extension: Daywinner" — it shows a Service Worker
 * row with the extension ID. This panel surfaces that ID so you can find the real number.
 */
export default function ExtensionRamCheck() {
  const [open, setOpen] = useState(false);
  const [extVersion, setExtVersion] = useState<string | null>(null);
  const [extensionId, setExtensionId] = useState<string | null>(null);
  const [extInstalled, setExtInstalled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocal(isLocalHost());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const installed = await detectFocusExtension(1200);
    setExtInstalled(installed.installed);
    setExtVersion(installed.version);
    setExtensionId(installed.extensionId);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const copyId = async () => {
    if (!extensionId) return;
    try {
      await navigator.clipboard.writeText(extensionId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

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
                    Find extension memory
                  </h3>
                  <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                    ×
                  </button>
                </div>
                <div style={styles.body}>
                  <p style={styles.lead}>
                    Chrome usually will <strong>not</strong> show a row named “Daywinner”. It shows a{' '}
                    <strong>Service Worker</strong> row that contains the extension’s ID.
                  </p>

                  <p style={styles.meta}>
                    {loading
                      ? 'Looking for the extension…'
                      : extInstalled
                        ? `Extension connected${extVersion ? ` · v${extVersion}` : ''}`
                        : 'Extension not connected on this page. Install/enable Daywinner, then refresh.'}
                  </p>

                  {extensionId ? (
                    <div style={styles.idBox}>
                      <div style={styles.idLabel}>Search Task Manager for this ID</div>
                      <code style={styles.idCode}>{extensionId}</code>
                      <button type="button" onClick={() => void copyId()} style={styles.copyBtn}>
                        {copied ? 'Copied' : 'Copy ID'}
                      </button>
                    </div>
                  ) : (
                    <div style={styles.idBox}>
                      <div style={styles.idLabel}>Get the ID manually</div>
                      <p style={styles.hint}>
                        Open <code>chrome://extensions</code> → turn on Developer mode (top right) → under
                        Daywinner bot you’ll see <strong>ID</strong>. Copy that string.
                      </p>
                    </div>
                  )}

                  <ol style={styles.steps}>
                    <li>Turn Soft or Hard on (keeps the worker awake).</li>
                    <li>Press <strong>Shift + Esc</strong> (Chrome Task Manager).</li>
                    <li>
                      Find a row that says <strong>Service Worker</strong> and includes that ID
                      (looks like <code>chrome-extension://…</code>).
                    </li>
                    <li>That row’s <strong>Memory footprint</strong> is the extension.</li>
                    <li>
                      Leave Soft/Hard on with ~15 tabs for 5–10 minutes. Good = number stays about flat.
                      Bad = climbs into GBs.
                    </li>
                  </ol>

                  <button type="button" onClick={() => void load()} style={styles.refresh} disabled={loading}>
                    {loading ? 'Checking…' : 'Refresh'}
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
    width: 'min(100%, 440px)',
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
  idBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  idLabel: { fontSize: 12, fontWeight: 650, color: '#475569' },
  idCode: {
    fontSize: 13,
    wordBreak: 'break-all',
    color: '#0f172a',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '8px 10px',
  },
  copyBtn: {
    alignSelf: 'flex-start',
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  steps: {
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

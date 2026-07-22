'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  DEFAULT_FOCUS_BLOCKLIST,
  FOCUS_BLOCKLIST_KEY,
  SOCIAL_BUNDLE_SITES,
  normalizeDomain,
  resolveBlocklist,
  type FocusBlocklistStore,
} from './focusBlocking';
import { getAppOrigin } from '@/lib/app-origin';
import { PRODUCTION_SITE_HOST, PRODUCTION_SITE_ORIGIN } from '@/lib/site';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface FocusExtensionModalProps {
  variant?: 'default' | 'nav';
}

export default function FocusExtensionModal({ variant = 'default' }: FocusExtensionModalProps) {
  const [open, setOpen] = useState(false);
  const [store, setStore] = useLocalStorage<FocusBlocklistStore>(FOCUS_BLOCKLIST_KEY, DEFAULT_FOCUS_BLOCKLIST);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const activeCount = useMemo(() => resolveBlocklist(store).length, [store]);
  const siteHost = useMemo(() => {
    try {
      return new URL(getAppOrigin(PRODUCTION_SITE_ORIGIN)).hostname;
    } catch {
      return PRODUCTION_SITE_HOST;
    }
  }, []);

  const toggleBundle = () => {
    setStore(prev => ({ ...prev, socialBundleEnabled: !prev.socialBundleEnabled }));
  };

  const toggleSite = (siteKey: string) => {
    setStore(prev => {
      const disabled = new Set(prev.bundleDisabled);
      if (disabled.has(siteKey)) disabled.delete(siteKey);
      else disabled.add(siteKey);
      return { ...prev, bundleDisabled: [...disabled] };
    });
  };

  const isSiteEnabled = (siteKey: string) => !store.bundleDisabled.includes(siteKey);

  const handleAddCustom = () => {
    const normalized = normalizeDomain(customInput);
    if (!normalized) {
      setCustomError('Use a domain like twitter.com');
      return;
    }
    if (store.customDomains.includes(normalized)) {
      setCustomError('Already blocked');
      return;
    }
    setStore(prev => ({ ...prev, customDomains: [...prev.customDomains, normalized] }));
    setCustomInput('');
    setCustomError(null);
  };

  const removeCustom = (domain: string) => {
    setStore(prev => ({
      ...prev,
      customDomains: prev.customDomains.filter(d => d !== domain),
    }));
  };

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div style={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
            <div
              style={styles.panel}
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="focus-extension-title"
            >
              <div style={styles.panelHeader}>
                <h3 id="focus-extension-title" style={styles.panelTitle}>
                  Focus extension
                </h3>
                <button type="button" onClick={() => setOpen(false)} style={styles.closeBtn} aria-label="Close">
                  ×
                </button>
              </div>

              <div style={styles.section}>
                <div style={styles.sectionLabel}>Setup</div>
                <p style={styles.body}>
                  Blocks sites during focus sessions with soft or hard lock (not on breaks or no-lock sessions).
                  Works on <strong>{siteHost}</strong> — keep this app tab open while you work.
                </p>
                <a href="/daywinner.zip" download="daywinner.zip" style={styles.downloadLink}>
                  Download extension (v1.0.5)
                </a>
                <ol style={styles.steps}>
                  <li>Unzip → chrome://extensions → Developer mode → Load unpacked → select the extension folder.</li>
                  <li>
                    If you already installed an older copy, click <strong>Reload</strong> on the extension card (or
                    remove and load unpacked again) so {siteHost} is included.
                  </li>
                  <li>Start a countdown session here with soft or hard lock. Blocked sites redirect until the session ends.</li>
                </ol>
              </div>

              <div style={styles.section}>
                <label style={styles.packRow}>
                  <input type="checkbox" checked={store.socialBundleEnabled} onChange={toggleBundle} />
                  <span style={styles.packTitle}>Social media pack</span>
                </label>
                {store.socialBundleEnabled ? (
                  <div style={styles.siteList}>
                    {SOCIAL_BUNDLE_SITES.map(site => (
                      <label key={site.key} style={styles.siteRow}>
                        <input
                          type="checkbox"
                          checked={isSiteEnabled(site.key)}
                          onChange={() => toggleSite(site.key)}
                        />
                        <span style={styles.siteText}>
                          <span style={styles.siteLabel}>{site.label}</span>
                          <span style={styles.siteDomains}>{site.domains.join(', ')}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>

              <div style={styles.section}>
                <div style={styles.sectionLabel}>Other blocked sites</div>
                <div style={styles.customRow}>
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => {
                      setCustomInput(e.target.value);
                      if (customError) setCustomError(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustom();
                      }
                    }}
                    placeholder="example.com"
                    style={styles.input}
                  />
                  <button type="button" onClick={handleAddCustom} style={styles.addBtn}>
                    Add
                  </button>
                </div>
                {customError ? <p style={styles.error}>{customError}</p> : null}
                {store.customDomains.length > 0 ? (
                  <div style={styles.tags}>
                    {store.customDomains.map(domain => (
                      <span key={domain} style={styles.tag}>
                        {domain}
                        <button type="button" onClick={() => removeCustom(domain)} style={styles.tagRemove} aria-label={`Remove ${domain}`}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <p style={styles.footer}>{activeCount} site{activeCount === 1 ? '' : 's'} blocked during focus</p>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={variant === 'nav' ? styles.navTriggerBtn : styles.triggerBtn}
      >
        add focus extension
      </button>
      {modal}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  triggerBtn: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#475569',
    background: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  navTriggerBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    padding: '6px 11px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#475569',
    background: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 420px)',
    maxHeight: 'min(85vh, 560px)',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  panelTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 8,
  },
  body: {
    margin: '0 0 10px',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.45,
  },
  downloadLink: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 600,
    color: '#1d4ed8',
    textDecoration: 'none',
    marginBottom: 10,
  },
  steps: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 12,
    color: '#475569',
    lineHeight: 1.5,
  },
  packRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    marginBottom: 8,
  },
  packTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
  },
  siteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingLeft: 2,
  },
  siteRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    cursor: 'pointer',
  },
  siteText: {
    flex: 1,
    minWidth: 0,
  },
  siteLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#334155',
  },
  siteDomains: {
    display: 'block',
    marginTop: 1,
    fontSize: 11,
    color: '#94a3b8',
  },
  customRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
  },
  addBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
  },
  error: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#b45309',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 999,
    background: '#f1f5f9',
    fontSize: 11,
    fontWeight: 500,
    color: '#475569',
  },
  tagRemove: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
  footer: {
    margin: '16px 0 0',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
};

'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import {
  DEFAULT_FOCUS_BLOCKLIST,
  FOCUS_BLOCKLIST_KEY,
  detectFocusExtension,
  resolveBlocklist,
  type FocusBlocklistStore,
} from './focusBlocking';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

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

function guessBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'Unknown';
}

function guessOs(ua: string): string {
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

export default function ReportIssueModal() {
  const { status, currentSession } = useWorkTrackerContext();
  const [blocklist] = useLocalStorage<FocusBlocklistStore>(FOCUS_BLOCKLIST_KEY, DEFAULT_FOCUS_BLOCKLIST);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [extInfo, setExtInfo] = useState<{ installed: boolean; version: string | null }>({
    installed: false,
    version: null,
  });

  useEffect(() => {
    if (!screenshot) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void detectFocusExtension().then(info => {
      if (!cancelled) setExtInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setScreenshot(null);
    setSent(false);
    setTicketId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    setOpen(false);
    setError(null);
    setSending(false);
    if (sent) resetForm();
  };

  const onPickScreenshot = (file: File | null) => {
    setError(null);
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Screenshot must be an image.');
      setScreenshot(null);
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError('Screenshot must be under 4MB.');
      setScreenshot(null);
      return;
    }
    setScreenshot(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const domains = resolveBlocklist(blocklist);
      const sessionActive = status === 'working' || status === 'on_break';
      const debug = {
        lockMode: currentSession?.lockMode ?? 'none',
        sessionActive,
        sessionId: currentSession?.id ?? null,
        blocklistDomains: domains.slice(0, 40),
        blocklistCount: domains.length,
        extensionInstalled: extInfo.installed,
        extensionVersion: extInfo.version,
        browser: guessBrowser(ua),
        os: guessOs(ua),
        appUrl: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: ua.slice(0, 300),
      };

      const form = new FormData();
      form.set('subject', subject);
      form.set('message', message);
      form.set('surface', 'unknown');
      form.set('debug', JSON.stringify(debug));
      if (screenshot) form.set('screenshot', screenshot);

      const res = await fetch('/api/support/report', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        ticketId?: string | null;
      } | null;
      if (!res.ok) {
        setError(data?.error || 'Could not send. Try again.');
        return;
      }
      setTicketId(data?.ticketId || null);
      setSent(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daywinner:tickets-changed'));
      }
    } catch {
      setError('Could not send. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const lockLabel = currentSession?.lockMode === 'soft'
    ? 'Soft'
    : currentSession?.lockMode === 'hard'
      ? 'Hard'
      : 'Off';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={navLinkStyle}>
        not working?
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div style={styles.backdrop} onClick={close} role="presentation">
              <div
                style={styles.panel}
                onClick={ev => ev.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-issue-title"
              >
                <div style={styles.header}>
                  <h3 id="report-issue-title" style={styles.title}>
                    something not working? let us know
                  </h3>
                  <button type="button" onClick={close} style={styles.closeBtn} aria-label="Close">
                    ×
                  </button>
                </div>

                {sent ? (
                  <div style={styles.body}>
                    <p style={styles.success}>
                      {ticketId ? `Sent — ${ticketId}. We’ll look at it.` : 'Sent — we’ll look at it.'}
                    </p>
                    <button type="button" onClick={close} style={styles.primaryBtn}>
                      Close
                    </button>
                  </div>
                ) : (
                  <form style={styles.body} onSubmit={e => void submit(e)}>
                    <label style={styles.label}>
                      Short title
                      <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="e.g. X not blocking on new tab"
                        maxLength={120}
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.label}>
                      What happened?
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="What you expected vs what you saw. Exact steps if you can."
                        rows={5}
                        maxLength={4000}
                        required
                        style={styles.textarea}
                      />
                    </label>
                    <div style={styles.attachRow}>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={e => onPickScreenshot(e.target.files?.[0] ?? null)}
                        style={styles.hiddenFile}
                        tabIndex={-1}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        style={styles.attachBtn}
                      >
                        {screenshot ? 'Change screenshot' : 'Attach screenshot'}
                      </button>
                      {screenshot ? (
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshot(null);
                            if (fileRef.current) fileRef.current.value = '';
                          }}
                          style={styles.removeShot}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {previewUrl ? (
                      <div style={styles.previewWrap}>
                        <img src={previewUrl} alt="Screenshot preview" style={styles.preview} />
                      </div>
                    ) : null}
                    <p style={styles.auto}>
                      Auto: {lockLabel}
                      {status === 'working' || status === 'on_break' ? ' · session on' : ''}
                      {' · '}
                      {extInfo.installed
                        ? `ext ${extInfo.version || 'installed'}`
                        : 'ext not detected'}
                      {' · '}
                      {resolveBlocklist(blocklist).length} blocked sites
                    </p>
                    {error ? <p style={styles.error}>{error}</p> : null}
                    <button type="submit" disabled={sending || message.trim().length < 10} style={styles.primaryBtn}>
                      {sending ? 'Sending…' : 'Send to support'}
                    </button>
                  </form>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

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
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 650,
    color: '#0f172a',
  },
  closeBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 22,
    lineHeight: 1,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  body: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '9px 11px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
  },
  textarea: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '9px 11px',
    fontSize: 13,
    fontFamily: font,
    color: '#0f172a',
    resize: 'vertical',
    minHeight: 100,
  },
  attachRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  hiddenFile: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  },
  attachBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: font,
    color: '#64748b',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  previewWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  preview: {
    width: '100%',
    maxHeight: 160,
    objectFit: 'contain',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  removeShot: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 12,
    fontFamily: font,
    color: '#64748b',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  auto: {
    margin: 0,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  error: {
    margin: 0,
    fontSize: 12,
    color: '#b45309',
  },
  success: {
    margin: 0,
    fontSize: 14,
    color: '#15803d',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
};

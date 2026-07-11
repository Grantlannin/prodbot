'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import {
  buildEodEmailSubject,
  buildGmailComposeUrl,
  buildMailtoUrl,
  isValidEmail,
  openEmailDraft,
  prefillCompletedFromDoneToday,
  ACCOUNTABILITY_PARTNER_EMAIL_KEY,
} from './eodEmail';
import {
  buildEodReportPreview,
  buildEodReportText,
  localDateKey,
  readNightPrepForEod,
  reportCompleted,
  reportLearnings,
} from './eodReports';
import { useEodReports } from './hooks/useEodReports';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useWorkTrackerContext } from './hooks/WorkTrackerProvider';
import type { DoneTodayItem, Infraction } from './types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface EodSendModalProps {
  open: boolean;
  onClose: () => void;
  infractions: Infraction[];
  doneTodayItems: DoneTodayItem[];
}

export default function EodSendModal({ open, onClose, infractions, doneTodayItems }: EodSendModalProps) {
  const { getTodayStats } = useWorkTrackerContext();
  const { saveReport, getReport } = useEodReports();
  const [partnerEmail, setPartnerEmail] = useLocalStorage<string>(ACCOUNTABILITY_PARTNER_EMAIL_KEY, '');
  const [completed, setCompleted] = useState('');
  const [learnings, setLearnings] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [bodyTouched, setBodyTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const initializedRef = useRef(false);

  const todayKey = localDateKey();

  const reportParams = useMemo(() => {
    const stats = getTodayStats();
    const nightPrep = readNightPrepForEod();
    return {
      completed,
      tomorrow: nightPrep.tomorrow,
      previousDayContext: nightPrep.previousDayContext,
      learnings,
      totalWorkMs: stats.totalWorkMs,
      totalBreakMs: stats.totalBreakMs,
      sessionCount: stats.sessionCount,
      sessions: stats.sessions,
      infractions,
      doneToday: doneTodayItems,
      activeSession: stats.activeSession
        ? { project: stats.activeSession.project, elapsedMs: stats.activeSession.workMs }
        : null,
    };
  }, [completed, learnings, getTodayStats, infractions, doneTodayItems]);

  const generatedBody = useMemo(
    () => buildEodReportText(buildEodReportPreview(reportParams)),
    [reportParams]
  );

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    const existing = getReport(todayKey);
    setCompleted(existing ? reportCompleted(existing) : prefillCompletedFromDoneToday(doneTodayItems));
    setLearnings(existing ? reportLearnings(existing) : '');
    setBodyTouched(false);
    setEmailError(null);
    setSent(false);
  }, [open, todayKey, getReport, doneTodayItems]);

  useEffect(() => {
    if (!open || bodyTouched) return;
    setEmailBody(generatedBody);
  }, [open, generatedBody, bodyTouched]);

  const handleSendGmail = () => {
    const to = partnerEmail.trim();
    if (!isValidEmail(to)) {
      setEmailError('Enter a valid partner email');
      return;
    }
    saveReport(reportParams);
    const subject = buildEodEmailSubject(todayKey);
    openEmailDraft(buildGmailComposeUrl(to, subject, emailBody.trim()));
    setSent(true);
  };

  const handleSendMailApp = () => {
    const to = partnerEmail.trim();
    if (!isValidEmail(to)) {
      setEmailError('Enter a valid partner email');
      return;
    }
    saveReport(reportParams);
    const subject = buildEodEmailSubject(todayKey);
    openEmailDraft(buildMailtoUrl(to, subject, emailBody.trim()));
    setSent(true);
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={onClose} role="presentation">
      <div
        style={styles.panel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eod-send-title"
      >
        <div style={styles.header}>
          <h3 id="eod-send-title" style={styles.title}>
            Send EOD to partner
          </h3>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close">
            ×
          </button>
        </div>

        <p style={styles.hint}>
          Opens Gmail (or your mail app) with today&apos;s report pre-filled. You review and hit Send — nothing
          leaves Daywinner automatically.
        </p>

        <label style={styles.label} htmlFor="partner-email">
          Accountability partner email
        </label>
        <input
          id="partner-email"
          type="email"
          value={partnerEmail}
          onChange={e => {
            setPartnerEmail(e.target.value);
            setEmailError(null);
          }}
          placeholder="partner@example.com"
          style={styles.input}
          autoComplete="email"
        />
        {emailError ? <p style={styles.error}>{emailError}</p> : null}

        <label style={styles.label} htmlFor="eod-completed">
          What you got done today
        </label>
        <textarea
          id="eod-completed"
          value={completed}
          onChange={e => {
            setCompleted(e.target.value);
            setBodyTouched(false);
          }}
          rows={3}
          style={styles.textarea}
          placeholder="Summarize what you completed…"
        />

        <label style={styles.label} htmlFor="eod-learnings">
          Insights / learnings
        </label>
        <textarea
          id="eod-learnings"
          value={learnings}
          onChange={e => {
            setLearnings(e.target.value);
            setBodyTouched(false);
          }}
          rows={2}
          style={styles.textarea}
          placeholder="Optional"
        />

        <label style={styles.label} htmlFor="eod-body">
          Email body
        </label>
        <textarea
          id="eod-body"
          value={emailBody}
          onChange={e => {
            setBodyTouched(true);
            setEmailBody(e.target.value);
          }}
          rows={14}
          style={{ ...styles.textarea, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}
        />

        {sent ? (
          <p style={styles.sentNote}>Draft opened — finish sending in your email app, then close this window.</p>
        ) : null}

        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.secondaryBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSendMailApp} style={styles.secondaryBtn}>
            Mail app
          </button>
          <button type="button" onClick={handleSendGmail} style={styles.primaryBtn}>
            Open in Gmail
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(15, 23, 42, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 520px)',
    maxHeight: 'min(92vh, 820px)',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 12,
    padding: '20px 22px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 17,
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
  hint: {
    margin: '10px 0 16px',
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.45,
  },
  label: {
    display: 'block',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: font,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: font,
    lineHeight: 1.45,
    resize: 'vertical',
    outline: 'none',
  },
  error: {
    margin: '6px 0 0',
    fontSize: 12,
    color: '#dc2626',
  },
  sentNote: {
    margin: '12px 0 0',
    fontSize: 12,
    color: '#047857',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
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
    background: '#047857',
    color: '#fff',
    cursor: 'pointer',
  },
};

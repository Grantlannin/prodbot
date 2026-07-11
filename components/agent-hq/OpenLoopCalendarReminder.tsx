'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import type { CaptureNote } from './types';
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarEventUrl,
  buildSingleEventIcs,
  defaultReminderDate,
  downloadIcsFile,
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
} from './googleCalendarLink';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function eventTitle(note: CaptureNote): string {
  const t = note.title.trim();
  if (t) return `Open loop: ${t}`;
  return 'Open loop reminder';
}

/** Short description for calendar links — avoids huge URLs from full note body. */
function calendarDetails(note: CaptureNote): string {
  const skipPrefixes = ['1) What is the open loop', '2) Clarify anything'];
  const lines = note.body
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !skipPrefixes.some(prefix => l.startsWith(prefix)));

  const text = lines.join('\n').trim() || note.title.trim() || 'Open loop reminder';
  return text.length > 480 ? `${text.slice(0, 477)}…` : text;
}

export default function OpenLoopCalendarReminder({ note }: { note: CaptureNote }) {
  const [when, setWhen] = useState(() => toDatetimeLocalValue(defaultReminderDate()));

  const start = useMemo(() => parseDatetimeLocalValue(when), [when]);
  const valid = start !== null && start.getTime() > Date.now() - 60_000;

  const eventOpts = useMemo(
    () =>
      start
        ? {
            title: eventTitle(note),
            details: calendarDetails(note),
            start,
            durationMinutes: 30,
          }
        : null,
    [note, start]
  );

  const openGoogle = () => {
    if (!eventOpts) return;
    const url = buildGoogleCalendarUrl({ ...eventOpts, maxDetailsLength: 480 });
    window.open(url, '_blank');
  };

  const openApple = () => {
    if (!eventOpts) return;
    downloadIcsFile(buildSingleEventIcs(eventOpts), 'open-loop.ics');
  };

  const openOutlook = () => {
    if (!eventOpts) return;
    const url = buildOutlookCalendarEventUrl(eventOpts);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const btnStyle = (disabled: boolean): CSSProperties => ({
    ...styles.calendarBtn,
    ...(disabled ? styles.btnDisabled : {}),
  });

  return (
    <div style={styles.wrap}>
      <div style={styles.timeRow}>
        <span style={styles.label}>Remind me</span>
        <input
          type="datetime-local"
          value={when}
          onChange={e => setWhen(e.target.value)}
          style={styles.input}
          aria-label="Open loop reminder time"
        />
      </div>

      <div style={styles.calendarActions}>
        <button
          type="button"
          onClick={openGoogle}
          disabled={!valid}
          style={btnStyle(!valid)}
        >
          Google Calendar
        </button>
        <button
          type="button"
          onClick={openApple}
          disabled={!valid}
          style={btnStyle(!valid)}
        >
          Apple Calendar
        </button>
        <button
          type="button"
          onClick={openOutlook}
          disabled={!valid}
          style={btnStyle(!valid)}
        >
          Outlook
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '10px 14px',
    borderTop: '1px solid #f1f5f9',
    fontFamily: font,
  },
  timeRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: '#64748b',
  },
  input: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
    boxSizing: 'border-box',
  },
  calendarActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  calendarBtn: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    textAlign: 'left',
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
};

'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import type { CaptureNote } from './types';
import { noteKind, noteListLabel } from './openLoopsUi';
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarEventUrl,
  buildSingleEventIcs,
  downloadIcsFile,
} from './googleCalendarLink';
import { formatMinutesLabel } from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const START_TIME_OPTIONS: number[] = (() => {
  const out: number[] = [];
  for (let m = 4 * 60; m < 24 * 60; m += 60) out.push(m);
  return out;
})();

function defaultStartMinutes(): number {
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const snapped = Math.round(minutesNow / 60) * 60;
  return Math.max(4 * 60, Math.min(22 * 60, snapped));
}

function startDateFromMinutes(startMinutes: number): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  return d;
}

function eventTitle(note: CaptureNote): string {
  const label = noteListLabel(note, []);
  if (noteKind(note) === 'decision') {
    return label ? `Decision: ${label}` : 'Unmade decision';
  }
  return label ? `Open loop: ${label}` : 'Open loop reminder';
}

/** Short description for calendar links — avoids huge URLs from full note body. */
function calendarDetails(note: CaptureNote): string {
  const skipPrefixes = ['1) What is the open loop', '2) Clarify anything'];
  const lines = note.body
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !skipPrefixes.some(prefix => l.startsWith(prefix)));

  const text = lines.join('\n').trim() || note.title.trim() || eventTitle(note);
  return text.length > 480 ? `${text.slice(0, 477)}…` : text;
}

export default function OpenLoopCalendarReminder({ note }: { note: CaptureNote }) {
  const [startMinutes, setStartMinutes] = useState(defaultStartMinutes);

  const start = useMemo(() => startDateFromMinutes(startMinutes), [startMinutes]);

  const eventOpts = useMemo(
    () => ({
      title: eventTitle(note),
      details: calendarDetails(note),
      start,
      durationMinutes: 30,
    }),
    [note, start]
  );

  const openGoogle = () => {
    const url = buildGoogleCalendarUrl({ ...eventOpts, maxDetailsLength: 480 });
    window.open(url, '_blank');
  };

  const openApple = () => {
    downloadIcsFile(buildSingleEventIcs(eventOpts), 'open-loop.ics');
  };

  const openOutlook = () => {
    const url = buildOutlookCalendarEventUrl(eventOpts);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.timeRow}>
        <span style={styles.label}>set a time (optional)</span>
        <select
          value={startMinutes}
          onChange={e => setStartMinutes(Number(e.target.value))}
          style={styles.select}
          aria-label="set a time (optional)"
        >
          {START_TIME_OPTIONS.map(mins => (
            <option key={mins} value={mins}>
              {formatMinutesLabel(mins)}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.calendarActions}>
        <button type="button" onClick={openGoogle} style={styles.calendarBtn}>
          Google Calendar
        </button>
        <button type="button" onClick={openApple} style={styles.calendarBtn}>
          Apple Calendar
        </button>
        <button type="button" onClick={openOutlook} style={styles.calendarBtn}>
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
  select: {
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
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarBtn: {
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#334155',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: font,
  },
};

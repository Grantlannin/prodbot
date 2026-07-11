'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  DEFAULT_NIGHT_PREP_TIME,
  NIGHT_PREP_TIME_KEY,
  openNightPrepAppleCalendar,
  openNightPrepGoogleCalendar,
  openNightPrepOutlookCalendar,
  parseTimeInput,
  timeToInput,
  type NightPrepReminderTime,
} from './nightPrepReminder';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const STORAGE_KEY = 'agentHQ_nightPrep';

interface NightPrepState {
  tomorrowTasks: string;
  previousDayContext: string;
}

const QUESTIONS = [
  'have i prioritized my sleep/energy',
  "do i know where I'm working tomorrow / roughly when",
  'Is my task list finished for tomorrow (can create below)',
];

function normalizeState(state: Partial<NightPrepState> | NightPrepState): NightPrepState {
  return {
    tomorrowTasks: typeof state.tomorrowTasks === 'string' ? state.tomorrowTasks : '',
    previousDayContext: typeof state.previousDayContext === 'string' ? state.previousDayContext : '',
  };
}

export default function NightPrepPanel() {
  const [state, setState] = useLocalStorage<NightPrepState>(STORAGE_KEY, {
    tomorrowTasks: '',
    previousDayContext: '',
  });
  const [reminderTime, setReminderTime] = useLocalStorage<NightPrepReminderTime>(
    NIGHT_PREP_TIME_KEY,
    DEFAULT_NIGHT_PREP_TIME
  );
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const current = normalizeState(state);

  const setTomorrowTasks = useCallback(
    (tomorrowTasks: string) => {
      setState(prev => ({ ...normalizeState(prev), tomorrowTasks }));
    },
    [setState]
  );

  const setPreviousDayContext = useCallback(
    (previousDayContext: string) => {
      setState(prev => ({ ...normalizeState(prev), previousDayContext }));
    },
    [setState]
  );

  const onTimeChange = useCallback(
    (value: string) => {
      const parsed = parseTimeInput(value);
      if (!parsed) return;
      setReminderTime(parsed);
      setReminderNote(null);
    },
    [setReminderTime]
  );

  const addToGoogleCalendar = useCallback(() => {
    openNightPrepGoogleCalendar(reminderTime);
    setReminderNote('Google Calendar opened.');
  }, [reminderTime]);

  const addToAppleCalendar = useCallback(() => {
    openNightPrepAppleCalendar(reminderTime);
    setReminderNote('Apple Calendar opened.');
  }, [reminderTime]);

  const addToOutlookCalendar = useCallback(() => {
    openNightPrepOutlookCalendar(reminderTime);
    setReminderNote('Outlook opened — set repeat to Daily.');
  }, [reminderTime]);

  return (
    <div style={styles.root}>
      <div style={styles.checksBlock}>
        <p style={styles.subheadline}>
          If you can take 10 minutes to answer YES to these 3 questions the night before, you&apos;re all set
          &amp; will WIN your day tomorrow like an unstoppable force.
        </p>

        <ul style={styles.list}>
          {QUESTIONS.map(label => (
            <li key={label} style={styles.item}>
              <span style={styles.question}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={styles.notesWrap}>
        <div style={styles.notesToolbar}>
          <span style={styles.notesToolbarTitle}>Tomorrow&apos;s main tasks</span>
        </div>
        <textarea
          value={current.tomorrowTasks}
          onChange={e => setTomorrowTasks(e.target.value)}
          style={styles.notesArea}
          spellCheck
        />
      </div>

      <div style={styles.notesWrap}>
        <div style={styles.notesToolbar}>
          <span style={styles.notesToolbarTitle}>
            Previous day&apos;s context (avoid paying clarity tax)
          </span>
        </div>
        <textarea
          value={current.previousDayContext}
          onChange={e => setPreviousDayContext(e.target.value)}
          style={styles.notesArea}
          spellCheck
        />
      </div>

      <div style={styles.reminderSection}>
        <span style={styles.reminderLabel}>Calendar reminder</span>
        <p style={styles.reminderHint}>(set a reminder for yourself to do your night prep)</p>
        <div style={styles.reminderRow}>
          <input
            type="time"
            value={timeToInput(reminderTime.hour, reminderTime.minute)}
            onChange={e => onTimeChange(e.target.value)}
            style={styles.timeInput}
            aria-label="Night prep calendar reminder time"
          />
          <button type="button" onClick={addToAppleCalendar} style={styles.calendarBtn} title="Add to Apple Calendar">
            Apple
          </button>
          <button type="button" onClick={addToGoogleCalendar} style={styles.calendarBtn} title="Add to Google Calendar">
            Google
          </button>
          <button type="button" onClick={addToOutlookCalendar} style={styles.calendarBtn} title="Add to Outlook">
            Outlook
          </button>
        </div>
      </div>

      {reminderNote ? <p style={styles.reminderNote}>{reminderNote}</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  checksBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  subheadline: {
    margin: 0,
    fontSize: 10,
    color: '#64748b',
    lineHeight: 1.35,
    fontStyle: 'italic',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  item: {
    margin: 0,
  },
  question: {
    fontSize: 11,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  notesWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    background: '#fff',
  },
  notesToolbar: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 10px',
    background: '#fff',
    borderBottom: '1px solid #f1f5f9',
  },
  notesToolbarTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    letterSpacing: '0.01em',
  },
  notesArea: {
    width: '100%',
    minHeight: 120,
    padding: '10px 12px 12px',
    border: 'none',
    outline: 'none',
    resize: 'vertical',
    background: '#fff',
    color: '#0f172a',
    fontFamily: font,
    fontSize: 13,
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  reminderSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingTop: 2,
  },
  reminderHint: {
    margin: 0,
    fontSize: 10,
    color: '#64748b',
    lineHeight: 1.35,
  },
  reminderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  reminderLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  timeInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 4px',
    fontSize: 11,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
    height: 22,
  },
  calendarBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 7px',
    background: '#fff',
    color: '#475569',
    fontSize: 10,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    lineHeight: '18px',
  },
  reminderNote: {
    margin: 0,
    fontSize: 9,
    color: '#15803d',
    lineHeight: 1.3,
  },
};

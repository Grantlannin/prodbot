'use client';

import type { CSSProperties } from 'react';
import type { RecurringTaskItem, TrackedHabit } from './types';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface EodTrackingPickerProps {
  habits: TrackedHabit[];
  recurringTasks: RecurringTaskItem[];
  getHabitNotes: (id: string) => string;
  getRecurringNotes: (id: string) => string;
  onSelectHabit: (habit: TrackedHabit) => void;
  onSelectRecurring: (task: RecurringTaskItem) => void;
  onContinue: () => void;
}

export default function EodTrackingPicker({
  habits,
  recurringTasks,
  getHabitNotes,
  getRecurringNotes,
  onSelectHabit,
  onSelectRecurring,
  onContinue,
}: EodTrackingPickerProps) {
  return (
    <div style={styles.wrap}>
      {habits.length > 0 ? (
        <div style={styles.group}>
          <span style={styles.groupLabel}>Habits</span>
          <div style={styles.list}>
            {habits.map(habit => {
              const hasNotes = Boolean(getHabitNotes(habit.id).trim());
              const meta = [habit.goal, habit.metric].filter(Boolean).join(' · ');
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => onSelectHabit(habit)}
                  style={styles.itemBtn}
                >
                  <span style={styles.itemRow}>
                    <span style={styles.itemName}>{habit.name}</span>
                    {hasNotes ? <span style={styles.loggedTag}>logged</span> : null}
                  </span>
                  {meta ? <span style={styles.itemMeta}>{meta}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {recurringTasks.length > 0 ? (
        <div style={styles.group}>
          <span style={styles.groupLabel}>Recurring / management</span>
          <div style={styles.list}>
            {recurringTasks.map(task => {
              const hasNotes = Boolean(getRecurringNotes(task.id).trim());
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectRecurring(task)}
                  style={styles.itemBtn}
                >
                  <span style={styles.itemRow}>
                    <span style={styles.itemName}>{task.name}</span>
                    {hasNotes ? <span style={styles.loggedTag}>logged</span> : null}
                  </span>
                  {task.milestone ? <span style={styles.itemMeta}>{task.milestone}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button type="button" onClick={onContinue} style={styles.continueBtn}>
        Continue to report
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 420,
    fontFamily: font,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 220,
    overflowY: 'auto',
  },
  itemBtn: {
    width: '100%',
    textAlign: 'left',
    background: '#141414',
    border: '1px solid #333333',
    borderRadius: 8,
    padding: '9px 11px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e5e5e5',
    lineHeight: 1.3,
  },
  itemMeta: {
    fontSize: 11,
    color: '#737373',
    lineHeight: 1.35,
  },
  loggedTag: {
    fontSize: 9,
    fontWeight: 600,
    color: '#86efac',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  continueBtn: {
    alignSelf: 'flex-start',
    border: '1px solid #404040',
    borderRadius: 8,
    background: '#171717',
    color: '#e5e5e5',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    padding: '8px 12px',
    cursor: 'pointer',
  },
};

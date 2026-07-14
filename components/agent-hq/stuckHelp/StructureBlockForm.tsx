'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  parseOpenLoopLine,
  parseStructureBlockLine,
  parseTimeOrRangeInput,
  parseTimeRangeInput,
} from './dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export interface StructureBlockAddOptions {
  singleTime?: boolean;
}

interface StructureBlockFormProps {
  namePlaceholder: string;
  timeRangePlaceholder: string;
  quickEntryPlaceholder: string;
  addLabel: string;
  allowSingleTime?: boolean;
  onAdd: (
    title: string,
    startMinutes: number,
    durationMinutes: number,
    options?: StructureBlockAddOptions
  ) => void;
}

export default function StructureBlockForm({
  namePlaceholder,
  timeRangePlaceholder,
  quickEntryPlaceholder,
  addLabel,
  allowSingleTime = false,
  onAdd,
}: StructureBlockFormProps) {
  const [title, setTitle] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [quickEntry, setQuickEntry] = useState('');
  const [error, setError] = useState('');

  const rangeError = allowSingleTime
    ? 'Type a time like 2pm or a range like 2pm-2:15pm.'
    : 'Type a time range like 9am-5pm or 9:00-17:00.';
  const quickError = allowSingleTime
    ? 'Type one line like text johnny at 2pm or text johnny 2pm-2:15pm.'
    : 'Type one line like Job 9am-5pm.';

  const submitSplit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Add an event name.');
      return;
    }

    let result: { startMinutes: number; durationMinutes: number; singleTime?: boolean } | null = null;
    if (allowSingleTime) {
      result = parseTimeOrRangeInput(timeRange);
    } else {
      const range = parseTimeRangeInput(timeRange);
      result = range ? { ...range, singleTime: false } : null;
    }

    if (!result) {
      setError(rangeError);
      return;
    }

    setError('');
    onAdd(trimmedTitle, result.startMinutes, result.durationMinutes, {
      singleTime: result.singleTime,
    });
    setTitle('');
    setTimeRange('');
    setQuickEntry('');
  };

  const submitQuick = () => {
    if (allowSingleTime) {
      const parsed = parseOpenLoopLine(quickEntry);
      if (!parsed) {
        setError(quickError);
        return;
      }
      setError('');
      onAdd(parsed.title, parsed.startMinutes, parsed.durationMinutes, {
        singleTime: parsed.singleTime,
      });
    } else {
      const parsed = parseStructureBlockLine(quickEntry);
      if (!parsed) {
        setError(quickError);
        return;
      }
      setError('');
      onAdd(parsed.title, parsed.startMinutes, parsed.durationMinutes, { singleTime: false });
    }
    setQuickEntry('');
    setTitle('');
    setTimeRange('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, mode: 'split' | 'quick') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'quick') submitQuick();
      else submitSplit();
    }
  };

  return (
    <div style={styles.form}>
      <input
        type="text"
        value={quickEntry}
        onChange={e => {
          setQuickEntry(e.target.value);
          setError('');
        }}
        onKeyDown={e => handleKeyDown(e, 'quick')}
        placeholder={quickEntryPlaceholder}
        style={styles.quickInput}
      />

      <div style={styles.orRow}>or</div>

      <input
        type="text"
        value={title}
        onChange={e => {
          setTitle(e.target.value);
          setError('');
        }}
        onKeyDown={e => handleKeyDown(e, 'split')}
        placeholder={namePlaceholder}
        style={styles.nameInput}
      />
      <input
        type="text"
        value={timeRange}
        onChange={e => {
          setTimeRange(e.target.value);
          setError('');
        }}
        onKeyDown={e => handleKeyDown(e, 'split')}
        placeholder={timeRangePlaceholder}
        style={styles.timeInput}
      />
      {error ? <p style={styles.error}>{error}</p> : null}
      <button
        type="button"
        disabled={!title.trim() && !quickEntry.trim()}
        onClick={() => {
          if (quickEntry.trim()) submitQuick();
          else submitSplit();
        }}
        style={{
          ...styles.addBtn,
          ...(!title.trim() && !quickEntry.trim() ? styles.addBtnDisabled : {}),
        }}
      >
        {addLabel}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontFamily: font,
  },
  quickInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: font,
    outline: 'none',
    color: '#0f172a',
  },
  orRow: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  nameInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: font,
    outline: 'none',
    color: '#0f172a',
  },
  timeInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: font,
    outline: 'none',
    color: '#0f172a',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    margin: 0,
    fontSize: 12,
    color: '#dc2626',
    lineHeight: 1.4,
  },
  addBtn: {
    border: '1px solid #007aff',
    borderRadius: 18,
    padding: '9px 13px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#007aff',
    cursor: 'pointer',
  },
  addBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
};

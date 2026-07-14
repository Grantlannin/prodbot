'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  parseStructureBlockLine,
  parseTimeRangeInput,
} from './dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface StructureBlockFormProps {
  namePlaceholder: string;
  timeRangePlaceholder: string;
  quickEntryPlaceholder: string;
  addLabel: string;
  onAdd: (title: string, startMinutes: number, durationMinutes: number) => void;
}

export default function StructureBlockForm({
  namePlaceholder,
  timeRangePlaceholder,
  quickEntryPlaceholder,
  addLabel,
  onAdd,
}: StructureBlockFormProps) {
  const [title, setTitle] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [quickEntry, setQuickEntry] = useState('');
  const [error, setError] = useState('');

  const submitSplit = () => {
    const trimmedTitle = title.trim();
    const range = parseTimeRangeInput(timeRange);
    if (!trimmedTitle) {
      setError('Add an event name.');
      return;
    }
    if (!range) {
      setError('Type a time range like 9am-5pm or 9:00-17:00.');
      return;
    }
    setError('');
    onAdd(trimmedTitle, range.startMinutes, range.durationMinutes);
    setTitle('');
    setQuickEntry('');
  };

  const submitQuick = () => {
    const parsed = parseStructureBlockLine(quickEntry);
    if (!parsed) {
      setError('Type one line like Job 9am-5pm.');
      return;
    }
    setError('');
    onAdd(parsed.title, parsed.startMinutes, parsed.durationMinutes);
    setQuickEntry('');
    setTitle('');
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

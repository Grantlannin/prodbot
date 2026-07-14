'use client';

import { useState, type CSSProperties } from 'react';
import {
  durationFromTimes,
  minutesToTimeInput,
  parseTimeInput,
} from './dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface StructureBlockFormProps {
  namePlaceholder: string;
  addLabel: string;
  defaultStartMinutes?: number;
  defaultDurationMinutes?: number;
  onAdd: (title: string, startMinutes: number, durationMinutes: number) => void;
}

export default function StructureBlockForm({
  namePlaceholder,
  addLabel,
  defaultStartMinutes = 9 * 60,
  defaultDurationMinutes = 60,
  onAdd,
}: StructureBlockFormProps) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(minutesToTimeInput(defaultStartMinutes));
  const [end, setEnd] = useState(minutesToTimeInput(defaultStartMinutes + defaultDurationMinutes));

  const handleAdd = () => {
    const trimmed = title.trim();
    const startMinutes = parseTimeInput(start);
    const endMinutes = parseTimeInput(end);
    if (!trimmed || startMinutes == null || endMinutes == null) return;
    const durationMinutes = durationFromTimes(startMinutes, endMinutes);
    onAdd(trimmed, startMinutes, durationMinutes);
    setTitle('');
  };

  return (
    <div style={styles.form}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={namePlaceholder}
        style={styles.nameInput}
      />
      <div style={styles.timeRow}>
        <label style={styles.timeLabel}>
          Start
          <input type="time" value={start} onChange={e => setStart(e.target.value)} style={styles.timeInput} />
        </label>
        <label style={styles.timeLabel}>
          End
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={styles.timeInput} />
        </label>
      </div>
      <button
        type="button"
        disabled={!title.trim()}
        onClick={handleAdd}
        style={{ ...styles.addBtn, ...(!title.trim() ? styles.addBtnDisabled : {}) }}
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
  nameInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: font,
    outline: 'none',
    color: '#0f172a',
  },
  timeRow: {
    display: 'flex',
    gap: 10,
  },
  timeLabel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  timeInput: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 14,
    fontFamily: font,
    color: '#0f172a',
    width: '100%',
    boxSizing: 'border-box',
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

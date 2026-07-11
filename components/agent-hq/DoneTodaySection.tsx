'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DoneTodayItem } from './types';
import ProjectCompletionOverlay from './ProjectCompletionOverlay';
import { triggerCelebration } from './celebrationEffects';
import { useUserProfile } from './hooks/UserProfileProvider';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface DoneTodayBannerProps {
  items: DoneTodayItem[];
  onRemove: (id: string) => void;
  onAdd: (text: string) => void;
}

export function DoneTodayBanner({ items, onRemove, onAdd }: DoneTodayBannerProps) {
  const { celebration, getCelebrationMessage } = useUserProfile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setDraft('');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
    setOpen(false);
    triggerCelebration(celebration, () => setShowCelebration(true));
  }, [draft, onAdd, celebration]);

  return (
    <>
      <div ref={wrapRef} style={styles.bannerDoneToday}>
        <div style={styles.titleRow}>
          <div style={styles.doneTodayTitle}>What you got done today</div>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            style={styles.inlineAddBtn}
            title="Log something you finished"
            aria-label="Log something you finished"
            aria-expanded={open}
          >
            +
          </button>
        </div>

        {open ? (
          <form
            style={styles.inlineAddForm}
            onSubmit={e => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="What did you finish?"
              style={styles.quickInput}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              style={{
                ...styles.quickSubmit,
                ...(!draft.trim() ? styles.quickSubmitDisabled : {}),
              }}
            >
              Add
            </button>
          </form>
        ) : null}

        {items.length > 0 ? (
          <ul style={styles.doneList}>
            {items.map(item => (
              <li key={item.id} style={styles.doneItem}>
                <span style={styles.doneCheck} aria-hidden>
                  ✓
                </span>
                <div style={styles.doneTextWrap}>
                  <div style={styles.doneText}>{item.text}</div>
                  {item.detail ? <div style={styles.doneDetail}>{item.detail}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  style={styles.removeBtn}
                  aria-label={`Remove ${item.text}`}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div style={styles.empty}>
            Take massive imperfect action so you can throw your day&apos;s &ldquo;DONE&apos;S&rdquo; onto this list.
            Feel the rush of success.
          </div>
        )}
      </div>
      <ProjectCompletionOverlay
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        message={getCelebrationMessage()}
        showMessage={celebration.showMessage}
      />
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  bannerDoneToday: {
    position: 'relative',
    minWidth: 0,
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 55%, #ecfdf5 100%)',
    border: '1px solid #bbf7d0',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
    fontFamily: font,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  doneTodayTitle: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#065f46',
    lineHeight: 1.2,
    minWidth: 0,
  },
  inlineAddBtn: {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: 6,
    border: 'none',
    background: '#10b981',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  inlineAddForm: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  quickInput: {
    flex: 1,
    minWidth: 0,
    boxSizing: 'border-box',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '7px 9px',
    fontSize: 12,
    fontFamily: font,
    outline: 'none',
    background: '#fff',
  },
  quickSubmit: {
    flexShrink: 0,
    border: 'none',
    borderRadius: 8,
    padding: '7px 10px',
    background: '#065f46',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    fontFamily: font,
    cursor: 'pointer',
  },
  quickSubmitDisabled: {
    background: '#d1fae5',
    color: '#6ee7b7',
    cursor: 'not-allowed',
  },
  doneList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 140,
    overflowY: 'auto',
  },
  doneItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid #d1fae5',
  },
  doneCheck: {
    flexShrink: 0,
    width: 18,
    height: 18,
    borderRadius: 999,
    background: '#10b981',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  doneTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  doneText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  doneDetail: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  removeBtn: {
    flexShrink: 0,
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
  empty: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 1.5,
    opacity: 0.9,
  },
};

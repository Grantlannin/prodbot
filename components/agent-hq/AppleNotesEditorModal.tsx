'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface AppleNotesEditorModalProps {
  open: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function AppleNotesEditorModal({
  open,
  title,
  value,
  onChange,
  onClose,
}: AppleNotesEditorModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={onClose} role="presentation">
      <div
        style={styles.panel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div style={styles.header}>
          <span style={styles.headerTitle}>{title}</span>
          <button type="button" onClick={onClose} style={styles.doneBtn}>
            Done
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Start typing…"
          style={styles.textarea}
        />
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
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  panel: {
    width: 'min(100%, 520px)',
    height: 'min(70vh, 420px)',
    background: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    fontFamily: font,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    background: '#fff',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  doneBtn: {
    border: 'none',
    background: 'transparent',
    color: '#6366f1',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 0',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    padding: 16,
    border: 'none',
    outline: 'none',
    resize: 'none',
    background: '#fff',
    color: '#0f172a',
    fontFamily: font,
    fontSize: 14,
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
};

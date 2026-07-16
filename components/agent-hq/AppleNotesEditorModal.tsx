'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { editableHtmlToNoteText, noteTextToEditableHtml } from './noteFormatUtils';

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
  const editorRef = useRef<HTMLDivElement>(null);
  const syncedValueRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !editorRef.current) return;
    if (syncedValueRef.current === value) return;
    editorRef.current.innerHTML = noteTextToEditableHtml(value);
    syncedValueRef.current = value;
    const timer = window.setTimeout(() => editorRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, value]);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = editableHtmlToNoteText(el);
    syncedValueRef.current = next;
    onChange(next);
  };

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
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          data-placeholder="Start typing…"
          style={styles.editor}
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
  editor: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    padding: 16,
    border: 'none',
    outline: 'none',
    overflowY: 'auto',
    background: '#fff',
    color: '#0f172a',
    fontFamily: font,
    fontSize: 14,
    lineHeight: 1.6,
    boxSizing: 'border-box',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

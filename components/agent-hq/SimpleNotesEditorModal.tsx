'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { editableHtmlToNoteText, noteTextToEditableHtml } from './noteFormatUtils';

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const COMMIT_DEBOUNCE_MS = 300;

interface SimpleNotesEditorModalProps {
  open: boolean;
  /** Stable id for the note being edited — only used to (re)load the DOM. */
  syncKey?: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

/**
 * Project notes/context editor.
 * Keeps typing in the contentEditable DOM; only loads from `value` when opening
 * or switching notes — never while focused (avoids caret jumps).
 */
export default function SimpleNotesEditorModal({
  open,
  syncKey = '',
  title,
  value,
  onChange,
  onClose,
}: SimpleNotesEditorModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const syncKeyRef = useRef('');
  const draftRef = useRef('');
  const lastCommittedRef = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const commitDraft = useCallback(() => {
    clearTimer();
    const next = draftRef.current;
    if (next === lastCommittedRef.current) return;
    lastCommittedRef.current = next;
    onChangeRef.current(next);
  }, [clearTimer]);

  const handleClose = useCallback(() => {
    commitDraft();
    onClose();
  }, [commitDraft, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Load DOM only when opening or switching note targets — never on every parent value tick.
  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        // Parent closed the modal (or we unmounted) — persist any pending draft.
        commitDraft();
      }
      wasOpenRef.current = false;
      syncKeyRef.current = '';
      clearTimer();
      return;
    }

    const el = editorRef.current;
    if (!el) return;

    const justOpened = !wasOpenRef.current;
    const keyChanged = syncKey !== syncKeyRef.current;
    wasOpenRef.current = true;

    if (!justOpened && !keyChanged) return;

    if (!justOpened && keyChanged) {
      commitDraft();
    }

    syncKeyRef.current = syncKey;
    const incoming = valueRef.current;
    el.innerHTML = noteTextToEditableHtml(incoming);
    draftRef.current = incoming;
    lastCommittedRef.current = incoming;

    const timer = window.setTimeout(() => el.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, syncKey, clearTimer, commitDraft]);

  useEffect(
    () => () => {
      clearTimer();
      const next = draftRef.current;
      if (next !== lastCommittedRef.current) {
        lastCommittedRef.current = next;
        onChangeRef.current(next);
      }
    },
    [clearTimer]
  );

  const scheduleCommit = useCallback(() => {
    if (composingRef.current) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commitDraft();
    }, COMMIT_DEBOUNCE_MS);
  }, [clearTimer, commitDraft]);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    draftRef.current = editableHtmlToNoteText(el);
    scheduleCommit();
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div style={styles.backdrop} onClick={handleClose} role="presentation">
      <div
        style={styles.panel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div style={styles.header}>
          <span style={styles.headerTitle}>{title}</span>
          <button type="button" onClick={handleClose} style={styles.doneBtn}>
            Done
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={commitDraft}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
            const el = editorRef.current;
            if (el) draftRef.current = editableHtmlToNoteText(el);
            scheduleCommit();
          }}
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

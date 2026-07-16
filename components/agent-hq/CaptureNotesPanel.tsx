'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CaptureNote } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function displayTitle(note: CaptureNote, skipLines: string[]): string {
  const t = note.title.trim();
  const raw =
    t ||
    (note.body
      .split(/\r?\n/)
      .find(l => l.trim() && !skipLines.some(s => l.trim().startsWith(s)))
      ?.trim() ??
      'Untitled');
  const label = raw.length > 36 ? raw.slice(0, 33) + '…' : raw;
  return note.kind === 'decision' ? `◇ ${label}` : label;
}

function editorFields(note: CaptureNote, defaultBodyPrompt?: string) {
  if (note.kind === 'decision') {
    return {
      titleLabel: 'Decision',
      titlePlaceholder: 'What do you need to decide?',
      bodyPrompt: 'Context — options, stakes, what’s making this hard, etc.',
    };
  }
  return {
    titleLabel: 'Title',
    titlePlaceholder: 'Name this…',
    bodyPrompt: defaultBodyPrompt,
  };
}

export interface AddNoteAction {
  label: string;
  bodyTemplate?: string;
  kind?: CaptureNote['kind'];
}

export interface CaptureNotesPanelProps {
  storageKey: string;
  bodyTemplate: string;
  addLabel: string;
  emptyMessage: string;
  bodyPrompt?: string;
  skipTitleLines?: string[];
  headerExtra?: ReactNode;
  extraAddActions?: AddNoteAction[];
  renderEditorExtra?: (note: CaptureNote) => ReactNode;
}

export default function CaptureNotesPanel({
  storageKey,
  bodyTemplate,
  addLabel,
  emptyMessage,
  bodyPrompt,
  skipTitleLines = [],
  headerExtra,
  extraAddActions = [],
  renderEditorExtra,
}: CaptureNotesPanelProps) {
  const [notes, setNotes] = useLocalStorage<CaptureNote[]>(storageKey, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const selected = notes.find(n => n.id === selectedId) ?? null;
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (selectedId && !notes.some(n => n.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? null);
    }
  }, [notes, selectedId, sorted]);

  const addNote = useCallback(
    (action?: AddNoteAction) => {
      const note: CaptureNote = {
        id: makeId(),
        title: '',
        body: action?.bodyTemplate ?? bodyTemplate,
        kind: action?.kind ?? 'open_loop',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes(prev => [note, ...prev]);
      setSelectedId(note.id);
      setTimeout(() => titleRef.current?.focus(), 0);
    },
    [bodyTemplate, setNotes]
  );

  const selectedEditor = selected ? editorFields(selected, bodyPrompt) : null;

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<CaptureNote, 'title' | 'body'>>) => {
      const now = Date.now();
      setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)));
    },
    [setNotes]
  );

  const deleteNote = useCallback(
    (id: string) => {
      if (!confirm('Delete this?')) return;
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, setNotes]
  );

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <span style={styles.count}>
          {notes.length === 0 ? 'None yet' : `${notes.length} saved`}
        </span>
        <div style={styles.toolbarActions}>
          {headerExtra}
          {extraAddActions.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={() => addNote(action)}
              style={styles.secondaryAddBtn}
            >
              {action.label}
            </button>
          ))}
          <button type="button" onClick={() => addNote()} style={styles.addBtn}>
            {addLabel}
          </button>
        </div>
      </div>

      <div style={styles.split}>
        <aside style={styles.sidebar}>
          {sorted.length === 0 ? (
            <div style={styles.sidebarEmpty}>{emptyMessage}</div>
          ) : (
            <div style={styles.sidebarList}>
              {sorted.map(note => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  style={{
                    ...styles.sidebarItem,
                    ...(note.id === selectedId ? styles.sidebarItemActive : {}),
                  }}
                  title={displayTitle(note, skipTitleLines)}
                >
                  {displayTitle(note, skipTitleLines)}
                </button>
              ))}
            </div>
          )}
        </aside>

        <div style={styles.editorPane}>
          {selected ? (
            <>
              <div style={styles.titleBlock}>
                <label htmlFor={`${storageKey}-title`} style={styles.titleLabel}>
                  {selectedEditor?.titleLabel}
                </label>
                <input
                  id={`${storageKey}-title`}
                  ref={titleRef}
                  type="text"
                  value={selected.title}
                  onChange={e => updateNote(selected.id, { title: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && selectedEditor?.bodyPrompt) {
                      e.preventDefault();
                      bodyRef.current?.focus();
                    }
                  }}
                  placeholder={selectedEditor?.titlePlaceholder}
                  style={styles.titleInput}
                />
              </div>
              {selectedEditor?.bodyPrompt ? (
                <div style={styles.bodyPrompt}>{selectedEditor.bodyPrompt}</div>
              ) : null}
              <textarea
                ref={bodyRef}
                value={selected.body}
                onChange={e => updateNote(selected.id, { body: e.target.value })}
                placeholder="Start typing…"
                style={styles.bodyInput}
              />
              {renderEditorExtra?.(selected)}
              <div style={styles.editorFooter}>
                <button type="button" onClick={() => deleteNote(selected.id)} style={styles.deleteBtn}>
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div style={styles.editorPlaceholder}>
              Select an item from the list or click <strong>{addLabel}</strong>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuestionsModal({
  title,
  questions,
  onClose,
}: {
  title: string;
  questions: string[];
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ x: 80, y: 100 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pw = 340;
    const ph = 420;
    setPos({
      x: Math.max(16, Math.min(w - pw - 16, w - pw - 24)),
      y: Math.max(16, Math.min(h - ph - 16, 100)),
    });
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startY, origX, origY } = dragRef.current;
      const panel = panelRef.current;
      const pw = panel?.offsetWidth ?? 340;
      const ph = panel?.offsetHeight ?? 420;
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - pw - 8, origX + e.clientX - startX)),
        y: Math.max(8, Math.min(window.innerHeight - ph - 8, origY + e.clientY - startY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  const panel = (
    <div
      ref={panelRef}
      style={{
        ...floatStyles.panel,
        left: pos.x,
        top: pos.y,
      }}
      role="dialog"
      aria-labelledby="questions-modal-title"
    >
      <div style={floatStyles.header} onMouseDown={onDragStart}>
        <span style={floatStyles.dragHint} aria-hidden>
          ⠿
        </span>
        <h3 id="questions-modal-title" style={floatStyles.title}>
          {title}
        </h3>
        <button type="button" onClick={onClose} style={floatStyles.closeBtn} aria-label="Close">
          ×
        </button>
      </div>
      <ul style={floatStyles.list}>
        {questions.map(q => (
          <li key={q} style={floatStyles.item}>
            {q}
          </li>
        ))}
      </ul>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    minHeight: 0,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  count: {
    fontSize: 12,
    color: '#64748b',
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  addBtn: {
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  secondaryAddBtn: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  split: {
    display: 'flex',
    gap: 0,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#fff',
    minHeight: 220,
  },
  sidebar: {
    width: 200,
    minWidth: 200,
    maxWidth: 200,
    flexShrink: 0,
    borderRight: '1px solid #e2e8f0',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  sidebarEmpty: {
    padding: 14,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.45,
  },
  sidebarList: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: 200,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sidebarItem: {
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid transparent',
    background: 'transparent',
    fontSize: 12,
    fontWeight: 500,
    color: '#475569',
    cursor: 'pointer',
    fontFamily: font,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sidebarItemActive: {
    background: '#fff',
    borderColor: '#e2e8f0',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  editorPane: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 220,
  },
  titleBlock: {
    padding: '4px 14px 0',
  },
  titleLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: '#64748b',
    marginBottom: 4,
  },
  titleInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: font,
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a',
    padding: 0,
    marginBottom: 6,
    boxSizing: 'border-box',
  },
  bodyPrompt: {
    padding: '8px 14px 0',
    fontSize: 13,
    fontWeight: 500,
    color: '#64748b',
    lineHeight: 1.45,
  },
  bodyInput: {
    flex: 1,
    width: '100%',
    minHeight: 120,
    padding: '8px 14px 12px',
    border: 'none',
    borderTop: '1px solid #f1f5f9',
    outline: 'none',
    resize: 'vertical',
    background: 'transparent',
    fontFamily: font,
    fontSize: 14,
    lineHeight: 1.55,
    color: '#0f172a',
    boxSizing: 'border-box',
    display: 'block',
  },
  editorFooter: {
    padding: '6px 14px 10px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: font,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  editorPlaceholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 1.5,
  },
};

const floatStyles: Record<string, CSSProperties> = {
  panel: {
    position: 'fixed',
    width: 340,
    maxHeight: 'min(70vh, 480px)',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 32px rgba(15,23,42,0.16)',
    fontFamily: font,
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    cursor: 'grab',
    userSelect: 'none',
  },
  dragHint: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    minWidth: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#475569',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
  },
  list: {
    margin: 0,
    padding: '12px 14px 16px 28px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  item: {
    fontSize: 13,
    lineHeight: 1.5,
    color: '#334155',
  },
};

'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SimpleNote } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useHoverNotes } from './hooks/HoverNotesProvider';
import { useNoteTextDraft } from './hooks/useNoteTextDraft';
import { useProjects } from './hooks/ProjectsProvider';
import { useNoteClipBubble } from './NoteSelectionClipBubble';
import {
  SIMPLE_NOTES_KEY,
  SIMPLE_NOTES_SELECTED_KEY,
  createSimpleNote,
  firstNoteLine,
  formatNoteTime,
  migrateLegacySimpleNotes,
  noteBodyPreview,
  sortNotesByUpdated,
} from './simpleNotesUtils';

const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const DAY = 86400000;

type GroupKey = 'today' | 'prev30' | 'older';

function groupNotes(notes: SimpleNote[]): { key: GroupKey; label: string; items: SimpleNote[] }[] {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const t0 = startToday.getTime();
  const t30 = t0 - 30 * DAY;

  const sorted = sortNotesByUpdated(notes);
  const today: SimpleNote[] = [];
  const prev30: SimpleNote[] = [];
  const older: SimpleNote[] = [];

  for (const n of sorted) {
    if (n.updatedAt >= t0) today.push(n);
    else if (n.updatedAt >= t30) prev30.push(n);
    else older.push(n);
  }

  const out: { key: GroupKey; label: string; items: SimpleNote[] }[] = [];
  if (today.length) out.push({ key: 'today', label: 'Today', items: today });
  if (prev30.length) out.push({ key: 'prev30', label: 'Previous 30 Days', items: prev30 });
  if (older.length) out.push({ key: 'older', label: 'Older', items: older });
  return out;
}

export default function SimpleNotesPanel() {
  const [notes, setNotes] = useLocalStorage<SimpleNote[]>(SIMPLE_NOTES_KEY, []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>(SIMPLE_NOTES_SELECTED_KEY, null);
  const [migrated, setMigrated] = useState(false);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set());
  const [lastDeleted, setLastDeleted] = useState<SimpleNote | null>(null);
  const { open: openHoverNotes, toggle: toggleHoverNotes, isOpen: hoverNotesOpen, supported: hoverNotesSupported } =
    useHoverNotes();
  const { projects, setProjects } = useProjects();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (migrated) return;
    setMigrated(true);
    migrateLegacySimpleNotes(notes, setNotes, selectedId, setSelectedId);
  }, [migrated, notes, setNotes, selectedId, setSelectedId]);

  useEffect(() => {
    if (notes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !notes.some(n => n.id === selectedId)) {
      setSelectedId(sortNotesByUpdated(notes)[0]?.id ?? null);
    }
  }, [notes, selectedId, setSelectedId]);

  const selected = useMemo(() => notes.find(n => n.id === selectedId) ?? null, [notes, selectedId]);

  const commitNoteContent = useCallback(
    (noteId: string, content: string) => {
      setNotes(prev =>
        prev.map(n => {
          if (n.id !== noteId) return n;
          if (n.content === content) return n;
          return { ...n, content, updatedAt: Date.now() };
        })
      );
    },
    [setNotes]
  );

  const {
    draft: editorDraft,
    onChange: onDraftChange,
    onFocus: onDraftFocus,
    onBlur: onDraftBlur,
  } = useNoteTextDraft(selectedId, selected?.content ?? '', commitNoteContent);

  const { textareaHandlers: clipHandlers, bubbleNode: clipBubble } = useNoteClipBubble({
    textareaRef,
    noteText: editorDraft,
    projects,
    setProjects,
  });

  const groups = useMemo(() => groupNotes(notes), [notes]);

  const addNote = useCallback(() => {
    const n = createSimpleNote();
    setNotes(prev => [n, ...prev]);
    setSelectedId(n.id);
  }, [setNotes, setSelectedId]);

  const deleteNote = useCallback(
    (id: string) => {
      if (!window.confirm('Do you want to delete?')) return;
      const note = notes.find(n => n.id === id);
      if (!note) return;
      // Include any unsaved draft so Undo restores what was on screen.
      const snapshot =
        selectedId === id ? { ...note, content: editorDraft, updatedAt: Date.now() } : note;
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      setLastDeleted(snapshot);
      if (selectedId === id) {
        setSelectedId(sortNotesByUpdated(remaining)[0]?.id ?? null);
      }
    },
    [editorDraft, notes, selectedId, setNotes, setSelectedId]
  );

  const undoLastDelete = useCallback(() => {
    if (!lastDeleted) return;
    const restored = lastDeleted;
    setLastDeleted(null);
    setNotes(prev => {
      if (prev.some(n => n.id === restored.id)) return prev;
      return [restored, ...prev];
    });
    setSelectedId(restored.id);
  }, [lastDeleted, setNotes, setSelectedId]);

  const dismissUndo = useCallback(() => {
    setLastDeleted(null);
  }, []);

  const openDeleteMenu = useCallback(() => {
    const initial = new Set<string>();
    if (selectedId) initial.add(selectedId);
    setDeleteIds(initial);
    setDeleteMenuOpen(true);
  }, [selectedId]);

  const toggleDeleteId = useCallback((id: string) => {
    setDeleteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirmMassDelete = useCallback(() => {
    if (deleteIds.size === 0) return;
    setNotes(prev => {
      // Persist the open draft onto the selected note before removing anything.
      const withDraft =
        selectedId && deleteIds.has(selectedId)
          ? prev.map(n =>
              n.id === selectedId && n.content !== editorDraft
                ? { ...n, content: editorDraft, updatedAt: Date.now() }
                : n
            )
          : prev;
      return withDraft.filter(n => !deleteIds.has(n.id));
    });
    if (selectedId && deleteIds.has(selectedId)) {
      setSelectedId(null);
    }
    setDeleteMenuOpen(false);
    setDeleteIds(new Set());
  }, [deleteIds, editorDraft, selectedId, setNotes, setSelectedId]);

  const sortedForDelete = useMemo(() => sortNotesByUpdated(notes), [notes]);

  const handlePopOut = useCallback(() => {
    if (!hoverNotesSupported) return;
    if (notes.length === 0) {
      const n = createSimpleNote();
      setNotes([n]);
      setSelectedId(n.id);
    } else if (!selectedId) {
      setSelectedId(sortNotesByUpdated(notes)[0]?.id ?? null);
    }
    void openHoverNotes();
  }, [hoverNotesSupported, notes, selectedId, setNotes, setSelectedId, openHoverNotes]);

  const sidebarBg = '#fff';
  const editorBg = '#fff';
  const accentSelect = '#eef2ff';
  const accentBorder = '#6366f1';
  const borderSub = '#e2e8f0';
  const borderLight = '#f1f5f9';
  const textPrimary = '#0f172a';
  const textSecondary = '#64748b';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        minHeight: 400,
        borderRadius: '0 0 10px 10px',
        overflow: 'hidden',
        fontFamily: font,
        borderTop: `1px solid ${borderSub}`,
        background: editorBg,
      }}
    >
      <div
        style={{
          width: 'min(100%, 300px)',
          minWidth: 260,
          flexShrink: 0,
          background: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${borderSub}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 10px',
            borderBottom: `1px solid ${borderSub}`,
          }}
        >
          <ToolbarBtn
            label="Delete"
            onClick={openDeleteMenu}
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
            disabled={notes.length === 0}
            theme="light"
          />
          <div style={{ flex: 1 }} />
          <ToolbarBtn
            label={
              hoverNotesSupported
                ? hoverNotesOpen
                  ? 'Dock notes'
                  : 'Pop out notes'
                : 'Pop out notes (Chrome only)'
            }
            onClick={() => (hoverNotesOpen ? void toggleHoverNotes() : handlePopOut())}
            icon="⧉"
            disabled={!hoverNotesSupported}
            active={hoverNotesOpen}
            theme="light"
          />
          <ToolbarBtn label="New note" onClick={addNote} icon="✎" primary theme="light" />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <div style={{ padding: 20, color: textSecondary, fontSize: 13 }}>No notes yet. Click ✎ to create one.</div>
          ) : (
            groups.map(g => (
              <div key={g.key}>
                <div
                  style={{
                    padding: '10px 14px 6px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: textSecondary,
                    letterSpacing: 0.2,
                  }}
                >
                  {g.label}
                </div>
                {g.items.map(note => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    selected={note.id === selectedId}
                    onSelect={() => setSelectedId(note.id)}
                    onDelete={() => deleteNote(note.id)}
                    accentSelect={accentSelect}
                    accentBorder={accentBorder}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, background: editorBg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 14px',
                borderBottom: `1px solid ${borderLight}`,
                color: textSecondary,
                fontSize: 11,
                background: '#fff',
              }}
            >
              <span>
                {new Date(selected.updatedAt).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              {hoverNotesSupported ? (
                <button
                  type="button"
                  onClick={() => (hoverNotesOpen ? void toggleHoverNotes() : handlePopOut())}
                  style={styles.popOutLink}
                >
                  {hoverNotesOpen ? 'Dock floating notes' : 'Pop out next to you'}
                </button>
              ) : null}
            </div>
            <div style={{ position: 'relative', flex: 1, display: 'flex', minHeight: 0 }}>
              <textarea
                ref={textareaRef}
                value={editorDraft}
                onChange={e => onDraftChange(e.target.value)}
                onFocus={onDraftFocus}
                onBlur={onDraftBlur}
                placeholder="Start typing…"
                {...clipHandlers}
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 280,
                  padding: 16,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  background: '#fff',
                  color: textPrimary,
                  fontFamily: font,
                  fontSize: 14,
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                  cursor: 'text',
                }}
              />
              {clipBubble}
            </div>
          </>
        ) : (
          <div style={{ padding: 24, color: textSecondary, fontSize: 14 }}>
            Select a note or create a new one.
          </div>
        )}
      </div>

      {lastDeleted ? (
        <div style={styles.undoBar} role="status">
          <span style={styles.undoText}>Note deleted</span>
          <button type="button" onClick={undoLastDelete} style={styles.undoBtn}>
            Undo
          </button>
          <button type="button" onClick={dismissUndo} style={styles.undoDismiss} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}

      {deleteMenuOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={styles.deleteBackdrop}
              onClick={e => e.target === e.currentTarget && setDeleteMenuOpen(false)}
              role="presentation"
            >
              <div style={styles.deletePanel} role="dialog" aria-modal="true" aria-labelledby="delete-notes-title">
                <h3 id="delete-notes-title" style={styles.deleteTitle}>
                  Delete notes
                </h3>
                <p style={styles.deleteHint}>Check the notes you want to remove.</p>
                <div style={styles.deleteList}>
                  {sortedForDelete.map(note => (
                    <label key={note.id} style={styles.deleteRow}>
                      <input
                        type="checkbox"
                        checked={deleteIds.has(note.id)}
                        onChange={() => toggleDeleteId(note.id)}
                        style={styles.deleteCheckbox}
                      />
                      <span style={styles.deleteRowBody}>
                        <span style={styles.deleteRowTitle}>{firstNoteLine(note.content)}</span>
                        <span style={styles.deleteRowMeta}>
                          {formatNoteTime(note.updatedAt)}
                          {noteBodyPreview(note.content) ? ` · ${noteBodyPreview(note.content)}` : ''}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div style={styles.deleteActions}>
                  <button type="button" onClick={() => setDeleteMenuOpen(false)} style={styles.deleteCancelBtn}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmMassDelete}
                    disabled={deleteIds.size === 0}
                    style={{
                      ...styles.deleteConfirmBtn,
                      ...(deleteIds.size === 0 ? styles.deleteConfirmBtnDisabled : {}),
                    }}
                  >
                    Delete{deleteIds.size > 0 ? ` (${deleteIds.size})` : ''}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  undoBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#0f172a',
    color: '#fff',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.28)',
    fontFamily: font,
  },
  undoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: 500,
  },
  undoBtn: {
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: font,
    background: '#fff',
    color: '#0f172a',
    cursor: 'pointer',
  },
  undoDismiss: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 2px',
  },
  popOutLink: {
    border: 'none',
    background: 'transparent',
    color: '#6366f1',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  deleteBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100003,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    boxSizing: 'border-box',
    fontFamily: font,
  },
  deletePanel: {
    width: 'min(100%, 400px)',
    maxHeight: 'min(70vh, 520px)',
    background: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  deleteTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  deleteHint: {
    margin: 0,
    fontSize: 12,
    color: '#64748b',
  },
  deleteList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '4px 0',
  },
  deleteRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
  },
  deleteCheckbox: {
    marginTop: 3,
    flexShrink: 0,
    cursor: 'pointer',
  },
  deleteRowBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  deleteRowTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  deleteRowMeta: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  deleteActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
  deleteCancelBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
  },
  deleteConfirmBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
};

function ToolbarBtn({
  icon,
  label,
  active,
  disabled,
  primary,
  theme = 'dark',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  primary?: boolean;
  theme?: 'dark' | 'light';
  onClick: () => void;
}) {
  const light = theme === 'light';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 34,
        height: 30,
        borderRadius: 6,
        border: light ? '1px solid #e2e8f0' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        background: active
          ? light
            ? '#eef2ff'
            : '#3a3a3c'
          : primary
            ? light
              ? '#6366f1'
              : '#48484a'
            : light
              ? '#fff'
              : 'transparent',
        color: primary && light ? '#fff' : light ? '#334155' : '#e8e8ed',
        fontSize: 14,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  );
}

function NoteRow({
  note,
  selected,
  onSelect,
  onDelete,
  accentSelect,
  accentBorder,
  textPrimary,
  textSecondary,
}: {
  note: SimpleNote;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  accentSelect: string;
  accentBorder: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const title = firstNoteLine(note.content);
  const preview = noteBodyPreview(note.content);
  const time = formatNoteTime(note.updatedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px 12px',
        marginBottom: 2,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        background: selected ? accentSelect : 'transparent',
        boxShadow: selected ? `inset 0 0 0 1px ${accentBorder}` : 'none',
        fontFamily: font,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: textPrimary,
          marginBottom: 4,
          lineHeight: 1.25,
          paddingRight: 22,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 11, color: textSecondary, marginBottom: 4, lineHeight: 1.35 }}>
        {preview ? `${time} · ${preview}` : time}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: textSecondary }}>
        <span style={{ opacity: 0.85 }} aria-hidden>
          📁
        </span>
        <span>Simple Notes</span>
      </div>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete note"
        aria-label="Delete note"
        style={{
          position: 'absolute',
          right: 6,
          bottom: 6,
          width: 20,
          height: 20,
          border: 'none',
          borderRadius: 4,
          background: 'transparent',
          color: '#64748b',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 11v6M14 11v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CaptureNote } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  DECISION_ICON,
  OPEN_LOOP_ICON,
  noteListLabel,
  noteTabIcon,
  orderedCaptureNotes,
  prependCaptureNote,
  reorderCaptureNotes,
} from './openLoopsUi';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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

function tabItemStyle(note: CaptureNote, selected: boolean, styledByKind: boolean): CSSProperties {
  if (!styledByKind) {
    return {
      ...styles.sidebarItem,
      ...(selected ? styles.sidebarItemActive : {}),
    };
  }

  if (note.kind === 'decision') {
    return {
      ...styles.sidebarItem,
      ...styles.sidebarItemDecision,
      ...(selected ? styles.sidebarItemDecisionActive : {}),
    };
  }

  return {
    ...styles.sidebarItem,
    ...styles.sidebarItemLoop,
    ...(selected ? styles.sidebarItemLoopActive : {}),
  };
}

export interface AddNoteAction {
  label: string;
  icon?: string;
  bodyTemplate?: string;
  kind?: CaptureNote['kind'];
}

export interface CaptureNotesPanelProps {
  storageKey: string;
  bodyTemplate: string;
  addLabel: string;
  addLabelIcon?: string;
  emptyMessage: string;
  bodyPrompt?: string;
  skipTitleLines?: string[];
  headerExtra?: ReactNode;
  extraAddActions?: AddNoteAction[];
  styledTabsByKind?: boolean;
  enableDragReorder?: boolean;
  renderEditorExtra?: (note: CaptureNote) => ReactNode;
}

function ToolbarIconButton({
  label,
  icon,
  onClick,
  variant,
}: {
  label: string;
  icon?: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={variant === 'primary' ? styles.addBtn : styles.secondaryAddBtn}
    >
      <span style={styles.btnContent}>
        {icon ? (
          <span style={styles.btnIcon} aria-hidden>
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </span>
    </button>
  );
}

export default function CaptureNotesPanel({
  storageKey,
  bodyTemplate,
  addLabel,
  addLabelIcon,
  emptyMessage,
  bodyPrompt,
  skipTitleLines = [],
  headerExtra,
  extraAddActions = [],
  styledTabsByKind = false,
  enableDragReorder = false,
  renderEditorExtra,
}: CaptureNotesPanelProps) {
  const [notes, setNotes] = useLocalStorage<CaptureNote[]>(storageKey, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dragMovedRef = useRef(false);

  const selected = notes.find(n => n.id === selectedId) ?? null;
  const sorted = orderedCaptureNotes(notes);

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
      setNotes(prev => prependCaptureNote(prev, note));
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

  const finishReorder = useCallback(
    (fromId: string, beforeId: string | null) => {
      setNotes(prev => reorderCaptureNotes(prev, fromId, beforeId));
      setDraggingId(null);
      setDropBeforeId(null);
      dragMovedRef.current = false;
    },
    [setNotes]
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
            <ToolbarIconButton
              key={action.label}
              label={action.label}
              icon={action.icon}
              variant="secondary"
              onClick={() => addNote(action)}
            />
          ))}
          <ToolbarIconButton
            label={addLabel}
            icon={addLabelIcon}
            variant="primary"
            onClick={() => addNote()}
          />
        </div>
      </div>

      <div style={styles.split}>
        <aside style={styles.sidebar}>
          {sorted.length === 0 ? (
            <div style={styles.sidebarEmpty}>{emptyMessage}</div>
          ) : (
            <div style={styles.sidebarList}>
              {sorted.map(note => {
                const isSelected = note.id === selectedId;
                const showDrop = draggingId && dropBeforeId === note.id && draggingId !== note.id;
                return (
                  <div key={note.id} style={styles.sidebarRow}>
                    {showDrop ? <div style={styles.dropIndicator} /> : null}
                    <button
                      type="button"
                      draggable={enableDragReorder}
                      onClick={() => {
                        if (dragMovedRef.current) {
                          dragMovedRef.current = false;
                          return;
                        }
                        setSelectedId(note.id);
                      }}
                      onDragStart={e => {
                        if (!enableDragReorder) return;
                        dragMovedRef.current = false;
                        setDraggingId(note.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', note.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropBeforeId(null);
                      }}
                      onDragOver={e => {
                        if (!enableDragReorder || !draggingId || draggingId === note.id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDropBeforeId(note.id);
                      }}
                      onDrop={e => {
                        if (!enableDragReorder || !draggingId) return;
                        e.preventDefault();
                        dragMovedRef.current = true;
                        finishReorder(draggingId, note.id);
                      }}
                      style={{
                        ...tabItemStyle(note, isSelected, styledTabsByKind),
                        ...(draggingId === note.id ? styles.sidebarItemDragging : {}),
                        ...(enableDragReorder ? { cursor: draggingId === note.id ? 'grabbing' : 'grab' } : {}),
                      }}
                      title={noteListLabel(note, skipTitleLines)}
                    >
                      <span style={styles.tabContent}>
                        <span style={styles.tabIcon} aria-hidden>
                          {noteTabIcon(note)}
                        </span>
                        <span style={styles.tabLabel}>{noteListLabel(note, skipTitleLines)}</span>
                      </span>
                    </button>
                  </div>
                );
              })}
              {draggingId && dropBeforeId === null ? <div style={styles.dropIndicator} /> : null}
              <div
                style={styles.sidebarDropEnd}
                onDragOver={e => {
                  if (!enableDragReorder || !draggingId) return;
                  e.preventDefault();
                  setDropBeforeId(null);
                }}
                onDrop={e => {
                  if (!enableDragReorder || !draggingId) return;
                  e.preventDefault();
                  dragMovedRef.current = true;
                  finishReorder(draggingId, null);
                }}
              />
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
    justifyContent: 'flex-end',
  },
  btnContent: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  btnIcon: {
    fontSize: 13,
    lineHeight: 1,
    flexShrink: 0,
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
    minHeight: 260,
  },
  sidebar: {
    width: 212,
    minWidth: 212,
    maxWidth: 212,
    flexShrink: 0,
    borderRight: '1px solid #e2e8f0',
    background: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  sidebarEmpty: {
    padding: 14,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.45,
    minHeight: 52,
  },
  sidebarList: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 52,
    maxHeight: 'min(320px, 42vh)',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sidebarRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sidebarDropEnd: {
    minHeight: 10,
    flexShrink: 0,
  },
  dropIndicator: {
    height: 2,
    borderRadius: 999,
    background: '#6366f1',
    margin: '0 2px',
  },
  sidebarItem: {
    width: '100%',
    textAlign: 'left',
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: 'transparent',
    fontSize: 12,
    fontWeight: 500,
    color: '#475569',
    cursor: 'pointer',
    fontFamily: font,
  },
  sidebarItemLoop: {
    background: '#1e293b',
    color: '#f8fafc',
    borderColor: '#334155',
  },
  sidebarItemLoopActive: {
    background: '#0f172a',
    borderColor: '#64748b',
    boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.35)',
  },
  sidebarItemDecision: {
    background: '#ffffff',
    color: '#0f172a',
    borderColor: '#e2e8f0',
  },
  sidebarItemDecisionActive: {
    background: '#f8fafc',
    borderColor: '#cbd5e1',
    boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.08)',
  },
  sidebarItemDragging: {
    opacity: 0.55,
    cursor: 'grabbing',
  },
  sidebarItemActive: {
    background: '#fff',
    borderColor: '#e2e8f0',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
  },
  tabContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    width: '100%',
  },
  tabIcon: {
    fontSize: 13,
    lineHeight: 1,
    flexShrink: 0,
    width: 14,
    textAlign: 'center',
  },
  tabLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  editorPane: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 260,
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

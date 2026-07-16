'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CaptureNote } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  DECISION_ICON,
  DECISIONS_SECTION_LABEL,
  OPEN_LOOP_ICON,
  OPEN_LOOPS_SECTION_LABEL,
  noteKind,
  noteListLabel,
  noteTabIcon,
  orderedNotesInSection,
  prependNoteInSection,
  reorderNotesInSection,
  type CaptureNoteKind,
} from './openLoopsUi';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function editorFields(note: CaptureNote, defaultBodyPrompt?: string) {
  if (note.kind === 'decision') {
    return {
      titleLabel: 'decision i need to make',
      titlePlaceholder: 'What do you need to decide?',
      bodyPrompt: 'relevant context — options, stakes, what\'s making this hard, etc.',
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

  const isDecision = note.kind === 'decision';
  return {
    ...styles.sidebarItemAccent,
    ...(isDecision ? styles.sidebarItemAccentDecision : styles.sidebarItemAccentLoop),
    ...(selected
      ? isDecision
        ? styles.sidebarItemAccentDecisionActive
        : styles.sidebarItemAccentLoopActive
      : {}),
  };
}

function accentBarStyle(sectionKind: CaptureNoteKind, selected: boolean): CSSProperties {
  const isDecision = sectionKind === 'decision';
  return {
    ...styles.accentBar,
    width: selected ? 3 : 1,
    background: isDecision
      ? selected
        ? '#8b7ec8'
        : '#c4b5fd'
      : selected
        ? '#64748b'
        : '#94a3b8',
    opacity: selected ? 1 : 0.65,
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
  toolbarSubtext?: ReactNode;
  extraAddActions?: AddNoteAction[];
  styledTabsByKind?: boolean;
  groupedTabsByKind?: boolean;
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
  toolbarSubtext,
  extraAddActions = [],
  styledTabsByKind = false,
  groupedTabsByKind = false,
  enableDragReorder = false,
  renderEditorExtra,
}: CaptureNotesPanelProps) {
  const [notes, setNotes] = useLocalStorage<CaptureNote[]>(storageKey, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ beforeId: string | null; kind: CaptureNoteKind } | null>(
    null
  );
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dragMovedRef = useRef(false);

  const selected = notes.find(n => n.id === selectedId) ?? null;
  const loopNotes = orderedNotesInSection(notes, 'open_loop');
  const decisionNotes = orderedNotesInSection(notes, 'decision');
  const sorted = [...loopNotes, ...decisionNotes];

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
      setNotes(prev => prependNoteInSection(prev, note));
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
    (fromId: string, beforeId: string | null, kind: CaptureNoteKind) => {
      setNotes(prev => reorderNotesInSection(prev, fromId, beforeId, kind));
      setDraggingId(null);
      setDropTarget(null);
      dragMovedRef.current = false;
    },
    [setNotes]
  );

  const draggingNote = draggingId ? notes.find(n => n.id === draggingId) : null;
  const draggingKind = draggingNote ? noteKind(draggingNote) : null;

  const renderNoteRow = (note: CaptureNote, sectionKind: CaptureNoteKind) => {
    const isSelected = note.id === selectedId;
    const canDropHere =
      draggingId &&
      draggingKind === sectionKind &&
      dropTarget?.kind === sectionKind &&
      dropTarget.beforeId === note.id &&
      draggingId !== note.id;

    return (
      <div key={note.id} style={styles.sidebarRow}>
        {canDropHere ? <div style={styles.dropIndicator} /> : null}
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
            setDropTarget(null);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', note.id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDropTarget(null);
          }}
          onDragOver={e => {
            if (!enableDragReorder || !draggingId || draggingId === note.id) return;
            if (draggingKind !== sectionKind || noteKind(note) !== sectionKind) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget({ beforeId: note.id, kind: sectionKind });
          }}
          onDrop={e => {
            if (!enableDragReorder || !draggingId || draggingKind !== sectionKind) return;
            e.preventDefault();
            dragMovedRef.current = true;
            finishReorder(draggingId, note.id, sectionKind);
          }}
          style={{
            ...tabItemStyle(note, isSelected, styledTabsByKind),
            ...(draggingId === note.id ? styles.sidebarItemDragging : {}),
            ...(enableDragReorder ? { cursor: draggingId === note.id ? 'grabbing' : 'grab' } : {}),
          }}
          title={noteListLabel(note, skipTitleLines)}
        >
          {styledTabsByKind ? <span style={accentBarStyle(sectionKind, isSelected)} aria-hidden /> : null}
          <span style={styles.tabContent}>
            <span
              style={{
                ...styles.tabIcon,
                ...(styledTabsByKind ? styles.tabIconAccent : {}),
              }}
              aria-hidden
            >
              {noteTabIcon(note)}
            </span>
            <span style={styles.tabLabel}>{noteListLabel(note, skipTitleLines)}</span>
          </span>
        </button>
      </div>
    );
  };

  const renderSectionEndDrop = (sectionKind: CaptureNoteKind) => {
    const showDrop =
      draggingId &&
      draggingKind === sectionKind &&
      dropTarget?.kind === sectionKind &&
      dropTarget.beforeId === null;

    return (
      <>
        {showDrop ? <div style={styles.dropIndicator} /> : null}
        <div
          style={styles.sidebarDropEnd}
          onDragOver={e => {
            if (!enableDragReorder || !draggingId || draggingKind !== sectionKind) return;
            e.preventDefault();
            setDropTarget({ beforeId: null, kind: sectionKind });
          }}
          onDrop={e => {
            if (!enableDragReorder || !draggingId || draggingKind !== sectionKind) return;
            e.preventDefault();
            dragMovedRef.current = true;
            finishReorder(draggingId, null, sectionKind);
          }}
        />
      </>
    );
  };

  const renderGroupedSidebar = () => (
    <div style={styles.sidebarList}>
      <div style={styles.sidebarSection}>
        <div
          style={{
            ...styles.sectionLabel,
            ...(styledTabsByKind ? styles.sectionLabelAccent : {}),
          }}
        >
          {styledTabsByKind ? OPEN_LOOPS_SECTION_LABEL.toUpperCase() : OPEN_LOOPS_SECTION_LABEL}
        </div>
        {loopNotes.length === 0 ? (
          <div style={styles.sectionEmpty}>None yet</div>
        ) : (
          loopNotes.map(note => renderNoteRow(note, 'open_loop'))
        )}
        {renderSectionEndDrop('open_loop')}
      </div>
      <div style={styles.sectionDivider} />
      <div style={styles.sidebarSection}>
        <div
          style={{
            ...styles.sectionLabel,
            ...(styledTabsByKind ? styles.sectionLabelAccent : {}),
          }}
        >
          {styledTabsByKind ? DECISIONS_SECTION_LABEL.toUpperCase() : DECISIONS_SECTION_LABEL}
        </div>
        {decisionNotes.length === 0 ? (
          <div style={styles.sectionEmpty}>None yet</div>
        ) : (
          decisionNotes.map(note => renderNoteRow(note, 'decision'))
        )}
        {renderSectionEndDrop('decision')}
      </div>
    </div>
  );

  const renderFlatSidebar = () => (
    <div style={styles.sidebarList}>
      {sorted.map(note => renderNoteRow(note, noteKind(note)))}
      {draggingKind ? renderSectionEndDrop(draggingKind) : null}
    </div>
  );

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <span style={styles.count}>
          {notes.length === 0 ? 'None yet' : `${notes.length} saved`}
        </span>
        <div style={styles.toolbarRight}>
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
          {toolbarSubtext ? <div style={styles.toolbarSubtext}>{toolbarSubtext}</div> : null}
        </div>
      </div>

      <div style={styles.split}>
        <aside style={styles.sidebar}>
          {groupedTabsByKind
            ? renderGroupedSidebar()
            : sorted.length === 0
              ? (
                <div style={styles.sidebarEmpty}>{emptyMessage}</div>
              )
              : (
                renderFlatSidebar()
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
  toolbarRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 0,
  },
  toolbarSubtext: {
    fontSize: 10,
    lineHeight: 1.35,
    color: '#94a3b8',
    textAlign: 'right',
    maxWidth: 280,
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
    background: '#eceef1',
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
    gap: 8,
  },
  sidebarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'lowercase',
    color: '#64748b',
    padding: '2px 4px 0',
  },
  sectionLabelAccent: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#6b7280',
    padding: '4px 6px 2px',
  },
  sectionDivider: {
    height: 1,
    background: '#e2e8f0',
    margin: '2px 4px',
  },
  sectionEmpty: {
    fontSize: 11,
    color: '#94a3b8',
    padding: '4px 6px 2px',
    fontStyle: 'italic',
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
  sidebarItemAccent: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    padding: '5px 8px 5px 0',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    fontSize: 11,
    fontWeight: 500,
    color: '#3d4451',
    cursor: 'pointer',
    fontFamily: font,
    gap: 0,
  },
  sidebarItemAccentLoop: {},
  sidebarItemAccentLoopActive: {
    background: 'rgba(100, 116, 139, 0.14)',
  },
  sidebarItemAccentDecision: {},
  sidebarItemAccentDecisionActive: {
    background: 'rgba(139, 126, 200, 0.16)',
  },
  accentBar: {
    alignSelf: 'stretch',
    borderRadius: 999,
    flexShrink: 0,
    marginRight: 8,
    minHeight: 18,
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
  tabIconAccent: {
    fontSize: 11,
    width: 12,
    color: '#64748b',
    opacity: 0.85,
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

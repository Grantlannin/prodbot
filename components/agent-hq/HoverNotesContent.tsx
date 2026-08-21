'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  SIMPLE_NOTES_KEY,
  SIMPLE_NOTES_SELECTED_KEY,
  createSimpleNote,
  DEFAULT_HOVER_NOTES_SIZE,
  firstNoteLine,
  HOVER_NOTES_SIZE_KEY,
  sortNotesByUpdated,
} from './simpleNotesUtils';
import { CornerResizeHandles, useCornerResize } from './hooks/useCornerResize';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useNoteTextDraft } from './hooks/useNoteTextDraft';
import { useProjects } from './hooks/ProjectsProvider';
import { useNoteClipBubble } from './NoteSelectionClipBubble';
import type { SimpleNote } from './types';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface HoverNotesContentProps {
  pipWindow: Window;
}

export default function HoverNotesContent({ pipWindow }: HoverNotesContentProps) {
  const { projects, setProjects } = useProjects();
  const [notes, setNotes] = useLocalStorage<SimpleNote[]>(SIMPLE_NOTES_KEY, []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>(SIMPLE_NOTES_SELECTED_KEY, null);
  const [size, setSize] = useLocalStorage(HOVER_NOTES_SIZE_KEY, DEFAULT_HOVER_NOTES_SIZE);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sorted = useMemo(() => sortNotesByUpdated(notes), [notes]);
  const selected = useMemo(
    () => notes.find(n => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const applyWindowSize = useCallback(
    (next: { w: number; h: number }) => {
      try {
        pipWindow.resizeTo(Math.round(next.w), Math.round(next.h));
      } catch {
        /* resizeTo may be blocked */
      }
    },
    [pipWindow]
  );

  const ensureWindowHeight = useCallback(
    (minInnerHeight: number) => {
      const nextH = Math.min(900, Math.max(size.h, Math.ceil(minInnerHeight)));
      if (nextH <= size.h + 1) return;
      const next = { w: size.w, h: nextH };
      setSize(next);
      applyWindowSize(next);
    },
    [applyWindowSize, setSize, size.h, size.w]
  );

  const { onResizeStart } = useCornerResize({
    size,
    onSizeChange: next => {
      setSize(next);
      applyWindowSize(next);
    },
    minW: 280,
    maxW: 720,
    minH: 280,
    maxH: 900,
    targetWindow: pipWindow,
  });

  useEffect(() => {
    applyWindowSize(size);
  }, [applyWindowSize, size]);

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
    portalDocument: pipWindow.document,
    onEnsureWindowHeight: ensureWindowHeight,
  });

  useEffect(() => {
    if (notes.length === 0) return;
    if (!selectedId || !notes.some(n => n.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? null);
    }
  }, [notes, selectedId, sorted, setSelectedId]);

  const addNote = useCallback(() => {
    const n = createSimpleNote();
    setNotes(prev => [n, ...prev]);
    setSelectedId(n.id);
  }, [setNotes, setSelectedId]);

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerTitle}>Simple Notes</span>
          {selected ? (
            <span style={styles.headerSubtitle}>{firstNoteLine(editorDraft)}</span>
          ) : null}
        </div>
        <div style={styles.headerActions}>
          <button type="button" onClick={addNote} style={styles.iconBtn} title="New note" aria-label="New note">
            ✎
          </button>
        </div>
      </header>

      {sorted.length > 1 ? (
        <div style={styles.pickerRow}>
          <select
            value={selectedId ?? ''}
            onChange={e => setSelectedId(e.target.value || null)}
            style={styles.select}
          >
            {sorted.map(note => (
              <option key={note.id} value={note.id}>
                {firstNoteLine(note.id === selectedId ? editorDraft : note.content)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div style={styles.editorWrap}>
        {selected ? (
          <>
            <textarea
              ref={textareaRef}
              value={editorDraft}
              onChange={e => onDraftChange(e.target.value)}
              onFocus={onDraftFocus}
              onBlur={onDraftBlur}
              placeholder="Start typing…"
              {...clipHandlers}
              style={styles.textarea}
              autoFocus
            />
            {clipBubble}
          </>
        ) : (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No notes yet.</p>
            <button type="button" onClick={addNote} style={styles.primaryBtn}>
              Create note
            </button>
          </div>
        )}
      </div>

      <CornerResizeHandles onResizeStart={onResizeStart} />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: font,
    background: '#fff',
    color: '#0f172a',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  headerActions: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    width: 28,
    height: 28,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#475569',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerRow: {
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    flexShrink: 0,
  },
  select: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
  },
  editorWrap: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    flex: 1,
    width: '100%',
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: 14,
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: font,
    color: '#0f172a',
    background: '#fff',
    cursor: 'text',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    background: '#0f172a',
    color: '#fff',
    cursor: 'pointer',
  },
};

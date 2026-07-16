'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  APPLE_NOTES_KEY,
  APPLE_NOTES_SELECTED_KEY,
  createAppleNote,
  DEFAULT_HOVER_NOTES_SIZE,
  firstNoteLine,
  HOVER_NOTES_SIZE_KEY,
  sortNotesByUpdated,
} from './appleNotesUtils';
import { CornerResizeHandles, useCornerResize } from './hooks/useCornerResize';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useNoteClipBubble } from './NoteSelectionClipBubble';
import type { AppleNote } from './types';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

interface HoverNotesContentProps {
  pipWindow: Window;
}

export default function HoverNotesContent({ pipWindow }: HoverNotesContentProps) {
  const [notes, setNotes] = useLocalStorage<AppleNote[]>(APPLE_NOTES_KEY, []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>(APPLE_NOTES_SELECTED_KEY, null);
  const [size, setSize] = useLocalStorage(HOVER_NOTES_SIZE_KEY, DEFAULT_HOVER_NOTES_SIZE);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sorted = useMemo(() => sortNotesByUpdated(notes), [notes]);
  const selected = useMemo(
    () => notes.find(n => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const clipSourceLabel = useMemo(() => {
    if (!selected) return 'note';
    const title = firstNoteLine(selected.content);
    const when = new Date(selected.updatedAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    return `note · ${title} · ${when}`;
  }, [selected]);

  const { textareaHandlers: clipHandlers, bubbleNode: clipBubble } = useNoteClipBubble({
    textareaRef,
    noteText: selected?.content ?? '',
    sourceLabel: clipSourceLabel,
    portalDocument: pipWindow.document,
  });

  useEffect(() => {
    if (notes.length === 0) return;
    if (!selectedId || !notes.some(n => n.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? null);
    }
  }, [notes, selectedId, sorted, setSelectedId]);

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

  const { onResizeStart } = useCornerResize({
    size,
    onSizeChange: next => {
      setSize(next);
      applyWindowSize(next);
    },
    minW: 280,
    maxW: 720,
    minH: 280,
    maxH: 720,
  });

  useEffect(() => {
    applyWindowSize(size);
  }, [applyWindowSize, size]);

  const updateContent = useCallback(
    (content: string) => {
      if (!selectedId) return;
      const now = Date.now();
      setNotes(prev =>
        prev.map(n => (n.id === selectedId ? { ...n, content, updatedAt: now } : n))
      );
    },
    [selectedId, setNotes]
  );

  const addNote = useCallback(() => {
    const n = createAppleNote();
    setNotes(prev => [n, ...prev]);
    setSelectedId(n.id);
  }, [setNotes, setSelectedId]);

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerTitle}>Notes</span>
          {selected ? (
            <span style={styles.headerSubtitle}>{firstNoteLine(selected.content)}</span>
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
                {firstNoteLine(note.content)}
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
              value={selected.content}
              onChange={e => updateContent(e.target.value)}
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

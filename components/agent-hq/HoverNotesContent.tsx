'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  APPLE_NOTES_KEY,
  APPLE_NOTES_SELECTED_KEY,
  createAppleNote,
  DEFAULT_HOVER_NOTES_SIZE,
  firstNoteLine,
  HOVER_NOTES_BOUNDS_KEY,
  HOVER_NOTES_MINIMIZED_SIZE,
  HOVER_NOTES_SIZE_KEY,
  sortNotesByUpdated,
  type HoverNotesBounds,
} from './appleNotesUtils';
import { CornerResizeHandles, useCornerResize } from './hooks/useCornerResize';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { AppleNote } from './types';

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function DiagonalCollapseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 11.5 L11.5 2.5" />
      <path d="M9 2.5 H11.5 V5" />
      <path d="M11.5 11.5 L2.5 2.5" />
      <path d="M5 11.5 H2.5 V9" />
    </svg>
  );
}

interface HoverNotesContentProps {
  pipWindow: Window;
}

function readWindowBounds(win: Window): HoverNotesBounds {
  return {
    x: win.screenX,
    y: win.screenY,
    w: win.outerWidth,
    h: win.outerHeight,
  };
}

function minimizedCornerPosition(win: Window, w: number, h: number): { x: number; y: number } {
  const margin = 20;
  const dockPadding = 72;
  const x = Math.max(margin, win.screen.availWidth - w - margin);
  const y = Math.max(margin, win.screen.availHeight - h - dockPadding);
  return { x, y };
}

export default function HoverNotesContent({ pipWindow }: HoverNotesContentProps) {
  const [notes, setNotes] = useLocalStorage<AppleNote[]>(APPLE_NOTES_KEY, []);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>(APPLE_NOTES_SELECTED_KEY, null);
  const [size, setSize] = useLocalStorage(HOVER_NOTES_SIZE_KEY, DEFAULT_HOVER_NOTES_SIZE);
  const [expandedBounds, setExpandedBounds] = useLocalStorage<HoverNotesBounds | null>(
    HOVER_NOTES_BOUNDS_KEY,
    null
  );
  const [minimized, setMinimized] = useState(false);

  const sorted = useMemo(() => sortNotesByUpdated(notes), [notes]);
  const selected = useMemo(
    () => notes.find(n => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  useEffect(() => {
    if (notes.length === 0) return;
    if (!selectedId || !notes.some(n => n.id === selectedId)) {
      setSelectedId(sorted[0]?.id ?? null);
    }
  }, [notes, selectedId, sorted, setSelectedId]);

  const applyWindowBounds = useCallback(
    (bounds: { w: number; h: number; x?: number; y?: number }) => {
      try {
        pipWindow.resizeTo(Math.round(bounds.w), Math.round(bounds.h));
        if (bounds.x != null && bounds.y != null) {
          pipWindow.moveTo(Math.round(bounds.x), Math.round(bounds.y));
        }
      } catch {
        /* moveTo/resizeTo may be blocked */
      }
    },
    [pipWindow]
  );

  const { onResizeStart } = useCornerResize({
    size,
    onSizeChange: next => {
      setSize(next);
      if (!minimized) applyWindowBounds(next);
    },
    minW: 280,
    maxW: 720,
    minH: 280,
    maxH: 720,
  });

  useEffect(() => {
    if (minimized) return;
    if (expandedBounds) {
      applyWindowBounds(expandedBounds);
      return;
    }
    applyWindowBounds(size);
  }, [applyWindowBounds, expandedBounds, minimized, size]);

  const minimize = useCallback(() => {
    const bounds = readWindowBounds(pipWindow);
    setExpandedBounds(bounds);
    setSize({ w: bounds.w, h: bounds.h });
    const corner = minimizedCornerPosition(pipWindow, HOVER_NOTES_MINIMIZED_SIZE.w, HOVER_NOTES_MINIMIZED_SIZE.h);
    applyWindowBounds({
      w: HOVER_NOTES_MINIMIZED_SIZE.w,
      h: HOVER_NOTES_MINIMIZED_SIZE.h,
      x: corner.x,
      y: corner.y,
    });
    setMinimized(true);
  }, [applyWindowBounds, pipWindow, setExpandedBounds, setSize]);

  const expand = useCallback(() => {
    const restore = expandedBounds ?? {
      ...readWindowBounds(pipWindow),
      w: size.w,
      h: size.h,
    };
    setExpandedBounds(restore);
    setSize({ w: restore.w, h: restore.h });
    applyWindowBounds(restore);
    setMinimized(false);
  }, [applyWindowBounds, expandedBounds, pipWindow, setExpandedBounds, setSize, size.h, size.w]);

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

  const preview = selected ? firstNoteLine(selected.content) : 'New Note';

  if (minimized) {
    return (
      <div style={styles.minimizedShell}>
        <button type="button" onClick={expand} style={styles.minimizedMain} aria-label="Expand notes">
          <div style={styles.minimizedText}>
            <span style={styles.minimizedTitle}>Notes</span>
            <span style={styles.minimizedPreview}>&quot;{preview}&quot;</span>
          </div>
        </button>
        <div style={styles.minimizedActions}>
          <button type="button" onClick={expand} style={styles.iconBtn} title="Expand" aria-label="Expand">
            <DiagonalCollapseIcon />
          </button>
          <button type="button" onClick={expand} style={styles.iconBtn} title="Edit" aria-label="Edit note">
            ✎
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerTitle}>Notes</span>
          {selected ? <span style={styles.headerSubtitle}>{preview}</span> : null}
        </div>
        <div style={styles.headerActions}>
          <button type="button" onClick={minimize} style={styles.iconBtn} title="Collapse" aria-label="Collapse">
            <DiagonalCollapseIcon />
          </button>
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
          <textarea
            value={selected.content}
            onChange={e => updateContent(e.target.value)}
            placeholder="Start typing…"
            style={styles.textarea}
            autoFocus
          />
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
  minimizedShell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: '100vh',
    padding: '12px 14px',
    boxSizing: 'border-box',
    background: '#fff',
    fontFamily: font,
  },
  minimizedMain: {
    flex: 1,
    minWidth: 0,
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: font,
  },
  minimizedActions: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  minimizedText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  minimizedTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
  },
  minimizedPreview: {
    fontSize: 12,
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
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

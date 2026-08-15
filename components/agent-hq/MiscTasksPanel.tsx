'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  TODAY_LINE_DRAG_TYPE,
  TODAY_TASK_LIST_KEY,
  dataTransferHasType,
  emptyTodayTaskList,
  makeTodayLineId,
  normalizeTodayTaskList,
  type TodayTaskLine,
  type TodayTaskListStore,
} from './todayTaskList/storage';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const TODAY_VISIBLE_ROWS = 5;
const TODAY_ROW_HEIGHT_PX = 28;
const TODAY_ROW_GAP_PX = 2;
const TODAY_LIST_MAX_HEIGHT =
  TODAY_VISIBLE_ROWS * TODAY_ROW_HEIGHT_PX + (TODAY_VISIBLE_ROWS - 1) * TODAY_ROW_GAP_PX;

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: 'block' }}>
      <path
        d="M9 14L4 9l5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h10a6 6 0 0 1 0 12h-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function autosizeTodayLine(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const container = el.closest('[data-misc-scroll]') as HTMLElement | null;
  const savedScrollTop = container?.scrollTop ?? 0;
  const prev = el.style.height;
  el.style.height = '0px';
  const next = `${Math.max(20, el.scrollHeight)}px`;
  el.style.height = next;
  if (container) container.scrollTop = savedScrollTop;
  if (prev === next) return;
}

interface MiscTasksPanelProps {
  onStartLine?: (line: TodayTaskLine) => void;
  sessionBusy?: boolean;
  onClose?: () => void;
}

export default function MiscTasksPanel({
  onStartLine,
  sessionBusy = false,
  onClose,
}: MiscTasksPanelProps) {
  const [todayStore, setTodayStore] = useLocalStorage<TodayTaskListStore>(
    TODAY_TASK_LIST_KEY,
    emptyTodayTaskList()
  );
  const [focusLineId, setFocusLineId] = useState<string | null>(null);
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [dropLineId, setDropLineId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<'before' | 'after'>('before');
  const [undoStack, setUndoStack] = useState<{ lines: TodayTaskLine[] }[]>([]);
  const lineInputRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const todayLinesRef = useRef<HTMLDivElement | null>(null);
  const emptyDraftIdRef = useRef(makeTodayLineId());
  const scrollTopRef = useRef(0);

  const today = useMemo(() => normalizeTodayTaskList(todayStore), [todayStore]);

  useEffect(() => {
    const rolled = normalizeTodayTaskList(todayStore);
    if (rolled.dateKey !== todayStore.dateKey) setTodayStore(rolled);
  }, [todayStore, setTodayStore]);

  const editorLines = useMemo(() => {
    if (today.lines.length === 0) {
      return [{ id: emptyDraftIdRef.current, text: '', createdAt: 0 }];
    }
    return today.lines;
  }, [today.lines]);

  const commitLines = (lines: TodayTaskLine[]) => {
    setTodayStore(prev => {
      const normalized = normalizeTodayTaskList(prev);
      return { ...normalized, lines, updatedAt: Date.now() };
    });
  };

  const pushUndoSnapshot = () => {
    setUndoStack(prev => [...prev.slice(-49), { lines: today.lines.map(line => ({ ...line })) }]);
  };

  const updateLineText = (lineId: string, text: string) => {
    if (today.lines.length === 0) {
      commitLines([{ id: emptyDraftIdRef.current, text, createdAt: Date.now() }]);
      return;
    }
    commitLines(editorLines.map(line => (line.id === lineId ? { ...line, text } : line)));
  };

  const removeTodayLine = (lineId: string) => {
    if (today.lines.length === 0) return;
    const savedScrollTop = todayLinesRef.current?.scrollTop ?? 0;
    pushUndoSnapshot();
    commitLines(editorLines.filter(l => l.id !== lineId));
    requestAnimationFrame(() => {
      if (todayLinesRef.current) todayLinesRef.current.scrollTop = savedScrollTop;
    });
  };

  const undoLastChange = () => {
    if (undoStack.length === 0) return;
    const savedScrollTop = todayLinesRef.current?.scrollTop ?? 0;
    const snap = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setTodayStore(prev => {
      const normalized = normalizeTodayTaskList(prev);
      return {
        ...normalized,
        lines: snap.lines.map(line => ({ ...line })),
        updatedAt: Date.now(),
      };
    });
    requestAnimationFrame(() => {
      if (todayLinesRef.current) todayLinesRef.current.scrollTop = savedScrollTop;
    });
  };

  const scrollTodayLineIntoView = useCallback((lineId: string) => {
    const container = todayLinesRef.current;
    const input = lineInputRefs.current.get(lineId);
    if (!container || !input) return;
    const row = input.closest('[data-misc-row]') as HTMLElement | null;
    if (!row) return;
    const cRect = container.getBoundingClientRect();
    const rRect = row.getBoundingClientRect();
    // Only nudge the list scroller — never the page.
    if (rRect.bottom > cRect.bottom + 1) {
      container.scrollTop += rRect.bottom - cRect.bottom;
    } else if (rRect.top < cRect.top - 1) {
      container.scrollTop += rRect.top - cRect.top;
    }
  }, []);

  useEffect(() => {
    if (!focusLineId) return;
    const id = focusLineId;
    const handle = window.requestAnimationFrame(() => {
      const input = lineInputRefs.current.get(id);
      if (!input) return;
      const container = todayLinesRef.current;
      const savedScrollTop = container?.scrollTop ?? 0;
      input.focus({ preventScroll: true });
      const len = input.value.length;
      input.setSelectionRange(len, len);
      autosizeTodayLine(input);
      if (container) container.scrollTop = savedScrollTop;
      scrollTodayLineIntoView(id);
    });
    setFocusLineId(null);
    return () => window.cancelAnimationFrame(handle);
  }, [focusLineId, scrollTodayLineIntoView]);

  const handleLineKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, lineId: string) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault();
      undoLastChange();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = e.currentTarget.value;
      const caret = e.currentTarget.selectionStart ?? value.length;
      const before = value.slice(0, caret);
      const after = value.slice(caret);
      const newId = makeTodayLineId();
      pushUndoSnapshot();
      if (today.lines.length === 0) {
        commitLines([
          { id: emptyDraftIdRef.current, text: before, createdAt: Date.now() },
          { id: newId, text: after, createdAt: Date.now() },
        ]);
        setFocusLineId(newId);
        return;
      }
      const next = [...editorLines];
      const idx = next.findIndex(line => line.id === lineId);
      if (idx < 0) return;
      next[idx] = { ...next[idx], text: before };
      next.splice(idx + 1, 0, { id: newId, text: after, createdAt: Date.now() });
      commitLines(next);
      setFocusLineId(newId);
      return;
    }

    if (e.key === 'Backspace' && e.currentTarget.value === '' && today.lines.length > 0) {
      e.preventDefault();
      removeTodayLine(lineId);
    }
  };

  const clearTodayLineDrag = () => {
    setDraggingLineId(null);
    setDropLineId(null);
    setDropEdge('before');
  };

  const reorderTodayLine = (fromId: string, toId: string, edge: 'before' | 'after') => {
    if (today.lines.length === 0) return;
    const content = [...editorLines];
    const fromIndex = content.findIndex(line => line.id === fromId);
    const toIndex = content.findIndex(line => line.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    let insertIndex = edge === 'after' ? toIndex + 1 : toIndex;
    const next = [...content];
    const [removed] = next.splice(fromIndex, 1);
    if (fromIndex < insertIndex) insertIndex -= 1;
    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > next.length) insertIndex = next.length;
    next.splice(insertIndex, 0, removed);
    pushUndoSnapshot();
    commitLines(next);
  };

  const handleTodayDragStart = (line: TodayTaskLine) => (e: DragEvent) => {
    const text = line.text.trim();
    if (!text) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(TODAY_LINE_DRAG_TYPE, JSON.stringify({ id: line.id, text }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingLineId(line.id);
  };

  const handleTodayRowDragOver = (lineId: string) => (e: DragEvent) => {
    if (!dataTransferHasType(e.dataTransfer.types, TODAY_LINE_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const edge: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropLineId(lineId);
    setDropEdge(edge);
  };

  const handleTodayRowDragLeave = (lineId: string) => (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDropLineId(prev => (prev === lineId ? null : prev));
  };

  const handleTodayRowDrop = (lineId: string) => (e: DragEvent) => {
    if (!dataTransferHasType(e.dataTransfer.types, TODAY_LINE_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData(TODAY_LINE_DRAG_TYPE);
    try {
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed?.id && parsed.id !== lineId) {
        reorderTodayLine(parsed.id, lineId, dropEdge);
      }
    } catch {
      /* ignore */
    }
    clearTodayLineDrag();
  };

  return (
    <div style={styles.root}>
      <style>{`
        [data-misc-row] [data-misc-delete] {
          opacity: 0;
          pointer-events: none;
        }
        [data-misc-row]:hover [data-misc-delete],
        [data-misc-row]:focus-within [data-misc-delete] {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      <div style={styles.header}>
        <div style={styles.headerText}>
          <div style={styles.title}>Misc tasks</div>
          <p style={styles.hint}>Homeless tasks — tracked, but skipped in wind-down notes.</p>
        </div>
        <div style={styles.headerActions}>
          {undoStack.length > 0 ? (
            <button
              type="button"
              onClick={undoLastChange}
              style={styles.iconBtn}
              aria-label="Undo"
              title={undoStack.length > 1 ? `Undo (${undoStack.length})` : 'Undo (⌘Z)'}
            >
              <UndoIcon />
            </button>
          ) : null}
          {onClose ? (
            <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="Close misc tasks" title="Close">
              ×
            </button>
          ) : null}
        </div>
      </div>
      <div
        ref={todayLinesRef}
        data-misc-scroll=""
        style={styles.todayLines}
        onScroll={e => {
          scrollTopRef.current = e.currentTarget.scrollTop;
        }}
      >
        {editorLines.map((line, index) => {
          const canDrag = line.text.trim().length > 0;
          const canStart = canDrag && !!onStartLine;
          const isDragging = draggingLineId === line.id;
          const showLine =
            dropLineId === line.id && draggingLineId != null && draggingLineId !== line.id;
          return (
            <div
              key={line.id}
              data-misc-row=""
              style={{
                ...styles.todayRow,
                ...(isDragging ? styles.todayRowDragging : {}),
              }}
              onDragOver={handleTodayRowDragOver(line.id)}
              onDragLeave={handleTodayRowDragLeave(line.id)}
              onDrop={handleTodayRowDrop(line.id)}
            >
              {showLine && dropEdge === 'before' ? <div style={styles.dropLine} /> : null}
              <span
                draggable={canDrag}
                onDragStart={canDrag ? handleTodayDragStart(line) : undefined}
                onDragEnd={clearTodayLineDrag}
                style={{
                  ...styles.todayBullet,
                  ...(canDrag ? styles.todayDragHandle : {}),
                }}
                title={canDrag ? 'Drag to reorder' : undefined}
                aria-hidden
              >
                {canDrag ? '⠿' : '·'}
              </span>
              <textarea
                ref={el => {
                  if (!el) {
                    lineInputRefs.current.delete(line.id);
                    return;
                  }
                  const wasMissing = !lineInputRefs.current.has(line.id);
                  lineInputRefs.current.set(line.id, el);
                  // Only autosize on first mount — onChange handles live resize.
                  if (wasMissing) autosizeTodayLine(el);
                }}
                value={line.text}
                placeholder={index === 0 ? 'quick misc task…' : ''}
                rows={1}
                onChange={e => {
                  const el = e.currentTarget;
                  const container = todayLinesRef.current;
                  const savedScrollTop = container?.scrollTop ?? scrollTopRef.current;
                  updateLineText(line.id, e.target.value);
                  autosizeTodayLine(el);
                  if (container) {
                    container.scrollTop = savedScrollTop;
                    scrollTopRef.current = savedScrollTop;
                  }
                }}
                onKeyDown={e => handleLineKeyDown(e, line.id)}
                style={styles.todayInput}
                aria-label={`Misc task ${index + 1}`}
              />
              {line.text.trim() ? (
                <div style={styles.todayActions}>
                  <button
                    type="button"
                    data-misc-delete=""
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => removeTodayLine(line.id)}
                    style={styles.todayDeleteBtn}
                    aria-label={`Delete ${line.text.trim()}`}
                    title="Delete"
                    tabIndex={-1}
                  >
                    ×
                  </button>
                  {canStart ? (
                    <button
                      type="button"
                      onClick={() => onStartLine?.(line)}
                      disabled={sessionBusy}
                      style={{
                        ...styles.startBtn,
                        ...(sessionBusy ? styles.startBtnDisabled : {}),
                      }}
                      aria-label={`Start ${line.text.trim()}`}
                      title={sessionBusy ? 'Stop your current session first' : `Start ${line.text.trim()}`}
                    >
                      (start)
                    </button>
                  ) : null}
                </div>
              ) : null}
              {showLine && dropEdge === 'after' ? <div style={styles.dropLineAfter} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    fontFamily: font,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0,
  },
  headerText: {
    minWidth: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
    minWidth: 0,
  },
  headerActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    marginTop: 1,
  },
  iconBtn: {
    width: 22,
    height: 22,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  hint: {
    margin: 0,
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 1.35,
  },
  todayLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: TODAY_ROW_GAP_PX,
    maxHeight: TODAY_LIST_MAX_HEIGHT,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
    flex: 1,
    overscrollBehavior: 'contain',
    overflowAnchor: 'none',
  },
  todayRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
    minWidth: 0,
    minHeight: TODAY_ROW_HEIGHT_PX,
    boxSizing: 'border-box',
    padding: '1px 2px',
    flexShrink: 0,
  },
  todayRowDragging: {
    opacity: 0.4,
  },
  dropLine: {
    position: 'absolute',
    left: 14,
    right: 2,
    top: -1,
    height: 1,
    borderRadius: 1,
    background: '#94a3b8',
    pointerEvents: 'none',
    zIndex: 2,
  },
  dropLineAfter: {
    position: 'absolute',
    left: 14,
    right: 2,
    bottom: -1,
    height: 1,
    borderRadius: 1,
    background: '#94a3b8',
    pointerEvents: 'none',
    zIndex: 2,
  },
  todayBullet: {
    flexShrink: 0,
    width: 14,
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    userSelect: 'none',
    lineHeight: 1,
    paddingTop: 8,
  },
  todayDragHandle: {
    cursor: 'grab',
    color: '#64748b',
  },
  todayInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    background: 'transparent',
    fontFamily: font,
    fontSize: 12,
    lineHeight: 1.35,
    color: '#334155',
    padding: '6px 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  todayActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    marginTop: 2,
  },
  todayDeleteBtn: {
    width: 20,
    height: 20,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
  startBtn: {
    border: 'none',
    background: 'transparent',
    padding: 0,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    color: '#047857',
    cursor: 'pointer',
    lineHeight: 1.2,
  },
  startBtnDisabled: {
    color: '#94a3b8',
    cursor: 'not-allowed',
  },
};

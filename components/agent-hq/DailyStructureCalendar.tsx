'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  DAY_TIMELINE_END,
  DAY_TIMELINE_PX_PER_MIN,
  DAY_TIMELINE_START,
  blockKindColor,
  formatMinutesLabel,
  sortBlocks,
  type DayBlock,
  type DayBlockColorMap,
} from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SNAP = 15;
const MIN_DURATION = 15;

interface DailyStructureCalendarProps {
  blocks: DayBlock[];
  onBlocksChange?: (blocks: DayBlock[]) => void;
  interactive?: boolean;
  compact?: boolean;
  title?: string;
  onRemoveBlock?: (blockId: string) => void;
  /** Inclusive start of visible timeline (minutes from midnight). */
  timelineStartMinutes?: number;
  /** Inclusive end of visible timeline (minutes from midnight). */
  timelineEndMinutes?: number;
  /** When true, show the full range with no scroll. */
  noScroll?: boolean;
  pxPerMin?: number;
  colorMap?: DayBlockColorMap | null;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

type DragState = {
  id: string;
  mode: DragMode;
  startY: number;
  originStart: number;
  originDuration: number;
};

function snapMinutes(minutes: number) {
  return Math.round(minutes / SNAP) * SNAP;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export default function DailyStructureCalendar({
  blocks,
  onBlocksChange,
  interactive = true,
  compact = false,
  title = 'My day at a glance',
  onRemoveBlock,
  timelineStartMinutes = DAY_TIMELINE_START,
  timelineEndMinutes = DAY_TIMELINE_END,
  noScroll = false,
  pxPerMin = DAY_TIMELINE_PX_PER_MIN,
  colorMap = null,
}: DailyStructureCalendarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const rangeStart = timelineStartMinutes;
  const rangeEnd = timelineEndMinutes;
  const timelineHeight = (rangeEnd - rangeStart) * pxPerMin;
  const sorted = sortBlocks(blocks);

  useEffect(() => {
    if (selectedId && !blocks.some(b => b.id === selectedId)) {
      setSelectedId(null);
    }
  }, [blocks, selectedId]);

  useEffect(() => {
    if (!interactive || !onRemoveBlock) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (isEditableTarget(e.target)) return;
      const id = selectedIdRef.current;
      if (!id) return;
      e.preventDefault();
      onRemoveBlock(id);
      setSelectedId(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interactive, onRemoveBlock]);

  const clampMoveStart = useCallback(
    (minutes: number, duration: number) => {
      const min = rangeStart;
      const max = rangeEnd - duration;
      return Math.max(min, Math.min(max, minutes));
    },
    [rangeStart, rangeEnd]
  );

  const beginDrag = (e: ReactMouseEvent, block: DayBlock, mode: DragMode) => {
    if (!interactive || !onBlocksChange) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(block.id);
    dragRef.current = {
      id: block.id,
      mode,
      startY: e.clientY,
      originStart: block.startMinutes,
      originDuration: block.durationMinutes,
    };

    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaMin = (ev.clientY - drag.startY) / pxPerMin;
      const current = blocksRef.current;
      const originEnd = drag.originStart + drag.originDuration;

      let nextStart = drag.originStart;
      let nextDuration = drag.originDuration;

      if (drag.mode === 'move') {
        nextStart = clampMoveStart(
          snapMinutes(drag.originStart + deltaMin),
          drag.originDuration
        );
      } else if (drag.mode === 'resize-start') {
        const rawStart = snapMinutes(drag.originStart + deltaMin);
        const maxStart = originEnd - MIN_DURATION;
        nextStart = Math.max(rangeStart, Math.min(maxStart, rawStart));
        nextDuration = originEnd - nextStart;
      } else {
        const rawEnd = snapMinutes(originEnd + deltaMin);
        const minEnd = drag.originStart + MIN_DURATION;
        const nextEnd = Math.max(minEnd, Math.min(rangeEnd, rawEnd));
        nextDuration = nextEnd - drag.originStart;
        nextStart = drag.originStart;
      }

      onBlocksChange(
        current.map(b =>
          b.id === drag.id ? { ...b, startMinutes: nextStart, durationMinutes: nextDuration } : b
        )
      );
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const hourLabels: number[] = [];
  for (let m = rangeStart; m <= rangeEnd; m += 60) hourLabels.push(m);

  return (
    <div style={{ ...styles.shell, ...(compact ? styles.shellCompact : {}) }}>
      {title ? <div style={styles.header}>{title}</div> : null}
      <div
        style={{
          ...styles.body,
          ...(noScroll ? styles.bodyNoScroll : {}),
        }}
        onMouseDown={() => setSelectedId(null)}
      >
        <div style={{ ...styles.labels, minHeight: timelineHeight }}>
          {hourLabels.map(min => (
            <div
              key={min}
              style={{
                ...styles.hourLabel,
                top: (min - rangeStart) * pxPerMin,
              }}
            >
              {formatMinutesLabel(min)}
            </div>
          ))}
        </div>
        <div ref={trackRef} style={{ ...styles.track, height: timelineHeight }}>
          {hourLabels.map(min => (
            <div
              key={`line-${min}`}
              style={{
                ...styles.hourLine,
                top: (min - rangeStart) * pxPerMin,
              }}
            />
          ))}
          {sorted.map(block => {
            const colors = blockKindColor(block.kind, colorMap);
            const top = (block.startMinutes - rangeStart) * pxPerMin;
            const height = Math.max(pxPerMin >= 0.9 ? 22 : 16, block.durationMinutes * pxPerMin);
            const dense = pxPerMin < 0.85;
            if (block.startMinutes + block.durationMinutes <= rangeStart) return null;
            if (block.startMinutes >= rangeEnd) return null;
            const endMinutes = block.startMinutes + block.durationMinutes;
            const rangeLabel = `${formatMinutesLabel(block.startMinutes)}–${formatMinutesLabel(endMinutes)}`;
            const canEdit = interactive && !!onBlocksChange;
            const selected = selectedId === block.id;
            return (
              <div
                key={block.id}
                style={{
                  ...styles.block,
                  ...(dense ? styles.blockDense : {}),
                  ...(selected ? styles.blockSelected : {}),
                  top,
                  height,
                  background: colors.bg,
                  borderColor: selected ? '#0f172a' : colors.border,
                  color: colors.text,
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'stretch',
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  setSelectedId(block.id);
                }}
                title={`${block.title} · ${rangeLabel}${onRemoveBlock ? ' · Delete to remove' : ''}`}
              >
                {canEdit ? (
                  <div
                    style={{
                      ...styles.moveHandle,
                      ...(dense ? styles.moveHandleDense : {}),
                    }}
                    onMouseDown={e => beginDrag(e, block, 'move')}
                    title="Drag to move block"
                    aria-label={`Move ${block.title}`}
                  >
                    <span style={styles.moveHandleGrip} aria-hidden>
                      ⋮⋮
                    </span>
                  </div>
                ) : null}
                <div style={styles.blockBody}>
                  {canEdit ? (
                    <div
                      style={{ ...styles.resizeHandle, ...styles.resizeHandleTop }}
                      onMouseDown={e => beginDrag(e, block, 'resize-start')}
                      title="Drag to change start"
                    />
                  ) : null}
                  <div style={styles.blockTopRow}>
                    <div style={{ ...styles.blockTitle, ...(dense ? styles.blockTitleDense : {}) }}>
                      {block.title}
                    </div>
                    <div style={{ ...styles.blockMetaSide, ...(dense ? styles.blockMetaSideDense : {}) }}>
                      {rangeLabel}
                    </div>
                    {onRemoveBlock ? (
                      <button
                        type="button"
                        style={styles.removeBtn}
                        aria-label={`Remove ${block.title}`}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation();
                          onRemoveBlock(block.id);
                          setSelectedId(null);
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div
                      style={{ ...styles.resizeHandle, ...styles.resizeHandleBottom }}
                      onMouseDown={e => beginDrag(e, block, 'resize-end')}
                      title="Drag to change end"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    width: 320,
    minWidth: 280,
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
    fontFamily: font,
  },
  shellCompact: {
    width: '100%',
    minWidth: 0,
    boxShadow: 'none',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  },
  header: {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
  },
  body: {
    display: 'flex',
    maxHeight: 520,
    overflow: 'auto',
    padding: '8px 10px 12px 4px',
  },
  bodyNoScroll: {
    maxHeight: 'none',
    overflow: 'visible',
  },
  labels: {
    position: 'relative',
    width: 54,
    flexShrink: 0,
  },
  hourLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 10,
    color: '#64748b',
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
  },
  track: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTop: '1px solid #f1f5f9',
  },
  block: {
    position: 'absolute',
    left: 4,
    right: 4,
    border: '1px solid',
    borderRadius: 10,
    padding: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    userSelect: 'none',
    boxShadow: 'none',
  },
  blockDense: {
    borderRadius: 8,
    borderWidth: 1,
  },
  blockSelected: {
    boxShadow: '0 0 0 2px rgba(15, 23, 42, 0.35)',
    zIndex: 3,
  },
  moveHandle: {
    flex: '0 0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    background: 'rgba(15, 23, 42, 0.08)',
    borderRight: '1px solid rgba(15, 23, 42, 0.08)',
    zIndex: 2,
  },
  moveHandleDense: {
    flexBasis: 12,
  },
  moveHandleGrip: {
    fontSize: 9,
    lineHeight: 1,
    letterSpacing: '-2px',
    opacity: 0.55,
    transform: 'scaleY(1.15)',
  },
  blockBody: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    padding: '4px 6px 4px 6px',
  },
  resizeHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    zIndex: 2,
    background: 'transparent',
  },
  resizeHandleTop: {
    top: 0,
    cursor: 'ns-resize',
  },
  resizeHandleBottom: {
    bottom: 0,
    cursor: 'ns-resize',
  },
  blockTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    width: '100%',
    minWidth: 0,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    flex: '1 1 auto',
  },
  blockTitleDense: {
    fontSize: 11,
    lineHeight: 1.15,
  },
  removeBtn: {
    flexShrink: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    opacity: 0.55,
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    fontFamily: font,
  },
  blockMetaSide: {
    flex: '0 0 auto',
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: 600,
    opacity: 0.92,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.02em',
  },
  blockMetaSideDense: {
    fontSize: 9,
  },
};

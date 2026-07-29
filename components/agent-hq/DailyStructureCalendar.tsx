'use client';

import { useCallback, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
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

  const rangeStart = timelineStartMinutes;
  const rangeEnd = timelineEndMinutes;
  const timelineHeight = (rangeEnd - rangeStart) * pxPerMin;
  const sorted = sortBlocks(blocks);

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
            // Skip blocks fully outside the visible window
            if (block.startMinutes + block.durationMinutes <= rangeStart) return null;
            if (block.startMinutes >= rangeEnd) return null;
            const canEdit = interactive && !!onBlocksChange;
            return (
              <div
                key={block.id}
                style={{
                  ...styles.block,
                  ...(dense ? styles.blockDense : {}),
                  top,
                  height,
                  background: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
                  cursor: canEdit ? 'grab' : 'default',
                }}
                onMouseDown={e => beginDrag(e, block, 'move')}
                title={`${block.title} (${formatMinutesLabel(block.startMinutes)}) · ${block.durationMinutes}m`}
              >
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
                  {onRemoveBlock ? (
                    <button
                      type="button"
                      style={styles.removeBtn}
                      aria-label={`Remove ${block.title}`}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveBlock(block.id);
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {!dense || height >= 28 ? (
                  <div style={styles.blockMeta}>
                    {formatMinutesLabel(block.startMinutes)} · {block.durationMinutes}m
                  </div>
                ) : null}
                {canEdit ? (
                  <div
                    style={{ ...styles.resizeHandle, ...styles.resizeHandleBottom }}
                    onMouseDown={e => beginDrag(e, block, 'resize-end')}
                    title="Drag to change end"
                  />
                ) : null}
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
    borderRadius: 8,
    padding: '6px 8px',
    overflow: 'hidden',
    boxSizing: 'border-box',
    userSelect: 'none',
  },
  blockDense: {
    padding: '3px 6px',
    borderRadius: 6,
  },
  resizeHandle: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 8,
    zIndex: 2,
    borderRadius: 999,
  },
  resizeHandleTop: {
    top: 0,
    cursor: 'ns-resize',
    background: 'linear-gradient(to bottom, rgba(15,23,42,0.18), transparent)',
  },
  resizeHandleBottom: {
    bottom: 0,
    cursor: 'ns-resize',
    background: 'linear-gradient(to top, rgba(15,23,42,0.18), transparent)',
  },
  blockTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 4,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
    flex: 1,
  },
  blockTitleDense: {
    fontSize: 11,
    lineHeight: 1.2,
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
  blockMeta: {
    fontSize: 10,
    opacity: 0.85,
    marginTop: 2,
  },
};

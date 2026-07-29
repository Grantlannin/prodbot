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
} from './stuckHelp/dailyStructureUtils';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SNAP = 15;

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
}

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
}: DailyStructureCalendarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startY: number; originMinutes: number } | null>(null);

  const rangeStart = timelineStartMinutes;
  const rangeEnd = timelineEndMinutes;
  const timelineHeight = (rangeEnd - rangeStart) * pxPerMin;
  const sorted = sortBlocks(blocks);

  const clampToRange = useCallback(
    (minutes: number, duration: number) => {
      const min = rangeStart;
      const max = rangeEnd - duration;
      return Math.max(min, Math.min(max, minutes));
    },
    [rangeStart, rangeEnd]
  );

  const onBlockMouseDown = (e: ReactMouseEvent, block: DayBlock) => {
    if (!interactive || !onBlocksChange) return;
    e.preventDefault();
    dragRef.current = { id: block.id, startY: e.clientY, originMinutes: block.startMinutes };

    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaMin = (ev.clientY - drag.startY) / pxPerMin;
      const blockData = blocks.find(b => b.id === drag.id);
      if (!blockData) return;
      const nextStart = clampToRange(
        snapMinutes(drag.originMinutes + deltaMin),
        blockData.durationMinutes
      );
      onBlocksChange(blocks.map(b => (b.id === drag.id ? { ...b, startMinutes: nextStart } : b)));
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
            const colors = blockKindColor(block.kind);
            const top = (block.startMinutes - rangeStart) * pxPerMin;
            const height = Math.max(22, block.durationMinutes * pxPerMin);
            // Skip blocks fully outside the visible window
            if (block.startMinutes + block.durationMinutes <= rangeStart) return null;
            if (block.startMinutes >= rangeEnd) return null;
            return (
              <div
                key={block.id}
                style={{
                  ...styles.block,
                  top,
                  height,
                  background: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
                  cursor: interactive && onBlocksChange ? 'grab' : 'default',
                }}
                onMouseDown={e => onBlockMouseDown(e, block)}
                title={`${block.title} (${formatMinutesLabel(block.startMinutes)})`}
              >
                <div style={styles.blockTopRow}>
                  <div style={styles.blockTitle}>{block.title}</div>
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
                <div style={styles.blockMeta}>
                  {formatMinutesLabel(block.startMinutes)} · {block.durationMinutes}m ·{' '}
                  {block.kind.replace('_', ' ')}
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
    borderRadius: 8,
    padding: '6px 8px',
    overflow: 'hidden',
    boxSizing: 'border-box',
    userSelect: 'none',
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

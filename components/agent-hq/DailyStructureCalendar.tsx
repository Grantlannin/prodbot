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
}

function snapMinutes(minutes: number) {
  return Math.round(minutes / SNAP) * SNAP;
}

function clampMinutes(minutes: number, duration: number) {
  const min = DAY_TIMELINE_START;
  const max = DAY_TIMELINE_END - duration;
  return Math.max(min, Math.min(max, minutes));
}

export default function DailyStructureCalendar({
  blocks,
  onBlocksChange,
  interactive = true,
  compact = false,
}: DailyStructureCalendarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startY: number; originMinutes: number } | null>(null);

  const timelineHeight = (DAY_TIMELINE_END - DAY_TIMELINE_START) * DAY_TIMELINE_PX_PER_MIN;
  const sorted = sortBlocks(blocks);

  const yToMinutes = useCallback((clientY: number) => {
    const track = trackRef.current;
    if (!track) return DAY_TIMELINE_START;
    const rect = track.getBoundingClientRect();
    const y = clientY - rect.top;
    const raw = DAY_TIMELINE_START + y / DAY_TIMELINE_PX_PER_MIN;
    return snapMinutes(raw);
  }, []);

  const onBlockMouseDown = (e: ReactMouseEvent, block: DayBlock) => {
    if (!interactive || !onBlocksChange) return;
    e.preventDefault();
    dragRef.current = { id: block.id, startY: e.clientY, originMinutes: block.startMinutes };

    const onMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaMin = ((ev.clientY - drag.startY) / DAY_TIMELINE_PX_PER_MIN);
      const blockData = blocks.find(b => b.id === drag.id);
      if (!blockData) return;
      const nextStart = clampMinutes(snapMinutes(drag.originMinutes + deltaMin), blockData.durationMinutes);
      onBlocksChange(
        blocks.map(b => (b.id === drag.id ? { ...b, startMinutes: nextStart } : b))
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
  for (let m = DAY_TIMELINE_START; m <= DAY_TIMELINE_END; m += 60) hourLabels.push(m);

  return (
    <div style={{ ...styles.shell, ...(compact ? styles.shellCompact : {}) }}>
      <div style={styles.header}>My day at a glance</div>
      <div style={styles.body}>
        <div style={styles.labels}>
          {hourLabels.map(min => (
            <div
              key={min}
              style={{
                ...styles.hourLabel,
                top: (min - DAY_TIMELINE_START) * DAY_TIMELINE_PX_PER_MIN,
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
                top: (min - DAY_TIMELINE_START) * DAY_TIMELINE_PX_PER_MIN,
              }}
            />
          ))}
          {sorted.map(block => {
            const colors = blockKindColor(block.kind);
            const top = (block.startMinutes - DAY_TIMELINE_START) * DAY_TIMELINE_PX_PER_MIN;
            const height = Math.max(28, block.durationMinutes * DAY_TIMELINE_PX_PER_MIN);
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
                <div style={styles.blockTitle}>{block.title}</div>
                <div style={styles.blockMeta}>
                  {formatMinutesLabel(block.startMinutes)} · {block.durationMinutes}m
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
  labels: {
    position: 'relative',
    width: 54,
    flexShrink: 0,
    minHeight: (DAY_TIMELINE_END - DAY_TIMELINE_START) * DAY_TIMELINE_PX_PER_MIN,
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
  blockTitle: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  blockMeta: {
    fontSize: 10,
    opacity: 0.85,
    marginTop: 2,
  },
};

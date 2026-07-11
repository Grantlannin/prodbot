'use client';

import { useCallback, useEffect, useRef } from 'react';

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export interface Size2 {
  w: number;
  h: number;
}

interface UseCornerResizeOptions {
  size: Size2;
  onSizeChange: (next: Size2) => void;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  onPositionChange?: (next: { x: number; y: number }) => void;
  position?: { x: number; y: number } | null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function useCornerResize({
  size,
  onSizeChange,
  minW = 120,
  maxW = 320,
  minH = 88,
  maxH = 220,
  onPositionChange,
  position,
}: UseCornerResizeOptions) {
  const resizing = useRef<{
    corner: ResizeCorner;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (corner: ResizeCorner, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      resizing.current = {
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.w,
        startH: size.h,
        startPosX: position?.x ?? 0,
        startPosY: position?.y ?? 0,
      };
    },
    [size.w, size.h, position]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = resizing.current;
      if (!r) return;

      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;

      let w = r.startW;
      let h = r.startH;
      let x = r.startPosX;
      let y = r.startPosY;

      switch (r.corner) {
        case 'se':
          w = r.startW + dx;
          h = r.startH + dy;
          break;
        case 'sw':
          w = r.startW - dx;
          h = r.startH + dy;
          break;
        case 'ne':
          w = r.startW + dx;
          h = r.startH - dy;
          break;
        case 'nw':
          w = r.startW - dx;
          h = r.startH - dy;
          break;
      }

      w = clamp(w, minW, maxW);
      h = clamp(h, minH, maxH);

      if (onPositionChange && position && (r.corner === 'sw' || r.corner === 'nw')) {
        x = r.startPosX + (r.startW - w);
      }
      if (onPositionChange && position && (r.corner === 'ne' || r.corner === 'nw')) {
        y = r.startPosY + (r.startH - h);
      }

      onSizeChange({ w, h });
      if (onPositionChange && position) {
        onPositionChange({ x, y });
      }
    };

    const onUp = () => {
      resizing.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [minW, maxW, minH, maxH, onSizeChange, onPositionChange, position]);

  return { onResizeStart };
}

export const CORNER_HANDLE_CURSORS: Record<ResizeCorner, string> = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
};

export function CornerResizeHandles({
  onResizeStart,
}: {
  onResizeStart: (corner: ResizeCorner, e: React.PointerEvent) => void;
}) {
  const corners: { corner: ResizeCorner; top?: number; bottom?: number; left?: number; right?: number }[] = [
    { corner: 'nw', top: 0, left: 0 },
    { corner: 'ne', top: 0, right: 0 },
    { corner: 'sw', bottom: 0, left: 0 },
    { corner: 'se', bottom: 0, right: 0 },
  ];

  return (
    <>
      {corners.map(({ corner, ...pos }) => (
        <div
          key={corner}
          data-resize-handle
          onPointerDown={e => onResizeStart(corner, e)}
          style={{
            position: 'absolute',
            width: 16,
            height: 16,
            ...pos,
            cursor: CORNER_HANDLE_CURSORS[corner],
            zIndex: 2,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

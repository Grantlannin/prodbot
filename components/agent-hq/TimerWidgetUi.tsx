'use client';

import type { CSSProperties } from 'react';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const DEFAULT_WIDGET_W = 168;

export function LivePulseStyles() {
  return (
    <style>{`
      @keyframes timerLivePulse {
        0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
        50% { opacity: 0.75; transform: scale(0.92); box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
      }
    `}</style>
  );
}

export function LiveBadge({ size = 'sm', paused = false }: { size?: 'sm' | 'md'; paused?: boolean }) {
  const dot = size === 'md' ? 7 : 6;
  const fs = size === 'md' ? 9 : 8;
  const badgeWidth = size === 'md' ? 68 : 50;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        width: badgeWidth,
        minWidth: badgeWidth,
        boxSizing: 'border-box',
        background: paused ? 'rgba(234, 179, 8, 0.12)' : 'rgba(14, 165, 233, 0.15)',
        border: paused ? '1px solid rgba(234, 179, 8, 0.35)' : '1px solid rgba(14, 165, 233, 0.35)',
        color: paused ? '#fcd34d' : '#7dd3fc',
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: '0.08em',
        padding: size === 'md' ? '3px 4px' : '2px 4px',
        borderRadius: 20,
        fontFamily: font,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: dot,
          height: dot,
          borderRadius: '50%',
          background: paused ? '#eab308' : '#22c55e',
          flexShrink: 0,
          animation: paused ? 'none' : 'timerLivePulse 1.8s ease-in-out infinite',
        }}
      />
      {paused ? 'PAUSED' : 'LIVE'}
    </span>
  );
}

export function timerDigitsStyle(accent: string, boxWidth: number, baseWidth = DEFAULT_WIDGET_W): CSSProperties {
  const ratio = boxWidth / baseWidth;
  return {
    color: accent,
    fontSize: Math.round(22 * ratio),
    fontWeight: 500,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.06em',
    lineHeight: 1,
    textAlign: 'center',
  };
}

export function timerLabelStyle(boxWidth?: number, baseWidth = DEFAULT_WIDGET_W): CSSProperties {
  const ratio = boxWidth ? boxWidth / baseWidth : 1;
  return {
    color: '#64748b',
    fontSize: Math.round(10 * ratio),
    fontWeight: 500,
    marginTop: 5,
    textAlign: 'center',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontFamily: font,
  };
}

export function sleekActionBtn(_active?: boolean, compact?: boolean): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.11)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 6,
    padding: compact ? '4px 10px' : '5px 8px',
    fontSize: compact ? 10 : 10,
    fontWeight: 500,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    fontFamily: font,
    flexShrink: 0,
  };
}

const PAUSE_BTN_W = 40;

export function pauseToggleBtnStyle(paused: boolean): CSSProperties {
  return {
    ...sleekActionBtn(paused, true),
    position: 'relative',
    width: PAUSE_BTN_W,
    minWidth: PAUSE_BTN_W,
    height: 24,
    padding: 0,
    fontSize: 9,
    boxSizing: 'border-box',
    flexShrink: 0,
  };
}

export const PAUSE_TOGGLE_BTN_W = PAUSE_BTN_W;

export function infractionInputStyle(): CSSProperties {
  return {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 11,
    padding: '7px 9px',
    outline: 'none',
    fontFamily: font,
    cursor: 'text',
    marginTop: 8,
  };
}

export function miniActionBtn(_active?: boolean): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.11)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 5,
    padding: '2px 5px',
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    fontFamily: font,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
  };
}

export function timerControlBtn(_active?: boolean): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.11)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 5,
    padding: '3px 6px',
    fontSize: 8,
    fontWeight: 500,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    fontFamily: font,
    lineHeight: 1.3,
    flex: 1,
    minWidth: 0,
  };
}

export const DEFAULT_CORNER_WIDGET_SIZE = { w: 168, h: 148 };
export const DEFAULT_HOVER_SIZE = { w: 200, h: 132 };

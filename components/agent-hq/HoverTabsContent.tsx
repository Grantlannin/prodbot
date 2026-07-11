'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { minutesToTimerHMS } from './chatLogic';
import { CornerResizeHandles, useCornerResize } from './hooks/useCornerResize';
import { useLocalStorage } from './hooks/useLocalStorage';
import { formatTimerDisplay, type TimerDisplay } from './timerDisplay';
import {
  DEFAULT_HOVER_SIZE,
  infractionInputStyle,
  LiveBadge,
  LivePulseStyles,
  pauseToggleBtnStyle,
  sleekActionBtn,
  timerDigitsStyle,
} from './TimerWidgetUi';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

interface HoverTabsContentProps {
  display: TimerDisplay;
  onAddInfraction?: (categoryKey: string, label: string) => void;
  onTogglePause?: () => void;
  onReset?: () => void;
  onEndSession?: () => void;
  onSetCountdown?: (targetMs: number) => void;
  pipWindow: Window;
  timerPaused?: boolean;
}

export default function HoverTabsContent({
  display,
  onAddInfraction,
  onTogglePause,
  onReset,
  onEndSession,
  onSetCountdown,
  pipWindow,
  timerPaused = false,
}: HoverTabsContentProps) {
  const [infractionMode, setInfractionMode] = useState(false);
  const [setTimerMode, setSetTimerMode] = useState(false);
  const [infractionText, setInfractionText] = useState('');
  const [minutesInput, setMinutesInput] = useState('');
  const [size, setSize] = useLocalStorage('agentHQ_hoverSize', DEFAULT_HOVER_SIZE);
  const infractionRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  const accent = display.mode === 'break' ? '#b45309' : '#22c55e';
  const timerText = formatTimerDisplay(display);
  const parsedMinutes = parseInt(minutesInput.trim(), 10);
  const previewHms = !isNaN(parsedMinutes) && parsedMinutes > 0 ? minutesToTimerHMS(parsedMinutes) : null;

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
    minW: 160,
    maxW: 360,
    minH: 90,
    maxH: 280,
  });

  useEffect(() => {
    applyWindowSize(size);
  }, [applyWindowSize, size]);

  useEffect(() => {
    if (infractionMode) infractionRef.current?.focus();
  }, [infractionMode]);

  useEffect(() => {
    if (setTimerMode) minutesRef.current?.focus();
  }, [setTimerMode]);

  const submitInfraction = useCallback(() => {
    const label = infractionText.trim();
    if (!label) {
      setInfractionMode(false);
      setInfractionText('');
      return;
    }
    onAddInfraction?.(label.toLowerCase(), label);
    setInfractionText('');
    setInfractionMode(false);
  }, [infractionText, onAddInfraction]);

  const submitCountdown = useCallback(() => {
    const num = parseInt(minutesInput.trim(), 10);
    if (isNaN(num) || num < 1) return;
    onSetCountdown?.(num * 60 * 1000);
    setMinutesInput('');
    setSetTimerMode(false);
  }, [minutesInput, onSetCountdown]);

  const openSetTimer = useCallback(() => {
    setSetTimerMode(v => !v);
    setInfractionMode(false);
  }, []);

  const openInfraction = useCallback(() => {
    setInfractionMode(v => !v);
    setSetTimerMode(false);
  }, []);

  return (
    <>
      <LivePulseStyles />
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#0a0a0a',
          fontFamily: font,
          display: 'flex',
          flexDirection: 'column',
          padding: '10px 12px 8px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <CornerResizeHandles onResizeStart={onResizeStart} />

        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={timerDigitsStyle(accent, size.w, DEFAULT_HOVER_SIZE.w)}>{timerText}</div>
          </div>

          {setTimerMode && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#0a0a0a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                boxSizing: 'border-box',
                zIndex: 2,
              }}
            >
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10, letterSpacing: '0.04em' }}>
                Minutes
              </div>
              <input
                ref={minutesRef}
                type="number"
                min={1}
                value={minutesInput}
                onChange={e => setMinutesInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitCountdown();
                  }
                  if (e.key === 'Escape') {
                    setSetTimerMode(false);
                    setMinutesInput('');
                  }
                }}
                placeholder="25"
                aria-label="Minutes"
                style={{
                  ...infractionInputStyle(),
                  marginTop: 0,
                  width: '100%',
                  maxWidth: 120,
                  textAlign: 'center',
                  fontSize: 18,
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  boxSizing: 'border-box',
                }}
              />
              {previewHms && (
                <div
                  style={{
                    marginTop: 12,
                    color: accent,
                    fontSize: Math.round(18 * (size.w / DEFAULT_HOVER_SIZE.w)),
                    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.06em',
                  }}
                >
                  {previewHms}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
            <LiveBadge size="sm" paused={timerPaused} />
            <button type="button" onClick={onTogglePause} style={{ ...pauseToggleBtnStyle(timerPaused), height: 22, fontSize: 8 }}>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: timerPaused ? 0 : 1,
                }}
              >
                Stop
              </span>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 7,
                  opacity: timerPaused ? 1 : 0,
                }}
              >
                Resume
              </span>
            </button>
            <button
              type="button"
              onClick={onReset}
              style={{
                ...sleekActionBtn(false, true),
                width: 32,
                minWidth: 32,
                padding: '3px 2px',
                fontSize: 8,
                textAlign: 'center',
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={openSetTimer}
              style={{
                ...sleekActionBtn(setTimerMode, true),
                flex: 1,
                minWidth: 0,
                fontSize: 8,
                padding: '3px 4px',
                textAlign: 'center',
              }}
            >
              Set timer
            </button>
          </div>
          <button
            type="button"
            onClick={openInfraction}
            style={{
              ...sleekActionBtn(infractionMode, true),
              width: '100%',
              fontSize: 8,
              padding: '3px 8px',
              textAlign: 'center',
            }}
          >
            Add infraction
          </button>
          <button
            type="button"
            onClick={onEndSession}
            style={{
              ...sleekActionBtn(false, true),
              width: '100%',
              fontSize: 8,
              padding: '3px 8px',
              textAlign: 'center',
              color: '#fca5a5',
            }}
          >
            End session
          </button>
          {infractionMode && (
            <input
              ref={infractionRef}
              value={infractionText}
              onChange={e => setInfractionText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitInfraction();
                }
                if (e.key === 'Escape') {
                  setInfractionMode(false);
                  setInfractionText('');
                }
              }}
              placeholder="type your infraction"
              style={{ ...infractionInputStyle(), marginTop: 0, width: '100%', boxSizing: 'border-box' }}
            />
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import HoverTabsContent from '../HoverTabsContent';
import { getTimerDisplay, timerTitle } from '../timerDisplay';
import { useWorkTrackerContext } from './WorkTrackerProvider';
import { useEndSession } from './EndSessionProvider';
import { useHoverTabsWindow } from './useHoverTabsWindow';

const DEFAULT_TITLE = 'Today';

interface HoverTimerContextValue {
  isOpen: boolean;
  supported: boolean;
  open: () => Promise<void>;
  close: () => Promise<void>;
  toggle: () => Promise<void>;
  requestOpen: () => void;
}

const HoverTimerContext = createContext<HoverTimerContextValue | null>(null);

export function HoverTimerProvider({
  children,
  onAddInfraction,
}: {
  children: ReactNode;
  onAddInfraction?: (categoryKey: string, label: string) => void;
}) {
  const tracker = useWorkTrackerContext();
  const { requestEndSession } = useEndSession();
  const [tick, setTick] = useState(0);
  const pendingOpenRef = useRef(false);
  const baseTitleRef = useRef(DEFAULT_TITLE);

  void tick;

  const display = getTimerDisplay({
    status: tracker.status,
    phase: tracker.phase,
    elapsed: tracker.elapsed,
    pomodoroLeft: tracker.pomodoroLeft,
    breakLeft: tracker.breakLeft,
    pomodoroPausedRemaining: tracker.pomodoroPausedRemaining,
    pausedWorkElapsed: tracker.pausedWorkElapsed,
    openCountdownLeft: tracker.openCountdownLeft,
    currentSession: tracker.currentSession,
    currentBreak: tracker.currentBreak,
    timerPaused: tracker.timerPaused,
  });

  const handleTogglePause = useCallback(() => {
    if (tracker.timerPaused) tracker.resumeTimer();
    else tracker.pauseTimer();
  }, [tracker]);

  const hasActiveTimer = display !== null;

  const { videoRef, canvasRef, isOpen, supported, open, close, toggle, pipWindow } =
    useHoverTabsWindow(display);

  const handleEndSession = useCallback(() => {
    requestEndSession();
  }, [requestEndSession]);

  useEffect(() => {
    if (!display && isOpen) {
      void close();
    }
  }, [display, isOpen, close]);

  const requestOpen = useCallback(() => {
    pendingOpenRef.current = true;
  }, []);

  useEffect(() => {
    if (!pendingOpenRef.current || !display || !supported) return;
    pendingOpenRef.current = false;
    void open();
  }, [display, isOpen, supported, open]);

  useEffect(() => {
    if (!hasActiveTimer || tracker.timerPaused) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasActiveTimer, tracker.status, tracker.phase, tracker.timerPaused]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.title !== DEFAULT_TITLE && !document.title.includes('·')) {
      baseTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = display ? timerTitle(display) : baseTitleRef.current || DEFAULT_TITLE;
  }, [display]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.title = baseTitleRef.current || DEFAULT_TITLE;
      }
    };
  }, []);

  const value: HoverTimerContextValue = {
    isOpen,
    supported,
    open,
    close,
    toggle,
    requestOpen,
  };

  const pipPortal =
    pipWindow && display
      ? createPortal(
          <HoverTabsContent
            display={display}
            onAddInfraction={onAddInfraction}
            onTogglePause={handleTogglePause}
            onEndSession={handleEndSession}
            pipWindow={pipWindow}
            timerPaused={tracker.timerPaused}
          />,
          pipWindow.document.body
        )
      : null;

  return (
    <HoverTimerContext.Provider value={value}>
      {children}
      {pipPortal}
      <canvas ref={canvasRef} width={160} height={90} style={{ display: 'none' }} aria-hidden />
      <video ref={videoRef} muted playsInline disablePictureInPicture={false} style={{ display: 'none' }} aria-hidden />
    </HoverTimerContext.Provider>
  );
}

export function useHoverTimer(): HoverTimerContextValue {
  const ctx = useContext(HoverTimerContext);
  if (!ctx) throw new Error('useHoverTimer must be used within HoverTimerProvider');
  return ctx;
}

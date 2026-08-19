'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import HoverTabsContent from '../HoverTabsContent';
import { getTimerDisplay, timerTitle } from '../timerDisplay';
import { useWorkTrackerContext, useWorkTrackerTick } from './WorkTrackerProvider';
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

const noopApi: HoverTimerContextValue = {
  isOpen: false,
  supported: false,
  open: async () => {},
  close: async () => {},
  toggle: async () => {},
  requestOpen: () => {},
};

const HoverTimerContext = createContext<HoverTimerContextValue>(noopApi);

function HoverTimerInternals({
  onAddInfraction,
  onApi,
}: {
  onAddInfraction?: (categoryKey: string, label: string) => void;
  onApi: (api: HoverTimerContextValue) => void;
}) {
  const tracker = useWorkTrackerContext();
  const tick = useWorkTrackerTick();
  const { requestEndSession } = useEndSession();
  const pendingOpenRef = useRef(false);
  const baseTitleRef = useRef(DEFAULT_TITLE);

  const display = getTimerDisplay({
    status: tracker.status,
    phase: tracker.phase,
    elapsed: tick.elapsed,
    pomodoroLeft: tick.pomodoroLeft,
    breakLeft: tick.breakLeft,
    pomodoroPausedRemaining: tracker.pomodoroPausedRemaining,
    pausedWorkElapsed: tracker.pausedWorkElapsed,
    openCountdownLeft: tick.openCountdownLeft,
    currentSession: tracker.currentSession,
    currentBreak: tracker.currentBreak,
    timerPaused: tracker.timerPaused,
  });

  const handleTogglePause = useCallback(() => {
    if (tracker.timerPaused) tracker.resumeTimer();
    else tracker.pauseTimer();
  }, [tracker]);

  const { videoRef, canvasRef, isOpen, supported, open, close, toggle, pipWindow } =
    useHoverTabsWindow(display);

  const handleEndSession = useCallback(() => {
    requestEndSession();
  }, [requestEndSession]);

  const requestOpen = useCallback(() => {
    pendingOpenRef.current = true;
  }, []);

  useEffect(() => {
    onApi({ isOpen, supported, open, close, toggle, requestOpen });
  }, [isOpen, supported, open, close, toggle, requestOpen, onApi]);

  useEffect(() => {
    if (!pendingOpenRef.current || !display || !supported) return;
    pendingOpenRef.current = false;
    void open();
  }, [display, isOpen, supported, open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = display ? timerTitle(display) : baseTitleRef.current || DEFAULT_TITLE;
  }, [display]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.title !== DEFAULT_TITLE && !document.title.includes('·')) {
      baseTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.title = baseTitleRef.current || DEFAULT_TITLE;
      }
    };
  }, []);

  const pipPortal =
    pipWindow && display
      ? createPortal(
          <HoverTabsContent
            display={display}
            onAddInfraction={onAddInfraction}
            onTogglePause={handleTogglePause}
            onEndSession={handleEndSession}
            onAdjustCountdown={tracker.adjustCountdownByMs}
            canAdjustCountdown={
              tracker.status === 'working' &&
              (tracker.phase === 'pomodoro_working' ||
                (tracker.currentSession?.type === 'open' &&
                  tracker.currentSession.countdownTargetMs != null))
            }
            canRemoveBonus={(tracker.currentSession?.countdownBonusMs ?? 0) > 0}
            pipWindow={pipWindow}
            timerPaused={tracker.timerPaused}
          />,
          pipWindow.document.body
        )
      : null;

  return (
    <>
      {pipPortal}
      <canvas ref={canvasRef} width={160} height={90} style={{ display: 'none' }} aria-hidden />
      <video ref={videoRef} muted playsInline disablePictureInPicture={false} style={{ display: 'none' }} aria-hidden />
    </>
  );
}

export function HoverTimerProvider({
  children,
  onAddInfraction,
}: {
  children: ReactNode;
  onAddInfraction?: (categoryKey: string, label: string) => void;
}) {
  const [api, setApi] = useState<HoverTimerContextValue>(noopApi);

  return (
    <HoverTimerContext.Provider value={api}>
      {children}
      <HoverTimerInternals onAddInfraction={onAddInfraction} onApi={setApi} />
    </HoverTimerContext.Provider>
  );
}

export function useHoverTimer(): HoverTimerContextValue {
  return useContext(HoverTimerContext);
}

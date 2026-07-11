'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDurationShort, formatTimerHMS } from '../chatLogic';
import type { TimerDisplay } from '../timerDisplay';

type DocPip = {
  requestWindow: (options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }) => Promise<Window>;
};

const DEFAULT_W = 200;
const DEFAULT_H = 132;

function injectPipStyles(doc: Document) {
  if (doc.getElementById('hover-tabs-styles')) return;
  const style = doc.createElement('style');
  style.id = 'hover-tabs-styles';
  style.textContent = `
    html, body { margin: 0; padding: 0; overflow: hidden; background: #0a0a0a; }
    * { box-sizing: border-box; }
  `;
  doc.head.appendChild(style);
}

export function useHoverTabsWindow(display: TimerDisplay | null) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [docPipSupported, setDocPipSupported] = useState(false);
  const [videoPipSupported, setVideoPipSupported] = useState(false);

  useEffect(() => {
    setDocPipSupported(typeof window !== 'undefined' && 'documentPictureInPicture' in window);
    setVideoPipSupported(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        Boolean(document.pictureInPictureEnabled)
    );
  }, []);

  const close = useCallback(async () => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
    setPipWindow(null);
    setIsOpen(false);
  }, [pipWindow]);

  useEffect(() => {
    if (!display && (isOpen || pipWindow)) {
      void close();
    }
  }, [display, isOpen, pipWindow, close]);

  const drawVideoFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !display) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    const accent = display.mode === 'break' ? '#b45309' : '#22c55e';
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      display.countingDown ? formatTimerHMS(display.ms) : formatDurationShort(display.ms),
      w / 2,
      h / 2
    );

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE', 10, h - 10);
  }, [display]);

  useEffect(() => {
    if (!isOpen || pipWindow || !display) return;
    if (document.pictureInPictureElement) {
      drawVideoFrame();
      const id = setInterval(drawVideoFrame, 1000);
      return () => clearInterval(id);
    }
  }, [isOpen, pipWindow, display, drawVideoFrame]);

  const openDocPip = useCallback(async () => {
    const api = (window as Window & { documentPictureInPicture?: DocPip }).documentPictureInPicture;
    if (!api || !display) return false;

    const w = await api.requestWindow({
      width: DEFAULT_W,
      height: DEFAULT_H,
      disallowReturnToOpener: true,
    });
    injectPipStyles(w.document);
    w.addEventListener('pagehide', () => {
      setPipWindow(null);
      setIsOpen(false);
    });
    setPipWindow(w);
    setIsOpen(true);
    return true;
  }, [display]);

  const openVideoPip = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !display) return false;

    drawVideoFrame();
    const stream = canvas.captureStream(1);
    video.srcObject = stream;
    await video.play();
    await video.requestPictureInPicture();
    setIsOpen(true);
    return true;
  }, [display, drawVideoFrame]);

  const open = useCallback(async () => {
    if (docPipSupported) {
      const ok = await openDocPip();
      if (ok) return;
    }
    if (videoPipSupported) {
      await openVideoPip();
    }
  }, [docPipSupported, videoPipSupported, openDocPip, openVideoPip]);

  const toggle = useCallback(async () => {
    if (isOpen || pipWindow || document.pictureInPictureElement) {
      await close();
    } else {
      await open();
    }
  }, [isOpen, pipWindow, close, open]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLeave = () => {
      if (!pipWindow) setIsOpen(false);
    };
    video.addEventListener('leavepictureinpicture', onLeave);
    return () => video.removeEventListener('leavepictureinpicture', onLeave);
  }, [pipWindow]);

  const supported = docPipSupported || videoPipSupported;

  return {
    videoRef,
    canvasRef,
    isOpen,
    supported,
    open,
    close,
    toggle,
    pipWindow,
  };
}

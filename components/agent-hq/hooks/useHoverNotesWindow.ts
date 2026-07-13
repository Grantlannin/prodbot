'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_HOVER_NOTES_SIZE } from '../appleNotesUtils';

type DocPip = {
  requestWindow: (options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }) => Promise<Window>;
};

function injectPipStyles(doc: Document) {
  if (doc.getElementById('hover-notes-styles')) return;
  const style = doc.createElement('style');
  style.id = 'hover-notes-styles';
  style.textContent = `
    html, body { margin: 0; padding: 0; overflow: hidden; background: #fff; height: 100%; }
    * { box-sizing: border-box; }
  `;
  doc.head.appendChild(style);
}

export function useHoverNotesWindow(initialSize = DEFAULT_HOVER_NOTES_SIZE) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'documentPictureInPicture' in window);
  }, []);

  const close = useCallback(async () => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
    setIsOpen(false);
  }, [pipWindow]);

  const open = useCallback(async () => {
    const api = (window as Window & { documentPictureInPicture?: DocPip }).documentPictureInPicture;
    if (!api) return false;

    if (pipWindow && !pipWindow.closed) {
      pipWindow.focus();
      setIsOpen(true);
      return true;
    }

    const w = await api.requestWindow({
      width: initialSize.w,
      height: initialSize.h,
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
  }, [initialSize.h, initialSize.w, pipWindow]);

  const toggle = useCallback(async () => {
    if (isOpen || pipWindow) {
      await close();
    } else {
      await open();
    }
  }, [isOpen, pipWindow, close, open]);

  return {
    pipWindow,
    isOpen,
    supported,
    open,
    close,
    toggle,
  };
}

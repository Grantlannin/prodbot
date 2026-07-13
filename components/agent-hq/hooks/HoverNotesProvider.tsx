'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import HoverNotesContent from '../HoverNotesContent';
import { useHoverNotesWindow } from './useHoverNotesWindow';

interface HoverNotesContextValue {
  isOpen: boolean;
  supported: boolean;
  open: () => Promise<boolean>;
  close: () => Promise<void>;
  toggle: () => Promise<void>;
}

const HoverNotesContext = createContext<HoverNotesContextValue | null>(null);

export function HoverNotesProvider({ children }: { children: ReactNode }) {
  const { pipWindow, isOpen, supported, open, close, toggle } = useHoverNotesWindow();

  const value = useMemo(
    () => ({
      isOpen,
      supported,
      open,
      close,
      toggle,
    }),
    [isOpen, supported, open, close, toggle]
  );

  const pipPortal =
    pipWindow && typeof document !== 'undefined'
      ? createPortal(
          <HoverNotesContent pipWindow={pipWindow} />,
          pipWindow.document.body
        )
      : null;

  return (
    <HoverNotesContext.Provider value={value}>
      {children}
      {pipPortal}
    </HoverNotesContext.Provider>
  );
}

export function useHoverNotes(): HoverNotesContextValue {
  const ctx = useContext(HoverNotesContext);
  if (!ctx) throw new Error('useHoverNotes must be used within HoverNotesProvider');
  return ctx;
}

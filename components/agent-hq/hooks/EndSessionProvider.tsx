'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import EndWorkSessionConfirmModal from '../EndWorkSessionConfirmModal';

interface EndSessionContextValue {
  requestEndSession: () => void;
}

const EndSessionContext = createContext<EndSessionContextValue | null>(null);

export function EndSessionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const requestEndSession = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <EndSessionContext.Provider value={{ requestEndSession }}>
      {children}
      <EndWorkSessionConfirmModal open={open} onClose={handleClose} />
    </EndSessionContext.Provider>
  );
}

export function useEndSession(): EndSessionContextValue {
  const ctx = useContext(EndSessionContext);
  if (!ctx) {
    throw new Error('useEndSession must be used within EndSessionProvider');
  }
  return ctx;
}

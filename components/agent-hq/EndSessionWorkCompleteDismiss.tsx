'use client';

import { useEffect } from 'react';
import { useEndSession } from './hooks/EndSessionProvider';
import { useStuckHelp } from './hooks/StuckHelpProvider';

/** Close the end-session modal when the stuck-help keep-going popup takes over. */
export default function EndSessionWorkCompleteDismiss() {
  const { workCompleteOpen } = useStuckHelp();
  const { dismissEndSession } = useEndSession();

  useEffect(() => {
    if (workCompleteOpen) dismissEndSession();
  }, [workCompleteOpen, dismissEndSession]);

  return null;
}

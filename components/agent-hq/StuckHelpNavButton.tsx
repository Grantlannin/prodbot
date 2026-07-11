'use client';

import type { CSSProperties } from 'react';
import { useStuckHelp } from './hooks/StuckHelpProvider';
import { STUCK_HELP_NAV_BUTTON } from './stuckHelp/flows';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function StuckHelpNavButton() {
  const { openStuckHelp } = useStuckHelp();

  return (
    <button type="button" onClick={openStuckHelp} style={styles.btn}>
      {STUCK_HELP_NAV_BUTTON}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  btn: {
    border: '1px solid #e2e8f0',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: font,
    background: '#f8fafc',
    color: '#0f172a',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};

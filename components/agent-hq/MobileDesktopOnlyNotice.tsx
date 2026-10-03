'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useIsPhoneBrowser } from './hooks/useMobileAppMode';

const DISMISS_KEY = 'agentHQ_mobileDesktopNoticeDismissed';
const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Soft notice on phones — full desktop UI still loads underneath. */
export default function MobileDesktopOnlyNotice() {
  const isPhone = useIsPhoneBrowser();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isPhone) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, [isPhone]);

  if (!isPhone || dismissed) return null;

  return (
    <div style={styles.wrap} role="status">
      <p style={styles.text}>
        NOTE: This is a desktop-only app (very specific usecase) and we&apos;ve detected mobile. Daywinner
        isn&apos;t made for phones — nothing will work on mobile. The point is to get off your phone, not
        use more of it.
      </p>
      <button
        type="button"
        style={styles.btn}
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, '1');
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
      >
        Continue anyway
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    margin: 0,
    padding: '12px 14px',
    background: '#fffbeb',
    borderBottom: '1px solid #fde68a',
    fontFamily: font,
    flexShrink: 0,
  },
  text: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.45,
    color: '#92400e',
  },
  btn: {
    marginTop: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    padding: '8px 12px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: 280,
  },
};

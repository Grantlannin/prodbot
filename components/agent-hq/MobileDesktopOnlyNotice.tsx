'use client';

import type { CSSProperties } from 'react';

const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Full-screen mobile block — no app chrome underneath. */
export default function MobileDesktopOnlyNotice() {
  return (
    <div style={styles.screen} role="alert">
      <p style={styles.text}>
        NOTE: This is a desktop-only app (very specific usecase) and we&apos;ve detected mobile. Daywinner
        isn&apos;t made for phones — nothing will work on mobile. The point is to get off your phone, not
        use more of it.
      </p>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  screen: {
    minHeight: '100dvh',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#fffbeb',
    fontFamily: font,
  },
  text: {
    margin: 0,
    maxWidth: 420,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.5,
    color: '#92400e',
    textAlign: 'center',
  },
};
